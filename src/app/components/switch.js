import {
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_LABEL_PAD_LEFT,
  DEFAULT_SWITCH_PAD_RIGHT,
  DEFAULT_BUTTON_BG_COLOR,
  SWITCH_STYLE_TOGGLE,
  SWITCH_STYLE_BUTTON,
  SWITCH_BUTTON_HEIGHT,
  SWITCH_BUTTON_STYLE_HEIGHT,
  SWITCH_WIDTH,
  SWITCH_HEIGHT,
} from "../constants.js";
import { deriveTitle } from "./common.js";

function renderTogglePreview() {
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

function renderButtonPreview(entity) {
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

export const switchComponent = {
  type: "switch",
  label: "switch",
  entityFields: [{ label: "Entity ID", defaultValue: (index) => `switch.new_switch_${index}` }],
  styleOptions: [
    { value: SWITCH_STYLE_TOGGLE, label: "toggle" },
    { value: SWITCH_STYLE_BUTTON, label: "button" },
  ],
  createEntity(index) {
    return {
      entityid: `switch.new_switch_${index}`,
      type: "switch",
      props: {
        x: 24,
        y: 24,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        title: `New Switch ${index}`,
      },
    };
  },
  normalizeStyle(value) {
    return value === SWITCH_STYLE_BUTTON ? SWITCH_STYLE_BUTTON : SWITCH_STYLE_TOGGLE;
  },
  defaultTitle(entityids) {
    return deriveTitle(entityids[0]);
  },
  defaultWidth() {
    return DEFAULT_WIDTH;
  },
  defaultHeight(style) {
    return style === SWITCH_STYLE_BUTTON ? SWITCH_BUTTON_STYLE_HEIGHT : DEFAULT_HEIGHT;
  },
  minWidth() {
    return 150;
  },
  minHeight(style) {
    return style === SWITCH_STYLE_BUTTON ? SWITCH_BUTTON_STYLE_HEIGHT : 56;
  },
  usesTopAlignedTitle(entity) {
    return entity.props.style === SWITCH_STYLE_BUTTON;
  },
  shouldRenderWidgetTitle(entity) {
    return entity.props.style !== undefined;
  },
  getInspectorState(entity) {
    return {
      showEntityId: true,
      showEntityId2: false,
      showStyle: true,
      showMultiSwitch: false,
      showThermoIcons: false,
      showHmiBrightness: false,
      showLightIcon: false,
      showLightTilePosition: false,
      showLightSliders: false,
      showActiveColor: entity.props.style === SWITCH_STYLE_BUTTON,
    };
  },
  populateInspector() {},
  applyInspectorChanges() {},
  applyInspectorCommit() {},
  appendSpecProps() {},
  renderPreview(entity) {
    return entity.props.style === SWITCH_STYLE_BUTTON ? renderButtonPreview(entity) : renderTogglePreview();
  },
};
