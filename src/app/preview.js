import {
  BOARD_CONFIGS,
  DEFAULT_BUTTON_BG_COLOR,
  DEFAULT_LABEL_PAD_LEFT,
  DEFAULT_SWITCH_PAD_RIGHT,
  DUAL_BUTTON_HEIGHT,
  DUAL_COLUMNS_BUTTON_HEIGHT,
  DUAL_GROUP_HEIGHT,
  DUAL_GROUP_WIDTH,
  DUAL_SWITCH_STYLE_COLUMNS,
  SWITCH_BUTTON_HEIGHT,
  SWITCH_STYLE_BUTTON,
  SWITCH_HEIGHT,
  SWITCH_WIDTH,
  THERMO_ICON_PATHS,
  THERMO_VALUE_BOX_HEIGHT,
} from "./constants.js";
import {
  getEntityCapability,
  normalizeIconSource,
  normalizeStyle,
  shouldRenderWidgetTitle,
  usesTopAlignedTitle,
  yamlColorToCss,
} from "./spec.js";

export function updateCanvasAppearance(screenBgColor) {
  document.documentElement.style.setProperty("--screen-bg", yamlColorToCss(screenBgColor));
}

export function syncCanvasUi(state, canvasResTitle) {
  document.documentElement.style.setProperty("--canvas-width", `${state.canvasWidth}px`);
  document.documentElement.style.setProperty("--canvas-height", `${state.canvasHeight}px`);
  canvasResTitle.textContent = `${state.canvasWidth} x ${state.canvasHeight} Canvas (${state.rotation}°)`;
}

export function setActivePaletteSwatch(screenPalette, htmlColor) {
  if (!screenPalette) {
    return;
  }
  screenPalette.querySelectorAll(".palette-swatch").forEach((button) => {
    button.classList.toggle(
      "active",
      (button.dataset.color || "").toLowerCase() === String(htmlColor).toLowerCase()
    );
  });
}

export function pointerToCanvas(event, canvas, state) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = state.canvasWidth / rect.width;
  const scaleY = state.canvasHeight / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

export function renderCanvas(state, elements, callbacks) {
  const { canvas } = elements;
  const { onSelect, onResizeStart, onMoveStart } = callbacks;
  canvas.replaceChildren();

  state.entities.forEach((entity) => {
    const widget = document.createElement("button");
    widget.type = "button";
    widget.className = `canvas-widget${entity.id === state.selectedId ? " active" : ""}`;
    widget.style.left = `${entity.props.x}px`;
    widget.style.top = `${entity.props.y}px`;
    widget.style.width = `${entity.props.width}px`;
    widget.style.height = `${entity.props.height}px`;
    widget.dataset.id = entity.id;

    if (shouldRenderWidgetTitle(entity)) {
      const title = document.createElement("p");
      title.className = `widget-title${usesTopAlignedTitle(entity) ? " button-style" : ""}`;
      title.textContent = entity.props.title;
      title.style.left = `${DEFAULT_LABEL_PAD_LEFT}px`;
      widget.append(title);
    }

    if (entity.type === "switch") {
      widget.append(renderSingleSwitchPreview(entity));
    } else if (entity.type === "dual_switch") {
      widget.append(renderDualSwitchPreview(entity));
    } else {
      widget.append(renderThermoHygrometerPreview(entity));
    }

    const bounds = document.createElement("span");
    bounds.className = "widget-bounds";
    bounds.textContent = `${entity.props.width}x${entity.props.height}`;
    widget.append(bounds);

    if (entity.id === state.selectedId) {
      const resizeHandle = document.createElement("span");
      resizeHandle.className = "resize-handle";
      resizeHandle.title = "Drag to resize";
      resizeHandle.addEventListener("pointerdown", (event) => onResizeStart(event, entity, resizeHandle));
      widget.append(resizeHandle);
    }

    widget.addEventListener("click", () => onSelect(entity.id, "Widget selected"));
    widget.addEventListener("pointerdown", (event) => onMoveStart(event, entity, widget));
    canvas.append(widget);
  });
}

