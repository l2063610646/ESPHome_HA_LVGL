import { BOARD_CONFIGS } from "./constants.js";
import { renderCombinedYaml } from "./esphome.js";
import {
  pointerToCanvas,
  renderCanvas,
  renderEntityList,
  renderInspector,
  setActivePaletteSwatch,
  syncCanvasUi,
  updateCanvasAppearance,
  updateThermoIconInspectorPreview,
} from "./preview.js";
import {
  clamp,
  clampNumber,
  createEntityDraft,
  createInitialState,
  defaultTitleForEntity,
  generateSpecYaml,
  minHeightForType,
  minWidthForType,
  normalizeEntities,
  normalizeEntity,
  normalizeIconSource,
  normalizeStyle,
  normalizeType,
  normalizeYamlColor,
  parseSpecYaml,
  readPendingNumber,
  updateCanvasDimensions,
  yamlColorToHtml,
  htmlColorToYaml,
  getEntityCapability,
  getDeviceNameValidation,
} from "./spec.js";

const STORAGE_KEY_PREFIX = "esphome-ui-builder-state-v1";
const state = createInitialState();

const elements = {
  canvas: document.getElementById("canvas"),
  entityList: document.getElementById("entity-list"),
  yamlIo: document.getElementById("yaml-io"),
  statusNode: document.getElementById("status"),
  emptyState: document.getElementById("empty-state"),
  inspectorForm: document.getElementById("inspector-form"),
  addEntityBtn: document.getElementById("add-entity-btn"),
  loadYamlBtn: document.getElementById("load-yaml-btn"),
  copyYamlBtn: document.getElementById("copy-yaml-btn"),
  downloadYamlBtn: document.getElementById("download-yaml-btn"),
  buildFinalBtn: document.getElementById("build-final-btn"),
  downloadFinalBtn: document.getElementById("download-final-btn"),
  copyFinalBtn: document.getElementById("copy-final-btn"),
  finalYamlIo: document.getElementById("final-yaml-io"),
  buildStatusNode: document.getElementById("build-status"),
  duplicateBtn: document.getElementById("duplicate-btn"),
  deleteBtn: document.getElementById("delete-btn"),
  template: document.getElementById("entity-item-template"),
  boardSelect: document.getElementById("board-select"),
  rotationSelect: document.getElementById("rotation-select"),
  screenBgColorInput: document.getElementById("screen-bg-color"),
  screenPalette: document.getElementById("screen-palette"),
  deviceNameInput: document.getElementById("device-name"),
  deviceNameHelp: document.getElementById("device-name-help"),
  friendlyNameInput: document.getElementById("friendly-name"),
  wifiSsidInput: document.getElementById("wifi-ssid"),
  wifiPasswordInput: document.getElementById("wifi-password"),
  canvasResTitle: document.getElementById("canvas-res-title"),
  fieldType: document.getElementById("field-type"),
  fieldEntityIdLabel: document.getElementById("field-entityid-label"),
  fieldEntityId: document.getElementById("field-entityid"),
  fieldEntityId2Label: document.getElementById("field-entityid-2-label"),
  fieldEntityId2: document.getElementById("field-entityid-2"),
  fieldTitle: document.getElementById("field-title"),
  fieldStyle: document.getElementById("field-style"),
  fieldX: document.getElementById("field-x"),
  fieldY: document.getElementById("field-y"),
  fieldWidth: document.getElementById("field-width"),
  fieldHeight: document.getElementById("field-height"),
  dualFields: document.getElementById("dual-fields"),
  switchStyleFields: document.getElementById("switch-style-fields"),
  thermoIconFields: document.getElementById("thermo-icon-fields"),
  fieldTempIcon: document.getElementById("field-temp-icon"),
  fieldHumIcon: document.getElementById("field-hum-icon"),
  tempIconPreviewImg: document.getElementById("temp-icon-preview-img"),
  humIconPreviewImg: document.getElementById("hum-icon-preview-img"),
  tempIconPreviewFallback: document.getElementById("temp-icon-preview-fallback"),
  humIconPreviewFallback: document.getElementById("hum-icon-preview-fallback"),
};

