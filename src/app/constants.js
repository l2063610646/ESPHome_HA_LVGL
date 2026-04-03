export const BOARD_CONFIGS = {
  nextion_35: { width: 320, height: 480, name: "ONX3248G035" },
  nextion_28: { width: 240, height: 320, name: "ONX2432G028" },
};

export const DEFAULT_WIDTH = 220;
export const DEFAULT_HEIGHT = 72;
export const DEFAULT_DUAL_WIDTH = 240;
export const DEFAULT_DUAL_HEIGHT = 124;
export const DEFAULT_LABEL_PAD_LEFT = 16;
export const DEFAULT_SWITCH_PAD_RIGHT = 16;
export const DUAL_GROUP_WIDTH = 96;
export const DUAL_GROUP_HEIGHT = 94;
export const DUAL_BUTTON_HEIGHT = 42;
export const SWITCH_STYLE_TOGGLE = "toggle";
export const SWITCH_STYLE_BUTTON = "button";
export const DUAL_SWITCH_STYLE_STACKED = "stacked";
export const DUAL_SWITCH_STYLE_COLUMNS = "columns";
export const SWITCH_BUTTON_HEIGHT = 40;
export const SWITCH_BUTTON_STYLE_HEIGHT = 88;
export const DUAL_COLUMNS_STYLE_HEIGHT = 96;
export const DUAL_COLUMNS_BUTTON_HEIGHT = 40;
export const THERMO_HYGROMETER_STYLE_COMPACT = "compact";
export const DEFAULT_THERMO_WIDTH = 220;
export const DEFAULT_THERMO_HEIGHT = 112;
export const THERMO_VALUE_BOX_HEIGHT = 80;
export const THERMO_ICON_PATHS = {
  temp: "assets/images/temp.png",
  hum: "assets/images/hum.png",
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
  dual_switch: {
    label: "dual switch",
    entityFields: [
      { label: "Entity ID 1", defaultValue: (index) => `switch.channel_${index}_1` },
      { label: "Entity ID 2", defaultValue: (index) => `switch.channel_${index}_2` },
    ],
    styleOptions: [
      { value: DUAL_SWITCH_STYLE_STACKED, label: "stacked" },
      { value: DUAL_SWITCH_STYLE_COLUMNS, label: "columns" },
    ],
    createEntity(index) {
      return {
        entityids: [`switch.channel_${index}_1`, `switch.channel_${index}_2`],
        type: "dual_switch",
        props: {
          x: 24,
          y: 24,
          width: DEFAULT_DUAL_WIDTH,
          height: DEFAULT_DUAL_HEIGHT,
          title: `Dual Switch ${index}`,
          style: DUAL_SWITCH_STYLE_STACKED,
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
};