export function renderEntityList(state, entityList, template, onSelect) {
  entityList.replaceChildren();
  state.entities.forEach((entity, index) => {
    const item = template.content.firstElementChild.cloneNode(true);
    item.classList.toggle("active", entity.id === state.selectedId);
    item.innerHTML = `<strong>${index + 1}. ${entity.props.title}</strong><span>${entity.type} · ${entity.entityids.join(" / ")}</span>`;
    item.addEventListener("click", () => onSelect(entity.id, "Entity selected"));
    entityList.append(item);
  });
}

export function renderInspector(entity, elements) {
  const {
    emptyState,
    inspectorForm,
    dualFields,
    switchStyleFields,
    thermoIconFields,
    fieldType,
    fieldEntityIdLabel,
    fieldEntityId,
    fieldEntityId2Label,
    fieldEntityId2,
    fieldTitle,
    fieldStyle,
    fieldX,
    fieldY,
    fieldWidth,
    fieldHeight,
    fieldTempIcon,
    fieldHumIcon,
  } = elements;

  const hasEntity = Boolean(entity);
  emptyState.classList.toggle("hidden", hasEntity);
  inspectorForm.classList.toggle("hidden", !hasEntity);
  if (!entity) {
    return;
  }

  const capability = getEntityCapability(entity.type);
  const hasSecondEntity = capability.entityFields.length > 1;
  dualFields.classList.toggle("hidden", !hasSecondEntity);
  switchStyleFields.classList.toggle("hidden", false);
  thermoIconFields.classList.toggle("hidden", entity.type !== "thermo_hygrometer");
  rebuildStyleOptions(fieldStyle, entity.type);
  fieldType.value = entity.type;
  fieldEntityIdLabel.textContent = capability.entityFields[0]?.label || "Entity ID";
  fieldEntityId2Label.textContent = capability.entityFields[1]?.label || "Entity ID 2";
  fieldEntityId.value = entity.entityids[0] || "";
  fieldEntityId2.value = entity.entityids[1] || "";
  fieldTitle.value = entity.props.title;
  fieldStyle.value = normalizeStyle(entity.type, entity.props.style);
  fieldX.value = entity.props.x;
  fieldY.value = entity.props.y;
  fieldWidth.value = entity.props.width;
  fieldHeight.value = entity.props.height;
  fieldTempIcon.value = entity.props.temp_icon ?? "";
  fieldHumIcon.value = entity.props.hum_icon ?? "";
  updateThermoIconInspectorPreview(elements);
}

export function updateThermoIconInspectorPreview(elements) {
  updateSingleIconPreview(
    elements.tempIconPreviewImg,
    elements.tempIconPreviewFallback,
    elements.fieldTempIcon.value,
    THERMO_ICON_PATHS.temp
  );
  updateSingleIconPreview(
    elements.humIconPreviewImg,
    elements.humIconPreviewFallback,
    elements.fieldHumIcon.value,
    THERMO_ICON_PATHS.hum
  );
}

function renderSingleSwitchPreview(entity) {
  if (entity.props.style === SWITCH_STYLE_BUTTON) {
    return renderSingleButtonSwitchPreview(entity);
  }
  const switchShell = document.createElement("div");
  switchShell.className = "widget-switch";
  switchShell.style.right = `${DEFAULT_SWITCH_PAD_RIGHT}px`;
  switchShell.style.width = `${SWITCH_WIDTH}px`;
  switchShell.style.height = `${SWITCH_HEIGHT}px`;
  return switchShell;
}

function renderSingleButtonSwitchPreview(entity) {
  const button = document.createElement("div");
  button.className = "single-switch-button";
  button.style.left = `${DEFAULT_LABEL_PAD_LEFT}px`;
  button.style.bottom = "12px";
  button.style.width = `${Math.max(entity.props.width - 32, 96)}px`;
  button.style.height = `${SWITCH_BUTTON_HEIGHT}px`;
  button.style.background = DEFAULT_BUTTON_BG_COLOR;

  const label = document.createElement("span");
  label.className = "single-switch-button-label";
  label.textContent = "Toggle";
  button.append(label);
  return button;
}