elements.addEntityBtn.addEventListener("click", () => {
  const nextIndex = state.entities.length + 1;
  const nextType = getSelectedEntity()?.type || "switch";
  const entity = normalizeEntity(createEntityDraft(nextType, nextIndex), state.canvasWidth, state.canvasHeight);
  state.entities.push(entity);
  state.selectedId = entity.id;
  syncAll(`Added ${getEntityCapability(nextType).label} widget`);
});

elements.loadYamlBtn.addEventListener("click", () => {
  try {
    const data = parseSpecYaml(elements.yamlIo.value);
    if (data.board && BOARD_CONFIGS[data.board]) {
      state.board = data.board;
      elements.boardSelect.value = data.board;
    }
    state.rotation = data.rotation || 0;
    state.screenBgColor = normalizeYamlColor(data.screen?.bg_color || data.screen_bg_color || state.screenBgColor);
    state.deviceName = String(data.device?.name || data.device_name || state.deviceName);
    state.friendlyName = String(data.device?.friendly_name || data.friendly_name || state.friendlyName).trim();
    state.wifiSsid = String(data.wifi?.ssid || data.wifi_ssid || state.wifiSsid).trim();
    state.wifiPassword = String(data.wifi?.password || data.wifi_password || state.wifiPassword).trim();
    updateCanvasDimensions(state);
    state.entities = normalizeEntities(data.entities || [], state.canvasWidth, state.canvasHeight);
    state.selectedId = state.entities[0]?.id ?? null;
    syncFormControls();
    syncAll("Loaded YAML");
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.copyYamlBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(generateSpecYaml(state));
    setStatus("YAML copied to clipboard");
  } catch (_error) {
    setStatus("Clipboard unavailable. Copy from the text area.", true);
  }
});

