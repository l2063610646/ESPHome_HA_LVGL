import {
  BOARD_CONFIGS,
  DEFAULT_BUTTON_BG_COLOR,
  DEFAULT_LABEL_PAD_LEFT,
  DEFAULT_SWITCH_PAD_RIGHT,
  getHmiScreenBrightnessLayout,
  getMultiSwitchLayout,
  getMultiSwitchChannelTitle,
  getLightTileLayout,
  isMultiSwitchChannelEnabled,
  LIGHT_ICON_PATHS,
  LIGHT_TILE_ICON_POSITION_DEFAULT,
  LIGHT_TILE_ICON_POSITION_OPTIONS,
  LIGHT_STYLE_ICON,
  LIGHT_STYLE_TILE,
  LIGHT_STYLE_SLIDER,
  LIGHT_TILE_ICON_BUBBLE_OPACITY,
  LIGHT_DEFAULT_PREVIEW_HUE,
  MULTI_SWITCH_STYLE_TILE,
  MULTI_SWITCH_STYLE_LIST,
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
  supportsHeightResize,
  usesTopAlignedTitle,
  yamlColorToCss,
  yamlColorToHtml,
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
    } else if (entity.type === "multi_switch") {
      widget.append(entity.props.style === MULTI_SWITCH_STYLE_LIST ? renderMultiSwitchListPreview(entity) : renderMultiSwitchPreview(entity));
    } else if (entity.type === "thermo_hygrometer") {
      widget.append(renderThermoHygrometerPreview(entity));
    } else if (entity.type === "cover") {
      widget.append(renderCoverPreview(entity));
    } else if (entity.type === "hmi_screen_brightness") {
      widget.append(renderHmiScreenBrightnessPreview(entity));
    } else {
      widget.append(renderLightPreview(entity));
    }

    const bounds = document.createElement("span");
    bounds.className = "widget-bounds";
    bounds.textContent = `${entity.props.width}x${entity.props.height}`;
    widget.append(bounds);

    if (entity.id === state.selectedId) {
      const resizeHandle = document.createElement("span");
      resizeHandle.className = `resize-handle${supportsHeightResize(entity.type, entity.props.style) ? "" : " width-only"}`;
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
    const idSummary = entity.entityids.length ? entity.entityids.join(" / ") : "local device control";
    item.innerHTML = `<strong>${index + 1}. ${entity.props.title}</strong><span>${entity.type} · ${idSummary}</span>`;
    item.addEventListener("click", () => onSelect(entity.id, "Entity selected"));
    entityList.append(item);
  });
}

export function renderScreenTabs(screens, currentScreenId, swipeDirection, container, directionNode, onSelect) {
  if (container) {
    container.replaceChildren();
    screens.forEach((screen, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `screen-tab${screen.id === currentScreenId ? " active" : ""}`;
      button.textContent = screen.name || `Screen ${index + 1}`;
      button.addEventListener("click", () => onSelect(screen.id));
      container.append(button);
    });
  }

  if (directionNode) {
    directionNode.textContent = `Swipe: ${swipeDirection === "vertical" ? "Vertical" : "Horizontal"}`;
  }
}