function renderDualSwitchPreview(entity) {
  if (entity.props.style === DUAL_SWITCH_STYLE_COLUMNS) {
    return renderDualSwitchColumnsPreview();
  }
  const group = document.createElement("div");
  group.className = "dual-switch-group";
  group.style.right = `${DEFAULT_SWITCH_PAD_RIGHT}px`;
  group.style.width = `${DUAL_GROUP_WIDTH}px`;
  group.style.height = `${DUAL_GROUP_HEIGHT}px`;

  for (let index = 0; index < 2; index += 1) {
    const button = document.createElement("div");
    button.className = "dual-switch-button";
    button.style.height = `${DUAL_BUTTON_HEIGHT}px`;
    button.style.background = DEFAULT_BUTTON_BG_COLOR;

    const label = document.createElement("span");
    label.className = "dual-button-label";
    label.textContent = `CH${index + 1}`;
    button.append(label);
    group.append(button);
  }

  return group;
}

function renderDualSwitchColumnsPreview() {
  const group = document.createElement("div");
  group.className = "dual-columns-group";

  for (let index = 0; index < 2; index += 1) {
    const button = document.createElement("div");
    button.className = "dual-columns-button";
    button.style.height = `${DUAL_COLUMNS_BUTTON_HEIGHT}px`;
    button.style.background = DEFAULT_BUTTON_BG_COLOR;

    const label = document.createElement("span");
    label.className = "dual-button-label";
    label.textContent = `CH${index + 1}`;
    button.append(label);
    group.append(button);
  }

  return group;
}

function renderThermoHygrometerPreview(entity) {
  const group = document.createElement("div");
  group.className = "thermo-group";

  [
    { caption: "Temp", suffix: "°C", icon: entity.props.temp_icon, fallback: THERMO_ICON_PATHS.temp },
    { caption: "Humi", suffix: "%", icon: entity.props.hum_icon, fallback: THERMO_ICON_PATHS.hum },
  ].forEach((item) => {
    const valueBox = document.createElement("div");
    valueBox.className = "thermo-value-box";
    valueBox.style.height = `${THERMO_VALUE_BOX_HEIGHT}px`;

    const icon = document.createElement("img");
    icon.className = "thermo-icon";
    icon.src = resolvePreviewImageSource(item.icon);
    icon.alt = item.caption;
    icon.addEventListener("error", () => {
      if (icon.dataset.fallbackApplied === "true") {
        return;
      }
      icon.dataset.fallbackApplied = "true";
      icon.src = resolvePreviewImageSource(item.fallback);
    });

    const value = document.createElement("span");
    value.className = "thermo-value";
    value.textContent = `${item.caption}: --${item.suffix}`;

    valueBox.append(icon, value);
    group.append(valueBox);
  });

  return group;
}

function rebuildStyleOptions(fieldStyle, type) {
  const options = getEntityCapability(type).styleOptions;
  fieldStyle.replaceChildren();
  options.forEach((option) => {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    fieldStyle.append(node);
  });
}

function resolvePreviewImageSource(source) {
  const value = normalizeIconSource(source);
  if (!value) {
    return "";
  }
  if (/^mdi:[a-z0-9-]+$/i.test(value)) {
    return `https://api.iconify.design/${encodeURIComponent(value)}.svg`;
  }
  if (/^https?:\/\//i.test(value) || /^file:\/\//i.test(value)) {
    return value;
  }
  if (value.startsWith("/")) {
    return `file://${value}`;
  }
  return value;
}

function updateSingleIconPreview(imgNode, fallbackNode, value, fallback) {
  const resolved = resolvePreviewImageSource(value);
  if (!resolved) {
    imgNode.removeAttribute("src");
    imgNode.classList.add("hidden");
    fallbackNode.classList.remove("hidden");
    return;
  }

  imgNode.dataset.fallbackApplied = "false";
  imgNode.classList.remove("hidden");
  fallbackNode.classList.add("hidden");
  imgNode.onerror = () => {
    if (imgNode.dataset.fallbackApplied === "true") {
      imgNode.classList.add("hidden");
      fallbackNode.classList.remove("hidden");
      return;
    }
    imgNode.dataset.fallbackApplied = "true";
    const fallbackSrc = resolvePreviewImageSource(fallback);
    if (fallbackSrc === resolved) {
      imgNode.classList.add("hidden");
      fallbackNode.classList.remove("hidden");
      return;
    }
    imgNode.src = fallbackSrc;
  };
  imgNode.onload = () => {
    fallbackNode.classList.add("hidden");
    imgNode.classList.remove("hidden");
  };
  imgNode.src = resolved;
}