elements.downloadYamlBtn.addEventListener("click", () => {
  const blob = new Blob([generateSpecYaml(state)], { type: "text/yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ui_spec_${formatTimestampForFilename()}.yaml`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Downloaded YAML");
});

elements.buildFinalBtn.addEventListener("click", () => {
  buildFinalYaml(true);
});

elements.downloadFinalBtn.addEventListener("click", () => {
  if (!elements.finalYamlIo.value.trim()) {
    const built = buildFinalYaml();
    if (!built) {
      return;
    }
  }
  const blob = new Blob([elements.finalYamlIo.value], { type: "text/yaml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.board}.generated_${formatTimestampForFilename()}.yaml`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Downloaded final ESPHome YAML");
});

elements.copyFinalBtn.addEventListener("click", async () => {
  if (!elements.finalYamlIo.value.trim()) {
    const built = buildFinalYaml();
    if (!built) {
      return;
    }
  }
  try {
    await navigator.clipboard.writeText(elements.finalYamlIo.value);
    setStatus("Final ESPHome YAML copied");
  } catch (_error) {
    setStatus("Clipboard unavailable. Copy from the text area.", true);
  }
});

elements.duplicateBtn.addEventListener("click", () => {
  const entity = getSelectedEntity();
  if (!entity) {
    return;
  }
  const clone = structuredClone(entity);
  clone.id = `id-${Math.random().toString(36).slice(2, 11)}`;
  clone.entityids = clone.entityids.map((entityId, index) =>
    index === 0 ? `${entityId}_copy` : `${entityId}_copy_${index + 1}`
  );
  clone.props.x = clamp(entity.props.x + 18, 0, state.canvasWidth - clone.props.width);
  clone.props.y = clamp(entity.props.y + 18, 0, state.canvasHeight - clone.props.height);
  clone.props.title = `${entity.props.title} Copy`;
  state.entities.push(clone);
  state.selectedId = clone.id;
  syncAll("Duplicated widget");
});

elements.deleteBtn.addEventListener("click", () => {
  if (!state.selectedId) {
    return;
  }
  state.entities = state.entities.filter((entity) => entity.id !== state.selectedId);
  state.selectedId = state.entities[0]?.id ?? null;
  syncAll("Deleted widget");
});

[
  elements.fieldType,
  elements.fieldEntityId,
  elements.fieldEntityId2,
  elements.fieldTitle,
  elements.fieldStyle,
  elements.fieldTempIcon,
  elements.fieldHumIcon,
  elements.fieldX,
  elements.fieldY,
  elements.fieldWidth,
  elements.fieldHeight,
].forEach((input) => {
  input.addEventListener("input", handleInspectorChange);
  input.addEventListener("change", handleInspectorCommit);
});

elements.boardSelect.addEventListener("change", () => {
  const result = setBoard(elements.boardSelect.value);
  syncAll(
    result.restored
      ? `Switched to ${BOARD_CONFIGS[state.board].name} and restored saved config`
      : result.recovered
        ? `Switched to ${BOARD_CONFIGS[state.board].name}; invalid saved config was cleared`
        : `Switched to ${BOARD_CONFIGS[state.board].name}`
  );
});

elements.rotationSelect.addEventListener("change", () => {
  setRotation(parseInt(elements.rotationSelect.value, 10));
  syncAll(`Rotated to ${state.rotation}°`);
});

if (elements.screenBgColorInput) {
  elements.screenBgColorInput.addEventListener("input", () => {
    state.screenBgColor = htmlColorToYaml(elements.screenBgColorInput.value);
    updateCanvasAppearance(state.screenBgColor);
    elements.yamlIo.value = generateSpecYaml(state);
    buildFinalYaml();
    saveStateToCache();
    setActivePaletteSwatch(elements.screenPalette, elements.screenBgColorInput.value);
    setStatus("Background color updated");
  });
}

if (elements.screenPalette) {
  elements.screenPalette.querySelectorAll(".palette-swatch").forEach((button) => {
    button.addEventListener("click", () => {
      const color = button.dataset.color || "#f3efe7";
      if (elements.screenBgColorInput) {
        elements.screenBgColorInput.value = color;
      }
      state.screenBgColor = htmlColorToYaml(color);
      updateCanvasAppearance(state.screenBgColor);
      elements.yamlIo.value = generateSpecYaml(state);
      buildFinalYaml();
      saveStateToCache();
      setActivePaletteSwatch(elements.screenPalette, color);
      setStatus("Background color updated");
    });
  });
}

if (elements.wifiSsidInput) {
  elements.wifiSsidInput.addEventListener("input", () => {
    state.wifiSsid = elements.wifiSsidInput.value.trim();
    elements.yamlIo.value = generateSpecYaml(state);
    buildFinalYaml();
    saveStateToCache();
    setStatus("Wi-Fi SSID updated");
  });
}

if (elements.wifiPasswordInput) {
  elements.wifiPasswordInput.addEventListener("input", () => {
    state.wifiPassword = elements.wifiPasswordInput.value.trim();
    elements.yamlIo.value = generateSpecYaml(state);
    buildFinalYaml();
    saveStateToCache();
    setStatus("Wi-Fi password updated");
  });
}

if (elements.deviceNameInput) {
  elements.deviceNameInput.addEventListener("input", () => {
    state.deviceName = elements.deviceNameInput.value;
    elements.yamlIo.value = generateSpecYaml(state);
    buildFinalYaml();
    saveStateToCache();
    renderDeviceNameHelp();
    setStatus("Device name updated");
  });
}

if (elements.friendlyNameInput) {
  elements.friendlyNameInput.addEventListener("input", () => {
    state.friendlyName = elements.friendlyNameInput.value.trim();
    elements.yamlIo.value = generateSpecYaml(state);
    buildFinalYaml();
    saveStateToCache();
    setStatus("Friendly name updated");
  });
}

elements.canvas.addEventListener("pointermove", (event) => {
  if (!state.drag) {
    return;
  }
  const entity = state.entities.find((item) => item.id === state.drag.id);
  if (!entity) {
    return;
  }

  const position = pointerToCanvas(event, elements.canvas, state);
  if (state.drag.mode === "move") {
    entity.props.x = clamp(Math.round(position.x - state.drag.offsetX), 0, state.canvasWidth - entity.props.width);
    entity.props.y = clamp(Math.round(position.y - state.drag.offsetY), 0, state.canvasHeight - entity.props.height);
    setStatus(`Dragging ${entity.props.title}`);
  } else if (state.drag.mode === "resize") {
    entity.props.width = clamp(
      Math.round(state.drag.startWidth + (position.x - state.drag.startX)),
      minWidthForType(entity.type),
      state.canvasWidth - entity.props.x
    );
    entity.props.height = clamp(
      Math.round(state.drag.startHeight + (position.y - state.drag.startY)),
      minHeightForType(entity.type, entity.props.style),
      state.canvasHeight - entity.props.y
    );
    setStatus(`Resizing ${entity.props.title}`);
  }
  renderApp();
  elements.yamlIo.value = generateSpecYaml(state);
  buildFinalYaml();
});

elements.canvas.addEventListener("pointerup", stopDrag);
elements.canvas.addEventListener("pointerleave", stopDrag);
elements.canvas.addEventListener("pointercancel", stopDrag);

function setBoard(boardKey) {
  if (!BOARD_CONFIGS[boardKey]) {
    return { restored: false, recovered: false };
  }
  if (state.board === boardKey) {
    syncCanvasUi(state, elements.canvasResTitle);
    updateCanvasAppearance(state.screenBgColor);
    return { restored: false, recovered: false };
  }

  saveStateToCache();
  const restoreResult = restoreStateFromCache(boardKey);
  if (!restoreResult.restored && !restoreResult.recovered) {
    resetStateToEmptyDefaults(boardKey);
  }
  syncFormControls();
  return restoreResult;
}

function setRotation(deg) {
  state.rotation = deg;
  updateCanvasDimensions(state);
  syncCanvasUi(state, elements.canvasResTitle);
  updateCanvasAppearance(state.screenBgColor);
}

function stopDrag() {
  if (!state.drag) {
    return;
  }
  const wasMode = state.drag.mode;
  state.drag = null;
  saveStateToCache();
  setStatus(wasMode === "resize" ? "Size updated" : "Position updated");
}

function handleInspectorChange() {
  const entity = getSelectedEntity();
  if (!entity) {
    return;
  }

  const nextType = normalizeType(elements.fieldType.value);
  if (entity.type !== nextType) {
    const draft = normalizeEntity(createEntityDraft(nextType, state.entities.length + 1), state.canvasWidth, state.canvasHeight);
    entity.type = nextType;
    entity.entityids = draft.entityids.map((fallback, index) => entity.entityids[index] || fallback);
    entity.props.width = Math.max(entity.props.width, draft.props.width);
    entity.props.style = normalizeStyle(nextType, draft.props.style);
    entity.props.height = Math.max(entity.props.height, minHeightForType(nextType, entity.props.style));
  }

  entity.props.style = normalizeStyle(entity.type, elements.fieldStyle.value || entity.props.style);

  const trimmedEntityId = elements.fieldEntityId.value.trim();
  if (trimmedEntityId) {
    entity.entityids[0] = trimmedEntityId;
  }
  if (entity.type !== "switch") {
    const trimmedEntityId2 = elements.fieldEntityId2.value.trim();
    if (trimmedEntityId2) {
      entity.entityids[1] = trimmedEntityId2;
    }
  }

  entity.props.title = elements.fieldTitle.value;
  if (entity.type === "thermo_hygrometer") {
    entity.props.temp_icon = normalizeIconSource(elements.fieldTempIcon.value);
    entity.props.hum_icon = normalizeIconSource(elements.fieldHumIcon.value);
  }

  const pendingWidth = readPendingNumber(elements.fieldWidth.value);
  if (pendingWidth !== null) {
    entity.props.width = clamp(pendingWidth, minWidthForType(entity.type), state.canvasWidth);
  }

  const pendingHeight = readPendingNumber(elements.fieldHeight.value);
  if (pendingHeight !== null) {
    entity.props.height = clamp(
      pendingHeight,
      minHeightForType(entity.type, entity.props.style),
      state.canvasHeight
    );
  }

  const maxX = Math.max(0, state.canvasWidth - entity.props.width);
  const maxY = Math.max(0, state.canvasHeight - entity.props.height);
  const pendingX = readPendingNumber(elements.fieldX.value);
  const pendingY = readPendingNumber(elements.fieldY.value);

  if (pendingX !== null) {
    entity.props.x = clamp(pendingX, 0, maxX);
  }
  if (pendingY !== null) {
    entity.props.y = clamp(pendingY, 0, maxY);
  }

  syncFromInspector("Inspector updated");
}

function handleInspectorCommit() {
  const entity = getSelectedEntity();
  if (!entity) {
    return;
  }

  entity.type = normalizeType(elements.fieldType.value);
  const draft = normalizeEntity(createEntityDraft(entity.type, state.entities.length + 1), state.canvasWidth, state.canvasHeight);
  entity.entityids = draft.entityids.map((fallback, index) => {
    const inputValue = index === 0 ? elements.fieldEntityId.value.trim() : elements.fieldEntityId2.value.trim();
    return inputValue || entity.entityids[index] || fallback;
  });
  entity.props.style = normalizeStyle(entity.type, elements.fieldStyle.value || entity.props.style);
  entity.props.title = elements.fieldTitle.value.trim() || defaultTitleForEntity(entity);
  if (entity.type === "thermo_hygrometer") {
    entity.props.temp_icon = normalizeIconSource(elements.fieldTempIcon.value);
    entity.props.hum_icon = normalizeIconSource(elements.fieldHumIcon.value);
  }
  entity.props.width = clampNumber(
    elements.fieldWidth.value,
    minWidthForType(entity.type, entity.props.style),
    state.canvasWidth
  );
  entity.props.height = clampNumber(
    elements.fieldHeight.value,
    minHeightForType(entity.type, entity.props.style),
    state.canvasHeight
  );
  entity.props.x = clamp(clampNumber(elements.fieldX.value, 0, state.canvasWidth), 0, state.canvasWidth - entity.props.width);
  entity.props.y = clamp(clampNumber(elements.fieldY.value, 0, state.canvasHeight), 0, state.canvasHeight - entity.props.height);

  syncAll("Inspector updated");
}

function syncAll(message = "Ready") {
  renderApp();
  elements.yamlIo.value = generateSpecYaml(state);
  buildFinalYaml();
  saveStateToCache();
  setStatus(message);
}

function syncFromInspector(message = "Ready") {
  renderApp();
  elements.yamlIo.value = generateSpecYaml(state);
  buildFinalYaml();
  saveStateToCache();
  setStatus(message);
}

function renderApp() {
  renderCanvas(state, elements, {
    onSelect(entityId, message) {
      state.selectedId = entityId;
      syncAll(message);
    },
    onResizeStart(event, entity, resizeHandle) {
      event.stopPropagation();
      event.preventDefault();
      state.selectedId = entity.id;
      const position = pointerToCanvas(event, elements.canvas, state);
      state.drag = {
        id: entity.id,
        mode: "resize",
        startX: position.x,
        startY: position.y,
        startWidth: entity.props.width,
        startHeight: entity.props.height,
      };
      resizeHandle.setPointerCapture(event.pointerId);
      renderApp();
      elements.yamlIo.value = generateSpecYaml(state);
      buildFinalYaml();
      setStatus("Resizing widget");
    },
    onMoveStart(event, entity, widget) {
      if (event.target.classList.contains("resize-handle")) {
        return;
      }
      state.selectedId = entity.id;
      const rect = elements.canvas.getBoundingClientRect();
      const scaleX = state.canvasWidth / rect.width;
      const scaleY = state.canvasHeight / rect.height;
      state.drag = {
        id: entity.id,
        mode: "move",
        offsetX: (event.clientX - rect.left) * scaleX - entity.props.x,
        offsetY: (event.clientY - rect.top) * scaleY - entity.props.y,
      };
      widget.setPointerCapture(event.pointerId);
      syncAll("Dragging widget");
    },
  });

  renderEntityList(state, elements.entityList, elements.template, (entityId, message) => {
    state.selectedId = entityId;
    syncAll(message);
  });

  renderInspector(getSelectedEntity(), elements);
}

function getSelectedEntity() {
  return state.entities.find((entity) => entity.id === state.selectedId) || null;
}

function setStatus(message, isError = false) {
  elements.statusNode.textContent = message;
  elements.statusNode.style.color = isError ? "#b9412e" : "";
}

function setBuildStatus(message, isError = false) {
  elements.buildStatusNode.textContent = message;
  elements.buildStatusNode.style.color = isError ? "#b9412e" : "";
}

function buildFinalYaml(showManualStatus = false) {
  try {
    elements.finalYamlIo.value = renderCombinedYaml(state);
    setBuildStatus(showManualStatus ? "Final ESPHome YAML generated." : "Auto-generated from current editor state.");
    if (showManualStatus) {
      setStatus("Final ESPHome YAML generated");
    }
    return true;
  } catch (error) {
    elements.finalYamlIo.value = "";
    setBuildStatus(error.message || "Failed to generate final YAML", true);
    if (showManualStatus) {
      setStatus("Build failed", true);
    }
    return false;
  }
}

function syncFormControls() {
  elements.boardSelect.value = state.board;
  elements.rotationSelect.value = state.rotation.toString();
  elements.screenBgColorInput.value = yamlColorToHtml(state.screenBgColor);
  elements.deviceNameInput.value = state.deviceName;
  elements.friendlyNameInput.value = state.friendlyName;
  elements.wifiSsidInput.value = state.wifiSsid;
  elements.wifiPasswordInput.value = state.wifiPassword;
  syncCanvasUi(state, elements.canvasResTitle);
  updateCanvasAppearance(state.screenBgColor);
  setActivePaletteSwatch(elements.screenPalette, elements.screenBgColorInput.value);
  renderDeviceNameHelp();
  updateThermoIconInspectorPreview(elements);
}

function renderDeviceNameHelp() {
  if (!elements.deviceNameInput || !elements.deviceNameHelp) {
    return;
  }

  const validation = getDeviceNameValidation(elements.deviceNameInput.value);
  elements.deviceNameHelp.textContent = validation.message;
  elements.deviceNameHelp.classList.toggle("error", !validation.isValid);
}

function formatTimestampForFilename() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "_",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function createStateSnapshot() {
  return {
    board: state.board,
    rotation: state.rotation,
    screenBgColor: state.screenBgColor,
    deviceName: state.deviceName,
    friendlyName: state.friendlyName,
    wifiSsid: state.wifiSsid,
    wifiPassword: state.wifiPassword,
    entities: state.entities.map((entity) => ({
      type: entity.type,
      entityids: [...entity.entityids],
      props: { ...entity.props },
    })),
  };
}

function applyStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Invalid saved state");
  }

  state.board = BOARD_CONFIGS[snapshot.board] ? snapshot.board : "nextion_35";
  state.rotation = Number(snapshot.rotation) || 0;
  state.screenBgColor = normalizeYamlColor(snapshot.screenBgColor || "0xF3EFE7");
  state.deviceName = String(snapshot.deviceName ?? "");
  state.friendlyName = String(snapshot.friendlyName ?? "").trim();
  state.wifiSsid = String(snapshot.wifiSsid ?? "").trim();
  state.wifiPassword = String(snapshot.wifiPassword ?? "").trim();
  updateCanvasDimensions(state);
  state.entities = normalizeEntities(snapshot.entities || [], state.canvasWidth, state.canvasHeight);
  state.selectedId = state.entities[0]?.id ?? null;
}

