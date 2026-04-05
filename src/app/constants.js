export const BOARD_CONFIGS = {
  nextion_35: { width: 320, height: 480, name: "ONX3248G035" },
  nextion_28: { width: 240, height: 320, name: "ONX2432G028" },
};

export const DEFAULT_WIDTH = 220;
export const DEFAULT_HEIGHT = 72;
export const DEFAULT_LABEL_PAD_LEFT = 16;
export const DEFAULT_SWITCH_PAD_RIGHT = 16;
export const SWITCH_STYLE_TOGGLE = "toggle";
export const SWITCH_STYLE_BUTTON = "button";
export const SWITCH_BUTTON_HEIGHT = 40;
export const SWITCH_BUTTON_STYLE_HEIGHT = 88;
export const THERMO_HYGROMETER_STYLE_COMPACT = "compact";
export const DEFAULT_THERMO_WIDTH = 220;
export const DEFAULT_THERMO_HEIGHT = 112;
export const THERMO_VALUE_BOX_HEIGHT = 80;
export const LIGHT_STYLE_ICON = "icon";
export const LIGHT_STYLE_TILE = "tile";
export const LIGHT_PAD_ALL = 5;
export const LIGHT_PAD_ROW = 2;
export const LIGHT_DEFAULT_ICON_SIZE = 36;
export const LIGHT_LABEL_HEIGHT = 14;
export const LIGHT_LABEL_MIN_WIDTH = 24;
export const DEFAULT_LIGHT_WIDTH = Math.max(LIGHT_DEFAULT_ICON_SIZE, LIGHT_LABEL_MIN_WIDTH) + LIGHT_PAD_ALL * 2;
export const DEFAULT_LIGHT_HEIGHT = LIGHT_DEFAULT_ICON_SIZE + LIGHT_LABEL_HEIGHT + LIGHT_PAD_ALL * 2 + LIGHT_PAD_ROW;
export const THERMO_ICON_PATHS = {
  temp: "mdi:thermometer",
  hum: "https://l2063610646.github.io/ESPHome_HA_LVGL/assets/images/humi.png",
};
export const LIGHT_ICON_PATHS = {
  on: "https://l2063610646.github.io/ESPHome_HA_LVGL/assets/images/light.png",
};
export const DEFAULT_BUTTON_BG_COLOR = "0xEEF3F0";
export const SWITCH_WIDTH = 54;
export const SWITCH_HEIGHT = 28;

export const ENTITY_CAPABILITIES = {
  switch: {
    label: "switch",
    entityFields: [
      { label: "Entity ID", defaultValue: (index) => `switch.new_switch_${index}` },
    ],
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
  },
  thermo_hygrometer: {
    label: "thermo-hygrometer",
    entityFields: [
      { label: "Entity ID (Temperature)", defaultValue: (index) => `sensor.temperature_${index}` },
      { label: "Entity ID (Humidity)", defaultValue: (index) => `sensor.humidity_${index}` },
    ],
    styleOptions: [
      { value: THERMO_HYGROMETER_STYLE_COMPACT, label: "compact" },
    ],
    createEntity(index) {
      return {
        entityids: [`sensor.temperature_${index}`, `sensor.humidity_${index}`],
        type: "thermo_hygrometer",
        props: {
          x: 24,
          y: 24,
          width: DEFAULT_THERMO_WIDTH,
          height: DEFAULT_THERMO_HEIGHT,
          title: `Climate ${index}`,
          style: THERMO_HYGROMETER_STYLE_COMPACT,
          temp_icon: THERMO_ICON_PATHS.temp,
          hum_icon: THERMO_ICON_PATHS.hum,
        },
      };
    },
  },
  light: {
    label: "light",
    entityFields: [
      { label: "Entity ID", defaultValue: (index) => `light.new_light_${index}` },
    ],
    styleOptions: [
      { value: LIGHT_STYLE_ICON, label: "icon" },
      { value: LIGHT_STYLE_TILE, label: "tile" },
    ],
    createEntity(index) {
      return {
        entityid: `light.new_light_${index}`,
        type: "light",
        props: {
          x: 24,
          y: 24,
          width: DEFAULT_LIGHT_WIDTH,
          height: DEFAULT_LIGHT_HEIGHT,
          title: `Light ${index}`,
          style: LIGHT_STYLE_ICON,
          icon: LIGHT_ICON_PATHS.on,
        },
      };
    },
  },
};