export function renderInspector(entity, elements) {
  const {
    emptyState,
    inspectorForm,
    dualFields,
    switchStyleFields,
    multiSwitchFields,
    thermoIconFields,
    hmiBrightnessFields,
    lightIconFields,
    lightTilePositionFields,
    fieldType,
    fieldEntityIdRow,
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
    fieldLightIcon,
    fieldLightTileIconPosition,
    fieldHmiShowHeader,
    fieldHmiSliderColor,
    lightSliderFields,
    fieldColorTemp,
    multiSwitchEnabledInputs,
    multiSwitchEntityInputs,
    multiSwitchTitleInputs,
    fieldActiveBgColor,
  } = elements;

  const hasEntity = Boolean(entity);
  emptyState.classList.toggle("hidden", hasEntity);
  inspectorForm.classList.toggle("hidden", !hasEntity);
  if (!entity) {
    return;
  }

  const capability = getEntityCapability(entity.type);
  const hasSecondEntity = capability.entityFields.length > 1 && entity.type !== "multi_switch";
  fieldEntityIdRow.classList.toggle("hidden", entity.type === "multi_switch" || capability.entityFields.length === 0);
  dualFields.classList.toggle("hidden", !hasSecondEntity);
  const showStyle = capability.styleOptions && capability.styleOptions.length > 0;
  switchStyleFields.classList.toggle("hidden", !showStyle);
  multiSwitchFields.classList.toggle("hidden", entity.type !== "multi_switch");
  thermoIconFields.classList.toggle("hidden", entity.type !== "thermo_hygrometer");
  hmiBrightnessFields.classList.toggle("hidden", entity.type !== "hmi_screen_brightness");
  lightIconFields.classList.toggle("hidden", entity.type !== "light");
  lightTilePositionFields.classList.toggle("hidden", !(entity.type === "light" && (entity.props.style === LIGHT_STYLE_TILE || entity.props.style === LIGHT_STYLE_SLIDER)));
  lightSliderFields.classList.toggle("hidden", !(entity.type === "light" && entity.props.style === LIGHT_STYLE_SLIDER));
  rebuildStyleOptions(fieldStyle, entity.type);
  rebuildLightTilePositionOptions(fieldLightTileIconPosition);
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
  fieldHeight.disabled = !supportsHeightResize(entity.type, entity.props.style);
  fieldTempIcon.value = entity.props.temp_icon ?? "";
  fieldHumIcon.value = entity.props.hum_icon ?? "";
  fieldLightIcon.value = entity.props.icon ?? "";
  fieldLightTileIconPosition.value = entity.props.tile_icon_position ?? LIGHT_TILE_ICON_POSITION_DEFAULT;
  fieldHmiShowHeader.checked = entity.props.show_header !== false;
  fieldHmiSliderColor.value = yamlColorToHtml(entity.props.slider_color || "#FDBB13");
  if (elements.fieldHmiSliderColorHex) {
    elements.fieldHmiSliderColorHex.textContent = fieldHmiSliderColor.value.toUpperCase();
  }
  fieldColorTemp.checked = entity.props.color_temp ?? false;
  elements.fieldHue360.checked = entity.props.hue_360 ?? false;
  multiSwitchEnabledInputs?.forEach((input, index) => {
    input.checked = isMultiSwitchChannelEnabled(entity.props, index);
  });
  if (fieldActiveBgColor) {
    const color = entity.props.active_bg_color || (entity.type === "light" ? "#ef920c" : "#d7e9dd");
    fieldActiveBgColor.value = yamlColorToHtml(color);
    if (elements.fieldActiveBgColorHex) {
      elements.fieldActiveBgColorHex.textContent = fieldActiveBgColor.value.toUpperCase();
    }
  }
  const showActiveColor = entity.type === "multi_switch" || (entity.type === "switch" && entity.props.style === SWITCH_STYLE_BUTTON);
  elements.activeBgColorFields?.classList.toggle("hidden", !showActiveColor);

  multiSwitchEntityInputs?.forEach((input, index) => {
    input.value = entity.entityids[index] || "";
  });
  multiSwitchTitleInputs?.forEach((input, index) => {
    input.value = getMultiSwitchChannelTitle(entity.props, index);
  });
  if (entity.type === "light") {
    elements.fieldLightPreviewCtRow?.classList.toggle("hidden", !entity.props.color_temp);
    elements.fieldLightPreviewHueRow?.classList.toggle("hidden", !entity.props.hue_360);
    if (elements.fieldLightPreviewCt) {
      elements.fieldLightPreviewCt.value = entity.props.preview_color_temp !== undefined ? entity.props.preview_color_temp : 50;
    }
    if (elements.fieldLightPreviewHue) {
      elements.fieldLightPreviewHue.value = entity.props.preview_hue !== undefined ? entity.props.preview_hue : LIGHT_DEFAULT_PREVIEW_HUE;
    }
  }
  updateThermoIconInspectorPreview(elements);
  updateLightIconInspectorPreview(elements);
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

export function updateLightIconInspectorPreview(elements) {
  updateSingleIconPreview(
    elements.lightIconPreviewImg,
    elements.lightIconPreviewFallback,
    elements.fieldLightIcon.value,
    LIGHT_ICON_PATHS.on
  );
}

export function calculateLightSliderColor(factor) {
  // factor is 0 (cool) to 1 (warm)
  // New anchors: Cool (#d5d5e1) to Warm (#ff890e)
  const cool = { r: 213, g: 213, b: 225 };
  const warm = { r: 255, g: 137, b: 14 };
  
  const r = Math.round(cool.r + (warm.r - cool.r) * factor);
  const g = Math.round(cool.g + (warm.g - cool.g) * factor);
  const b = Math.round(cool.b + (warm.b - cool.b) * factor);
  
  return `rgb(${r}, ${g}, ${b})`;
}

export function calculateHueSliderColor(hue) {
  const normalizedHue = ((Number(hue) || 0) % 360 + 360) % 360;
  return `hsl(${normalizedHue}deg 100% 50%)`;
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

  const knob = document.createElement("span");
  knob.className = "widget-switch-knob";
  switchShell.append(knob);
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

function renderMultiSwitchPreview(entity) {
  const group = document.createElement("div");
  group.className = "multi-switch-group";

  const channels = entity.entityids
    .map((entityId, index) => ({ entityId, index }))
    .filter(({ index }) => isMultiSwitchChannelEnabled(entity.props, index));

  const layout = getMultiSwitchLayout(entity.props.width, entity.props.height, channels.length, true);

  if (!channels.length) {
    const empty = document.createElement("div");
    empty.className = "multi-switch-empty";
    empty.textContent = "Enable channels";
    group.append(empty);
    return group;
  }

  channels.forEach((channel, index) => {
    const placement = layout.items[index];
    const button = document.createElement("div");
    button.className = "multi-switch-channel";
    button.style.left = `${placement.x}px`;
    button.style.top = `${placement.y}px`;
    button.style.width = `${placement.width}px`;
    button.style.height = `${placement.height}px`;

    const label = document.createElement("span");
    label.className = "multi-switch-channel-label";
    label.textContent = getMultiSwitchChannelTitle(entity.props, channel.index);
    button.append(label);
    group.append(button);
  });

  return group;
}

function renderMultiSwitchListPreview(entity) {
  const group = document.createElement("div");
  group.className = "multi-switch-list-group";

  const channels = entity.entityids
    .map((entityId, index) => ({ entityId, index }))
    .filter(({ index }) => isMultiSwitchChannelEnabled(entity.props, index));

  if (!channels.length) {
    const empty = document.createElement("div");
    empty.className = "multi-switch-empty";
    empty.textContent = "Enable channels";
    group.append(empty);
    return group;
  }

  channels.forEach((channel, index) => {
    const item = document.createElement("div");
    item.className = "multi-switch-list-item";
    item.style.top = `${index * 44 + 44}px`;
    item.style.left = "16px";
    item.style.width = `${entity.props.width - 32}px`;
    item.style.height = "40px";

    const label = document.createElement("span");
    label.className = "multi-switch-list-label";
    label.textContent = getMultiSwitchChannelTitle(entity.props, channel.index);

    const switchShell = document.createElement("div");
    switchShell.className = "widget-switch";
    switchShell.style.right = "0px";
    switchShell.style.width = `${SWITCH_WIDTH}px`;
    switchShell.style.height = `${SWITCH_HEIGHT}px`;

    const knob = document.createElement("span");
    knob.className = "widget-switch-knob";
    switchShell.append(knob);

    item.append(label, switchShell);
    group.append(item);
  });

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

function renderCoverPreview(entity) {
  const group = document.createElement("div");
  group.className = "cover-widget-group";

  const title = document.createElement("span");
  title.className = "cover-title";
  title.textContent = entity.props.title;

  const current = document.createElement("span");
  current.className = "cover-current";
  current.textContent = "current: 30%";

  const minLabel = document.createElement("span");
  minLabel.className = "cover-range-label cover-range-min";
  minLabel.textContent = "0%";

  const maxLabel = document.createElement("span");
  maxLabel.className = "cover-range-label cover-range-max";
  maxLabel.textContent = "100%";

  const controls = document.createElement("div");
  controls.className = "cover-controls";

  [
    { src: "mdi:arrow-down-circle", alt: "Close", className: "cover-control close" },
    { src: "mdi:pause", alt: "Stop", className: "cover-control stop" },
    { src: "mdi:arrow-up-circle", alt: "Open", className: "cover-control open" },
  ].forEach((item) => {
    const button = document.createElement("span");
    button.className = item.className;

    const icon = document.createElement("img");
    icon.className = "cover-control-icon";
    icon.src = resolvePreviewImageSource(item.src);
    icon.alt = item.alt;
    button.append(icon);

    controls.append(button);
  });

  const slider = document.createElement("div");
  slider.className = "cover-slider";

  const fill = document.createElement("div");
  fill.className = "cover-slider-fill";
  fill.style.width = "30%";

  const thumb = document.createElement("div");
  thumb.className = "cover-slider-thumb";

  fill.append(thumb);
  slider.append(fill);

  title.style.width = `${Math.max(entity.props.width - 24, 60)}px`;
  current.style.width = `${Math.max(entity.props.width - 24, 60)}px`;
  group.append(title, current, minLabel, maxLabel, controls, slider);

  return group;
}

function renderHmiScreenBrightnessPreview(entity) {
  const group = document.createElement("div");
  group.className = `hmi-brightness-group${entity.props.show_header === false ? " no-header" : ""}`;
  const layout = getHmiScreenBrightnessLayout(entity.props.width, entity.props.height, entity.props.show_header !== false);

  if (entity.props.show_header !== false) {
    const header = document.createElement("div");
    header.className = "hmi-brightness-header";
    header.style.left = `${layout.header.x}px`;
    header.style.top = `${layout.header.y}px`;
    header.style.width = `${layout.header.width}px`;
    header.style.height = `${layout.header.height}px`;

    const title = document.createElement("span");
    title.className = "hmi-brightness-title";
    title.textContent = entity.props.title;

    const value = document.createElement("span");
    value.className = "hmi-brightness-value";
    value.textContent = "50%";
    header.append(title, value);
    group.append(header);
  }

  const slider = document.createElement("div");
  slider.className = "hmi-brightness-slider";
  slider.style.backgroundColor = "rgba(36, 50, 58, 0.1)";
  slider.style.left = `${layout.slider.x}px`;
  slider.style.top = `${layout.slider.y}px`;
  slider.style.width = `${layout.slider.width}px`;
  slider.style.height = `${layout.slider.height}px`;

  const fill = document.createElement("div");
  fill.className = "hmi-brightness-slider-fill";
  fill.style.width = "50%";
  fill.style.backgroundColor = yamlColorToCss(entity.props.slider_color || "#FDBB13");

  const thumb = document.createElement("div");
  thumb.className = "hmi-brightness-slider-thumb";

  fill.append(thumb);
  slider.append(fill);
  group.append(slider);
  return group;
}

function renderLightPreview(entity) {
  const isTile = entity.props.style === LIGHT_STYLE_TILE;
  const group = document.createElement("div");
  group.className = `light-widget-group ${isTile ? "tile" : "icon"} off`;

  if (isTile) {
    const layout = getLightTileLayout(entity.props.tile_icon_position);
    const iconBubble = document.createElement("div");
    iconBubble.className = "light-tile-icon-bubble";
    iconBubble.style.backgroundColor = `rgba(255, 255, 255, ${LIGHT_TILE_ICON_BUBBLE_OPACITY / 100})`;
    applyTilePlacement(iconBubble, layout.icon);

    const icon = document.createElement("img");
    icon.className = "light-tile-icon";
    icon.src = resolvePreviewImageSource(entity.props.icon);
    icon.alt = "Light";
    icon.addEventListener("error", () => {
      if (icon.dataset.fallbackApplied === "true") return;
      icon.dataset.fallbackApplied = "true";
      icon.src = resolvePreviewImageSource(LIGHT_ICON_PATHS.on);
    });
    iconBubble.append(icon);

    const titleLabel = document.createElement("span");
    titleLabel.className = "light-tile-title";
    titleLabel.textContent = entity.props.title;
    applyTilePlacement(titleLabel, layout.title);

    const stateLabel = document.createElement("span");
    stateLabel.className = "light-tile-state";
    stateLabel.textContent = "OFF";
    applyTilePlacement(stateLabel, layout.state);

    group.append(iconBubble, titleLabel, stateLabel);
  } else if (entity.props.style === LIGHT_STYLE_SLIDER) {
    group.className = `light-widget-group slider ${entity.props.color_temp ? "has-ct" : ""} ${entity.props.hue_360 ? "has-hue" : ""} off`;

    const topRow = document.createElement("div");
    topRow.className = "light-slider-top-row";
    
    const iconBubble = document.createElement("div");
    iconBubble.className = "light-tile-icon-bubble";
    iconBubble.style.backgroundColor = `rgba(255, 255, 255, ${LIGHT_TILE_ICON_BUBBLE_OPACITY / 100})`;
    iconBubble.style.position = "static";
    
    const icon = document.createElement("img");
    icon.className = "light-tile-icon";
    icon.src = resolvePreviewImageSource(entity.props.icon);
    icon.alt = "Light";
    icon.addEventListener("error", () => {
      if (icon.dataset.fallbackApplied === "true") return;
      icon.dataset.fallbackApplied = "true";
      icon.src = resolvePreviewImageSource(LIGHT_ICON_PATHS.on);
    });
    iconBubble.append(icon);

    const infoBlock = document.createElement("div");
    infoBlock.className = "light-slider-info";
    
    const titleLabel = document.createElement("div");
    titleLabel.className = "light-slider-title";
    titleLabel.textContent = entity.props.title;

    const stateLabel = document.createElement("div");
    stateLabel.className = "light-slider-state";
    stateLabel.textContent = "30%";

    infoBlock.append(titleLabel, stateLabel);
    topRow.append(iconBubble, infoBlock);

    const sliderTrack = document.createElement("div");
    sliderTrack.className = "light-slider-track";
    
    const sliderFill = document.createElement("div");
    sliderFill.className = "light-slider-fill";
    sliderFill.style.width = "30%";

    const ctFactor = entity.props.preview_color_temp !== undefined ? entity.props.preview_color_temp / 100 : 0.5;
    const previewHue = entity.props.preview_hue !== undefined ? entity.props.preview_hue : LIGHT_DEFAULT_PREVIEW_HUE;
    const sliderFillColor = entity.props.hue_360 ? calculateHueSliderColor(previewHue) : calculateLightSliderColor(ctFactor);
    sliderFill.style.backgroundColor = sliderFillColor;

    const sliderKnob = document.createElement("div");
    sliderKnob.className = "light-slider-knob";
    
    sliderFill.append(sliderKnob);
    sliderTrack.append(sliderFill);

    group.append(topRow, sliderTrack);

    if (entity.props.color_temp) {
      const ctTrack = document.createElement("div");
      ctTrack.className = "light-slider-track ct-track";
      const ctFill = document.createElement("div");
      ctFill.className = "light-slider-fill ct-fill";
      ctFill.style.width = "50%";
      const ctKnob = document.createElement("div");
      ctKnob.className = "light-slider-knob";
      ctFill.append(ctKnob);
      ctTrack.append(ctFill);
      group.append(ctTrack);
    }
    if (entity.props.hue_360) {
      const hueTrack = document.createElement("div");
      hueTrack.className = "light-slider-track hue-track";
      const hueFill = document.createElement("div");
      hueFill.className = "light-slider-fill hue-fill";
      hueFill.style.width = `${(previewHue / 360) * 100}%`;
      hueFill.style.backgroundColor = "transparent";
      const hueKnob = document.createElement("div");
      hueKnob.className = "light-slider-knob";
      hueKnob.style.backgroundColor = calculateHueSliderColor(previewHue);
      hueFill.append(hueKnob);
      hueTrack.append(hueFill);
      group.append(hueTrack);
    }
  } else {
    const icon = document.createElement("img");
    icon.className = "light-widget-icon";
    icon.src = resolvePreviewImageSource(entity.props.icon);
    icon.alt = "Light";
    icon.addEventListener("error", () => {
      if (icon.dataset.fallbackApplied === "true") {
        return;
      }
      icon.dataset.fallbackApplied = "true";
      icon.src = resolvePreviewImageSource(LIGHT_ICON_PATHS.on);
    });

    const actionLabel = document.createElement("span");
    actionLabel.className = "light-action-label";
    actionLabel.textContent = "OFF";

    group.append(icon, actionLabel);
  }
  return group;
}

function rebuildLightTilePositionOptions(field) {
  field.replaceChildren();
  LIGHT_TILE_ICON_POSITION_OPTIONS.forEach((option) => {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    field.append(node);
  });
}

function applyTilePlacement(node, placement) {
  node.style.top = placement.top === null ? "" : `${placement.top}px`;
  node.style.right = placement.right === null || placement.right === undefined ? "" : `${placement.right}px`;
  node.style.bottom = placement.bottom === null || placement.bottom === undefined ? "" : `${placement.bottom}px`;
  node.style.left = placement.left === null || placement.left === undefined ? "" : `${placement.left}px`;
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