function resetStateToEmptyDefaults(boardKey = "nextion_35") {
  const fresh = createInitialState();
  state.board = BOARD_CONFIGS[boardKey] ? boardKey : fresh.board;
  state.rotation = fresh.rotation;
  state.screenBgColor = fresh.screenBgColor;
  state.deviceName = "";
  state.friendlyName = "";
  state.wifiSsid = "";
  state.wifiPassword = "";
  state.entities = [];
  state.selectedId = null;
  updateCanvasDimensions(state);
}

function saveStateToCache() {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(getStorageKey(state.board), JSON.stringify(createStateSnapshot()));
  } catch (_error) {
  }
}

function restoreStateFromCache(boardKey = state.board) {
  if (typeof localStorage === "undefined") {
    return { restored: false, recovered: false };
  }

  const raw = localStorage.getItem(getStorageKey(boardKey));
  if (!raw) {
    return { restored: false, recovered: false };
  }

  try {
    applyStateSnapshot(JSON.parse(raw));
    state.board = boardKey;
    updateCanvasDimensions(state);
    saveStateToCache();
    return { restored: true, recovered: false };
  } catch (_error) {
    localStorage.removeItem(getStorageKey(boardKey));
    resetStateToEmptyDefaults(boardKey);
    return { restored: false, recovered: true };
  }
}

function getStorageKey(boardKey) {
  return `${STORAGE_KEY_PREFIX}:${boardKey}`;
}

const restoreResult = restoreStateFromCache();
syncFormControls();
syncAll(
  restoreResult.restored
    ? "Restored saved config"
    : restoreResult.recovered
      ? "Saved config was invalid and has been cleared"
      : "Ready"
);
