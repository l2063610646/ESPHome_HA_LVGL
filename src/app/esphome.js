import {
  DEFAULT_BUTTON_BG_COLOR,
  getLightTileLayout,
  LIGHT_ICON_PATHS,
  LIGHT_STYLE_TILE,
  LIGHT_STYLE_SLIDER,
  LIGHT_TILE_ICON_BUBBLE_OPACITY,
  SWITCH_HEIGHT,
  SWITCH_WIDTH,
  THERMO_ICON_PATHS,
} from "./constants.js";
import {
  getEffectiveFriendlyName,
  normalizeEntities,
  normalizeOptionalColor,
  quoteYaml,
} from "./spec.js";

const UI_FONT_BODY = "montserrat_14";
const UI_FONT_VALUE = "montserrat_16";

export function renderCombinedYaml(state) {
  const entities = normalizeEntities(state.entities, state.canvasWidth, state.canvasHeight);
  const header = [
    "# This file is auto-generated.",
    `# Base config: ${state.board}.yaml`,
    "# UI config: browser editor",
    "# This is a full ESPHome config assembled locally in the browser.",
  ];

  const body = [
    renderBaseConfigYaml(state).trimEnd(),
    `  bg_color: ${state.screenBgColor}`,
    "  widgets:",
    indentLines(renderWidgetBlock(entities) || "    []", 0),
    "",
    "switch:",
    indentLines(renderSwitchBlock(entities) || "[]", 2),
    "",
    "sensor:",
    indentLines(renderSensorBlock(entities) || "[]", 2),
    "",
    "text_sensor:",
    indentLines(renderTextSensorBlock(entities) || "[]", 2),
    "",
    "image:",
    indentLines(renderImageBlock(entities) || "[]", 2),
    "",
  ];
  return `${header.join("\n")}\n${body.join("\n")}`;
}

function indentLines(text, spaces) {
  const prefix = " ".repeat(spaces);
  return String(text)
      .split("\n")
      .map((line) => (line ? `${prefix}${line}` : line))
      .join("\n");
}

function sanitizeId(value) {
  let slug = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  if (!slug) {
    throw new Error("Entity ID produced an empty sanitized ID");
  }
  if (/^\d/.test(slug)) {
    slug = `entity_${slug}`;
  }
  return slug;
}

function getEntitySlug(entity) {
  return sanitizeId([entity.type, ...entity.entityids].join("_"));
}

function getContainerId(entity) {
  return `card_${getEntitySlug(entity)}`;
}

function getHaSwitchId(entity, index) {
  return `ha_${getEntitySlug(entity)}_${index + 1}`;
}

function getHaTextSensorId(entity, index) {
  return `ha_text_${getEntitySlug(entity)}_${index + 1}`;
}

function getWidgetId(entity, index) {
  return `widget_${getEntitySlug(entity)}_${index + 1}`;
}

function getValueLabelId(entity, index) {
  return `label_${getEntitySlug(entity)}_${index + 1}`;
}

function getThermoImageId(entity, kind) {
  return `${kind}_${getEntitySlug(entity)}_icon`;
}

function getLightImageId(entity) {
  return `light_${getEntitySlug(entity)}_icon`;
}

function getLightStateLabelId(entity) {
  return `light_state_${getEntitySlug(entity)}`;
}

function getMetricCaption(index) {
  return index === 0 ? "Temp" : "Humi";
}

function getMetricSuffix(index) {
  return index === 0 ? "°C" : "%";
}

function buttonInactiveBgColor(entity) {
  return normalizeOptionalColor(entity.props.inactive_bg_color) || DEFAULT_BUTTON_BG_COLOR;
}

function buttonActiveBgColor(entity) {
  return normalizeOptionalColor(entity.props.active_bg_color) || "0xD7E9DD";
}

function getBoardTransform(model, rotation) {
  const mappings = {
    st7796: {
      0: { width: 320, height: 480, dSwap: false, dMirX: true, dMirY: false, tSwap: false, tMirX: false, tMirY: false },
      90: { width: 480, height: 320, dSwap: true, dMirX: false, dMirY: false, tSwap: true, tMirX: false, tMirY: true },
      180: { width: 320, height: 480, dSwap: false, dMirX: false, dMirY: true, tSwap: false, tMirX: true, tMirY: true },
      270: { width: 480, height: 320, dSwap: true, dMirX: true, dMirY: true, tSwap: true, tMirX: true, tMirY: false },
    },
    st7789v: {
      0: { width: 240, height: 320, dSwap: false, dMirX: false, dMirY: false, tSwap: false, tMirX: false, tMirY: false },
      90: { width: 320, height: 240, dSwap: true, dMirX: true, dMirY: false, tSwap: true, tMirX: false, tMirY: true },
      180: { width: 240, height: 320, dSwap: false, dMirX: true, dMirY: true, tSwap: false, tMirX: true, tMirY: true },
      270: { width: 320, height: 240, dSwap: true, dMirX: false, dMirY: true, tSwap: true, tMirX: true, tMirY: false },
    },
  };
  return mappings[model]?.[rotation] || mappings[model]?.[0];
}

function renderBaseConfigYaml(state) {
  const templates = {
    nextion_35: renderNextion35Base,
    nextion_28: renderNextion28Base,
  };
  const renderer = templates[state.board];
  if (!renderer) {
    throw new Error(`Unsupported board: ${state.board}`);
  }
  return renderer(state.rotation, {
    deviceName: state.deviceName,
    friendlyName: getEffectiveFriendlyName(state.deviceName, state.friendlyName),
    ssid: state.wifiSsid,
    password: state.wifiPassword,
  });
}

function renderNextion35Base(rotation, wifi) {
  const t = getBoardTransform("st7796", rotation);
  return `substitutions:
  device_name: ${quoteYaml(wifi.deviceName)}
  friendly_name: ${quoteYaml(wifi.friendlyName)}
  wifi_ssid: ${quoteYaml(wifi.ssid)}
  wifi_password: ${quoteYaml(wifi.password)}

esphome:
  name: \${device_name}
  friendly_name: \${friendly_name}
  comment: "ESPHome config for ONX3248G035 / ESP32-S3 + ST7796U + CST826"
  on_boot:
    priority: 800
    then:
      - light.turn_on:
          id: backlight
          brightness: !lambda "return id(backlight_percent) / 100.0f;"

external_components:
  - source:
      type: git
      url: https://github.com/l2063610646/esphome-cst826-driver
    components: [ cst826 ]

esp32:
  board: esp32-s3-devkitc-1
  variant: esp32s3
  framework:
    type: esp-idf

psram:
  mode: octal
  speed: 40MHz

logger:

api:

ota:
  - platform: esphome

wifi:
  ssid: \${wifi_ssid}
  password: \${wifi_password}
  ap:
    ssid: "\${friendly_name} Fallback"

web_server:
  port: 80

i2c:
  sda: GPIO8
  scl: GPIO7
  scan: true
  frequency: 400kHz

spi:
  clk_pin: GPIO5
  mosi_pin: GPIO1

output:
  - platform: ledc
    id: backlight_pwm
    pin: GPIO6
    frequency: 10000Hz

light:
  - platform: monochromatic
    id: backlight
    name: "\${friendly_name} Backlight"
    output: backlight_pwm
    restore_mode: ALWAYS_ON

globals:
  - id: backlight_percent
    type: int
    restore_value: no
    initial_value: "50"

display:
  - platform: mipi_spi
    id: main_display
    model: ST7796
    dc_pin: GPIO3
    cs_pin: GPIO2
    dimensions:
      width: ${t.width}
      height: ${t.height}
    data_rate: 40MHz
    color_order: bgr
    invert_colors: false
    auto_clear_enabled: false
    update_interval: never
    transform:
      swap_xy: ${String(t.dSwap)}
      mirror_x: ${String(t.dMirX)}
      mirror_y: ${String(t.dMirY)}
    init_sequence:
      - [0x11]
      - delay 120ms
      - [0xF0, 0xC3]
      - [0xF0, 0x96]
      - [0xB4, 0x01]
      - [0xB7, 0xC6]
      - [0xC0, 0x80, 0x45]
      - [0xC1, 0x13]
      - [0xC2, 0xA7]
      - [0xC5, 0x0A]
      - [0xE8, 0x40, 0x8A, 0x00, 0x00, 0x29, 0x19, 0xA5, 0x33]
      - [0xE0, 0xD0, 0x08, 0x0F, 0x06, 0x06, 0x33, 0x30, 0x33, 0x47, 0x17, 0x13, 0x13, 0x2B, 0x31]
      - [0xE1, 0xD0, 0x0A, 0x11, 0x0B, 0x09, 0x07, 0x2F, 0x33, 0x47, 0x38, 0x15, 0x16, 0x2C, 0x32]
      - [0xF0, 0x3C]
      - [0xF0, 0x69]
      - delay 120ms
      - [0x21]
      - [0x29]

touchscreen:
  - platform: cst826
    id: main_touch
    display: main_display
    x_raw_max: ${t.width}
    y_raw_max: ${t.height}
    transform:
      swap_xy: ${String(t.tSwap)}
      mirror_x: ${String(t.tMirX)}
      mirror_y: ${String(t.tMirY)}
    update_interval: 50ms

lvgl:
  default_font: ${UI_FONT_BODY}
  displays:
    - main_display
  touchscreens:
    - touchscreen_id: main_touch
      long_press_time: 300ms
      long_press_repeat_time: 60ms`;
}

function renderNextion28Base(rotation, wifi) {
  const t = getBoardTransform("st7789v", rotation);
  return `substitutions:
  device_name: ${quoteYaml(wifi.deviceName)}
  friendly_name: ${quoteYaml(wifi.friendlyName)}
  wifi_ssid: ${quoteYaml(wifi.ssid)}
  wifi_password: ${quoteYaml(wifi.password)}

esphome:
  name: \${device_name}
  friendly_name: \${friendly_name}
  comment: "ESPHome config for ONX2432G028 / ESP32-S3 + ST7789 + CST826"
  on_boot:
    priority: 800
    then:
      - light.turn_on:
          id: backlight
          brightness: !lambda "return id(backlight_percent) / 100.0f;"

external_components:
  - source:
      type: git
      url: https://github.com/l2063610646/esphome-cst826-driver
    components: [ cst826 ]

esp32:
  board: esp32-s3-devkitc-1
  variant: esp32s3
  framework:
    type: esp-idf

psram:
  mode: octal
  speed: 40MHz

logger:
api:
ota:
  - platform: esphome

wifi:
  ssid: \${wifi_ssid}
  password: \${wifi_password}
  ap:
    ssid: "\${friendly_name} Fallback"

web_server:
  port: 80

i2c:
  sda: GPIO8
  scl: GPIO7
  scan: true
  frequency: 400kHz

spi:
  clk_pin: GPIO5
  mosi_pin: GPIO1

pcf8574:
  - id: lcd_exio
    address: 0x38
    pcf8575: false

output:
  - platform: ledc
    id: backlight_pwm
    pin: GPIO6
    frequency: 5000Hz

light:
  - platform: monochromatic
    id: backlight
    name: "\${friendly_name} Backlight"
    output: backlight_pwm
    restore_mode: ALWAYS_ON

globals:
  - id: backlight_percent
    type: int
    restore_value: no
    initial_value: "50"

display:
  - platform: mipi_spi
    id: main_display
    model: ST7789V
    dc_pin: GPIO3
    cs_pin: GPIO2
    reset_pin:
      pcf8574: lcd_exio
      number: 5
      mode:
        output: true
      inverted: false
    dimensions:
      width: ${t.width}
      height: ${t.height}
    data_rate: 40MHz
    invert_colors: false
    auto_clear_enabled: false
    update_interval: never
    transform:
      swap_xy: ${String(t.dSwap)}
      mirror_x: ${String(t.dMirX)}
      mirror_y: ${String(t.dMirY)}

touchscreen:
  - platform: cst826
    id: main_touch
    display: main_display
    x_raw_max: ${t.width}
    y_raw_max: ${t.height}
    transform:
      swap_xy: ${String(t.tSwap)}
      mirror_x: ${String(t.tMirX)}
      mirror_y: ${String(t.tMirY)}
    update_interval: 50ms

lvgl:
  default_font: ${UI_FONT_BODY}
  displays:
    - main_display
  touchscreens:
    - touchscreen_id: main_touch
      long_press_time: 300ms
      long_press_repeat_time: 60ms`;
}

function renderSwitchBlock(entities) {
  return entities
      .filter((entity) => entity.type === "switch")
      .flatMap((entity) => entity.entityids.map((_, index) => renderSwitchComponent(entity, index)))
      .join("\n");
}

function renderSensorBlock(entities) {
  return entities
      .filter((entity) => entity.type === "light" && entity.props.style === LIGHT_STYLE_SLIDER)
      .flatMap((entity) => [
        `- platform: homeassistant
  id: ha_brightness_${getEntitySlug(entity)}
  entity_id: ${quoteYaml(entity.entityids[0])}
  attribute: brightness
  on_value:
    - lvgl.slider.update:
        id: ${getWidgetId(entity, 0)}
        value: !lambda |-
          return std::isnan(x) ? 0 : (x / 255.0) * 100.0;
    - lvgl.obj.update:
        id: ${getWidgetId(entity, 0)}_orange_fill
        width: !lambda |-
          float val = std::isnan(x) ? 0 : (x / 255.0) * 100.0;
          auto wrapper = id(${getWidgetId(entity, 0)}_wrapper);
          int w = lv_obj_get_width(wrapper);
          int fill_w = (int)((w * val) / 100.0f);
          if(fill_w < 0) fill_w = 0;
          if(fill_w > w) fill_w = w;
          return fill_w;
    - lvgl.obj.update:
        id: ${getWidgetId(entity, 0)}_pill
        x: !lambda |-
          float val = std::isnan(x) ? 0 : (x / 255.0) * 100.0;
          auto wrapper = id(${getWidgetId(entity, 0)}_wrapper);
          int w = lv_obj_get_width(wrapper);
          int fill_w = (int)((w * val) / 100.0f);
          if(fill_w < 0) fill_w = 0;
          if(fill_w > w) fill_w = w;
          int pill_x = fill_w - 10;
          return pill_x < 0 ? 0 : pill_x;
    - lvgl.label.update:
        id: ${getLightStateLabelId(entity)}
        text: !lambda |-
          static char buf[10];
          if (id(${getHaTextSensorId(entity, 0)}).state != "on" || std::isnan(x) || x == 0) {
            return "OFF";
          }
          sprintf(buf, "%.0f%%", (x / 255.0) * 100.0);
          return buf;`
      ])
      .join("\n");
}

function renderTextSensorBlock(entities) {
  return entities
      .filter((entity) => entity.type === "thermo_hygrometer" || entity.type === "light")
      .flatMap((entity) => {
        if (entity.type === "thermo_hygrometer") {
          return entity.entityids.map((_, index) => renderTextSensorComponent(entity, index));
        }
        return [renderLightStateTextSensorComponent(entity)];
      })
      .join("\n");
}

function renderImageBlock(entities) {
  return entities
      .filter((entity) => entity.type === "thermo_hygrometer" || entity.type === "light")
      .flatMap((entity) => {
        if (entity.type === "thermo_hygrometer") {
          return [
            `- file: ${quoteYaml(entity.props.temp_icon || THERMO_ICON_PATHS.temp)}
  id: ${getThermoImageId(entity, "temp")}
  type: rgb565
  transparency: alpha_channel
  resize: 32x32`,
            `- file: ${quoteYaml(entity.props.hum_icon || THERMO_ICON_PATHS.hum)}
  id: ${getThermoImageId(entity, "hum")}
  type: rgb565
  transparency: alpha_channel
  resize: 32x32`,
          ];
        }

        if (entity.type === "light" && entity.props.style === LIGHT_STYLE_SLIDER) {
          return [
            `- file: "mdi:lightbulb"
  id: ${getLightImageId(entity)}_on
  type: BINARY
  transparency: chroma_key`,
            `- file: "mdi:lightbulb-off"
  id: ${getLightImageId(entity)}_off
  type: BINARY
  transparency: chroma_key`
          ];
        }

        return [
          `- file: ${quoteYaml(entity.props.icon || LIGHT_ICON_PATHS.on)}
  id: ${getLightImageId(entity)}
  type: rgb565
  transparency: alpha_channel`,
        ];
      })
      .join("\n");
}

function renderWidgetBlock(entities) {
  const widgets = entities.map((entity) => renderWidget(entity)).join("\n");
  return widgets ? indentLines(widgets, 4) : "";
}

function renderSwitchComponent(entity, index) {
  return `- platform: homeassistant
  id: ${getHaSwitchId(entity, index)}
  entity_id: ${quoteYaml(entity.entityids[index])}
  on_turn_on:
    - lvgl.widget.update:
        id: ${getWidgetId(entity, index)}
        state:
          checked: true
  on_turn_off:
    - lvgl.widget.update:
        id: ${getWidgetId(entity, index)}
        state:
          checked: false`;
}

function renderTextSensorComponent(entity, index) {
  return `- platform: homeassistant
  id: ${getHaTextSensorId(entity, index)}
  entity_id: ${quoteYaml(entity.entityids[index])}
  on_value:
    - lvgl.label.update:
        id: ${getValueLabelId(entity, index)}
        text: !lambda |-
          static std::string value;
          value = "${getMetricCaption(index)}: " + x + "${getMetricSuffix(index)}";
          return value.c_str();`;
}

function renderLightStateTextSensorComponent(entity) {
  if (entity.props.style === LIGHT_STYLE_SLIDER) {
    return `- platform: homeassistant
  id: ${getHaTextSensorId(entity, 0)}
  entity_id: ${quoteYaml(entity.entityids[0])}
  on_value:
    - if:
        condition:
          lambda: "return x == \\"off\\";"
        then:
          - lvgl.label.update:
              id: ${getLightStateLabelId(entity)}
              text: "OFF"
          - lvgl.image.update:
              id: ${getWidgetId(entity, 0)}_icon
              src: ${getLightImageId(entity)}_off
          - lvgl.obj.update:
              id: ${getWidgetId(entity, 0)}_icon
              image_recolor: 0x9E9E9E
              image_recolor_opa: COVER
          - lvgl.obj.update:
              id: ${getWidgetId(entity, 0)}_bubble
              bg_color: 0xECECEC
          - lvgl.obj.update:
              id: ${getWidgetId(entity, 0)}_wrapper
              bg_color: 0xEBEBEB
          - lvgl.obj.update:
              id: ${getWidgetId(entity, 0)}_orange_fill
              bg_color: 0x9E9E9E
        else:
          - lvgl.label.update:
              id: ${getLightStateLabelId(entity)}
              text: !lambda |-
                auto slider = id(${getWidgetId(entity, 0)});
                int slider_val = lv_slider_get_value(slider);
                static char buf[10];
                if (slider_val == 0) return "OFF";
                sprintf(buf, "%.0f%%", (float)slider_val);
                return buf;
          - lvgl.image.update:
              id: ${getWidgetId(entity, 0)}_icon
              src: ${getLightImageId(entity)}_on
          - lvgl.obj.update:
              id: ${getWidgetId(entity, 0)}_icon
              image_recolor: 0xFDBB13
              image_recolor_opa: COVER
          - lvgl.obj.update:
              id: ${getWidgetId(entity, 0)}_bubble
              bg_color: 0xFEEDBD
          - lvgl.obj.update:
              id: ${getWidgetId(entity, 0)}_wrapper
              bg_color: 0xFEEDBD
          - lvgl.obj.update:
              id: ${getWidgetId(entity, 0)}_orange_fill
              bg_color: 0xFDBB13`;
  }

  return `- platform: homeassistant
  id: ${getHaTextSensorId(entity, 0)}
  entity_id: ${quoteYaml(entity.entityids[0])}
  on_value:
    - lvgl.widget.update:
        id: ${getWidgetId(entity, 0)}
        state:
          checked: !lambda return x == "on";
    - lvgl.label.update:
        id: ${getLightStateLabelId(entity)}
        text: !lambda |-
          static std::string value;
          value = x == "on" ? "ON" : "OFF";
          return value.c_str();`;
}

function renderWidget(entity) {
  if (entity.type === "switch") {
    return entity.props.style === "button"
        ? renderSingleSwitchButtonWidget(entity)
        : renderSingleSwitchToggleWidget(entity);
  }
  if (entity.type === "light") {
    return renderLightWidget(entity);
  }
  return renderThermoHygrometerWidget(entity);
}

function renderSingleSwitchToggleWidget(entity) {
  return `- obj:
    id: ${getContainerId(entity)}
    x: ${entity.props.x}
    y: ${entity.props.y}
    width: ${entity.props.width}
    height: ${entity.props.height}
    radius: 14
    border_width: 1
    border_color: 0xD7DDD9
    pad_all: 0
    bg_opa: COVER
    bg_color: 0xF8FBF9
    shadow_width: 4
    shadow_color: 0x1F2933
    shadow_opa: 6%
    scrollbar_mode: "OFF"
    widgets:
      - label:
          align: LEFT_MID
          x: 16
          text_font: ${UI_FONT_BODY}
          text: ${quoteYaml(entity.props.title)}
      - switch:
          id: ${getWidgetId(entity, 0)}
          align: RIGHT_MID
          x: -16
          width: ${SWITCH_WIDTH}
          height: ${SWITCH_HEIGHT}
          state:
            checked: !lambda return id(${getHaSwitchId(entity, 0)}).state;
          on_change:
            then:
              - if:
                  condition:
                    lambda: return x;
                  then:
                    - switch.turn_on: ${getHaSwitchId(entity, 0)}
                  else:
                    - switch.turn_off: ${getHaSwitchId(entity, 0)}`;
}

function renderSingleSwitchButtonWidget(entity) {
  const buttonWidth = Math.max(entity.props.width - 32, 96);
  return `- obj:
    id: ${getContainerId(entity)}
    x: ${entity.props.x}
    y: ${entity.props.y}
    width: ${entity.props.width}
    height: ${entity.props.height}
    radius: 14
    border_width: 1
    border_color: 0xD7DDD9
    pad_all: 0
    bg_opa: COVER
    bg_color: 0xF8FBF9
    shadow_width: 4
    shadow_color: 0x1F2933
    shadow_opa: 6%
    scrollbar_mode: "OFF"
    widgets:
      - label:
          align: TOP_LEFT
          x: 16
          y: 12
          text_font: ${UI_FONT_BODY}
          text: ${quoteYaml(entity.props.title)}
      - button:
          id: ${getWidgetId(entity, 0)}
          align: BOTTOM_MID
          y: -12
          width: ${buttonWidth}
          height: 40
          checkable: true
          radius: 12
          pad_all: 0
          border_width: 1
          border_color: 0xB9C9C2
          bg_opa: COVER
          bg_color: ${buttonInactiveBgColor(entity)}
          checked:
            bg_color: ${buttonActiveBgColor(entity)}
          shadow_width: 0
          state:
            checked: !lambda return id(${getHaSwitchId(entity, 0)}).state;
          widgets:
            - label:
                align: CENTER
                text_font: ${UI_FONT_BODY}
                text: "Toggle"
                text_color: 0x24323A
          on_change:
            then:
              - if:
                  condition:
                    lambda: return x;
                  then:
                    - switch.turn_on: ${getHaSwitchId(entity, 0)}
                  else:
                    - switch.turn_off: ${getHaSwitchId(entity, 0)}`;
}

function renderThermoHygrometerWidget(entity) {
  const valueBoxWidth = Math.max(Math.floor((entity.props.width - 44) / 2), 84);
  return `- obj:
    id: ${getContainerId(entity)}
    x: ${entity.props.x}
    y: ${entity.props.y}
    width: ${entity.props.width}
    height: ${entity.props.height}
    radius: 14
    border_width: 1
    border_color: 0xD7DDD9
    pad_all: 0
    bg_opa: COVER
    bg_color: 0xF8FBF9
    shadow_width: 4
    shadow_color: 0x1F2933
    shadow_opa: 6%
    scrollbar_mode: "OFF"
    widgets:
      - obj:
          align: LEFT_MID
          x: 16
          width: ${valueBoxWidth}
          height: 80
          radius: 12
          border_width: 1
          border_color: 0xD7DDD9
          pad_top: 10
          pad_bottom: 10
          pad_left: 8
          pad_right: 8
          bg_opa: COVER
          bg_color: 0xEEF3F0
          shadow_width: 0
          scrollbar_mode: "OFF"
          widgets:
            - image:
                align: TOP_MID
                src: ${getThermoImageId(entity, "temp")}
            - label:
                id: ${getValueLabelId(entity, 0)}
                align: BOTTOM_MID
                text_font: ${UI_FONT_VALUE}
                text: "${getMetricCaption(0)}: --${getMetricSuffix(0)}"
                text_color: 0x24323A
      - obj:
          align: RIGHT_MID
          x: -16
          width: ${valueBoxWidth}
          height: 80
          radius: 12
          border_width: 1
          border_color: 0xD7DDD9
          pad_top: 10
          pad_bottom: 10
          pad_left: 8
          pad_right: 8
          bg_opa: COVER
          bg_color: 0xEEF3F0
          shadow_width: 0
          scrollbar_mode: "OFF"
          widgets:
            - image:
                align: TOP_MID
                src: ${getThermoImageId(entity, "hum")}
            - label:
                id: ${getValueLabelId(entity, 1)}
                align: BOTTOM_MID
                text_font: ${UI_FONT_VALUE}
                text: "${getMetricCaption(1)}: --${getMetricSuffix(1)}"
                text_color: 0x24323A`;
}

function renderLightWidget(entity) {
  if (entity.props.style === LIGHT_STYLE_TILE) {
    return renderLightTileWidget(entity);
  }
  if (entity.props.style === LIGHT_STYLE_SLIDER) {
    return renderLightSliderWidget(entity);
  }
  return `- button:
    id: ${getWidgetId(entity, 0)}
    x: ${entity.props.x}
    y: ${entity.props.y}
    width: ${entity.props.width}
    height: ${entity.props.height}
    radius: 14
    checkable: true
    layout:
      type: FLEX
      flex_flow: COLUMN
      flex_align_main: CENTER
      flex_align_cross: CENTER
      flex_align_track: CENTER
      pad_row: 2
    pad_all: 5
    border_width: 0
    bg_opa: COVER
    bg_color: 0x989898
    transform_pivot_x: ${Math.floor(entity.props.width / 2)}
    transform_pivot_y: ${Math.floor(entity.props.height / 2)}
    checked:
      bg_color: 0xEF920C
    pressed:
      transform_zoom: 1.1
    shadow_width: 0
    scrollbar_mode: "OFF"
    state:
      checked: !lambda return id(${getHaTextSensorId(entity, 0)}).state == "on";
    on_change:
      then:
        - lvgl.label.update:
            id: ${getLightStateLabelId(entity)}
            text: !lambda |-
              static std::string value;
              value = x ? "ON" : "OFF";
              return value.c_str();
        - if:
            condition:
              lambda: return x;
            then:
              - homeassistant.service:
                  service: light.turn_on
                  data:
                    entity_id: ${quoteYaml(entity.entityids[0])}
            else:
              - homeassistant.service:
                  service: light.turn_off
                  data:
                    entity_id: ${quoteYaml(entity.entityids[0])}
    widgets:
      - image:
          src: ${getLightImageId(entity)}
          bg_opa: TRANSP
      - label:
          id: ${getLightStateLabelId(entity)}
          text_font: ${UI_FONT_BODY}
          text: !lambda |-
            static std::string value;
            value = id(${getHaTextSensorId(entity, 0)}).state == "on" ? "ON" : "OFF";
            return value.c_str();
          text_color: 0xFFFFFF`;
}

function renderLightSliderWidget(entity) {
  const iconId = getLightImageId(entity);
  const stateId = getLightStateLabelId(entity);
  const haId = getHaTextSensorId(entity, 0);

  return `- obj:
    id: ${getContainerId(entity)}
    x: ${entity.props.x}
    y: ${entity.props.y}
    width: ${entity.props.width}
    height: ${entity.props.height}
    radius: 14
    border_width: 1
    border_color: 0xD7DDD9
    pad_all: 12
    bg_opa: COVER
    bg_color: 0xFDFAF3
    shadow_width: 4
    shadow_color: 0x1F2933
    shadow_opa: 6%
    scrollbar_mode: "OFF"
    layout:
      type: FLEX
      flex_flow: COLUMN
      flex_align_main: SPACE_BETWEEN
      flex_align_cross: STRETCH
    widgets:
      - obj:
          width: 100%
          height: SIZE_CONTENT
          border_width: 0
          bg_opa: TRANSP
          pad_all: 0
          scrollbar_mode: "OFF"
          layout:
            type: FLEX
            flex_flow: ROW
            flex_align_cross: CENTER
          on_click:
            - homeassistant.service:
                action: light.toggle
                data:
                  entity_id: ${quoteYaml(entity.entityids[0])}
          widgets:
            - obj:
                id: ${getWidgetId(entity, 0)}_bubble
                width: 44
                height: 44
                radius: 22
                bg_color: 0xFEEDBD
                border_width: 0
                scrollbar_mode: "OFF"
                layout:
                  type: FLEX
                  flex_align_main: CENTER
                  flex_align_cross: CENTER
                widgets:
                  - image:
                      id: ${getWidgetId(entity, 0)}_icon
                      src: ${iconId}_on
                      image_recolor: 0xFDBB13
                      image_recolor_opa: COVER
            - obj:
                width: SIZE_CONTENT
                height: SIZE_CONTENT
                border_width: 0
                bg_opa: TRANSP
                pad_all: 0
                pad_left: 12
                scrollbar_mode: "OFF"
                layout:
                  type: FLEX
                  flex_flow: COLUMN
                widgets:
                  - label:
                      text_font: ${UI_FONT_BODY}
                      text: ${quoteYaml(entity.props.title)}
                      text_color: 0x24323A
                  - label:
                      id: ${stateId}
                      text_font: ${UI_FONT_BODY}
                      text: "OFF"
                      text_color: 0x596775
      - obj:
          id: ${getWidgetId(entity, 0)}_wrapper
          width: 100%
          flex_grow: 1
          bg_color: 0xFEEDBD
          radius: 12
          border_width: 0
          pad_all: 0
          scrollbar_mode: "OFF"
          widgets:
            - obj:
                id: ${getWidgetId(entity, 0)}_orange_fill
                width: 0
                height: 100%
                bg_color: 0xFDBB13
                radius: 12
                border_width: 0
                scrollbar_mode: "OFF"
            - obj:
                id: ${getWidgetId(entity, 0)}_pill
                width: 4
                height: 16
                radius: 2
                bg_color: 0xFFFFFF
                align: LEFT_MID
                x: 0
                border_width: 0
                scrollbar_mode: "OFF"
            - slider:
                id: ${getWidgetId(entity, 0)}
                width: 100%
                height: 100%
                min_value: 0
                max_value: 100
                radius: 12
                bg_opa: TRANSP
                scrollbar_mode: "OFF"
                indicator:
                  bg_opa: TRANSP
                knob:
                  bg_opa: TRANSP
                  border_width: 0
                  shadow_width: 0
                on_change:
                  then:
                    - lvgl.label.update:
                        id: ${stateId}
                        text: !lambda |-
                          static char buf[10];
                          if (id(${getHaTextSensorId(entity, 0)}).state != "on" || x == 0) return "OFF";
                          sprintf(buf, "%.0f%%", (float)x);
                          return buf;
                    - lvgl.obj.update:
                        id: ${getWidgetId(entity, 0)}_orange_fill
                        width: !lambda |-
                          auto wrapper = id(${getWidgetId(entity, 0)}_wrapper);
                          int w = lv_obj_get_width(wrapper);
                          float val = x;
                          int fill_w = (int)((w * val) / 100.0f);
                          if(fill_w < 0) fill_w = 0;
                          if(fill_w > w) fill_w = w;
                          return fill_w;
                    - lvgl.obj.update:
                        id: ${getWidgetId(entity, 0)}_pill
                        x: !lambda |-
                          auto wrapper = id(${getWidgetId(entity, 0)}_wrapper);
                          int w = lv_obj_get_width(wrapper);
                          float val = x;
                          int fill_w = (int)((w * val) / 100.0f);
                          if(fill_w < 0) fill_w = 0;
                          if(fill_w > w) fill_w = w;
                          int pill_x = fill_w - 10;
                          return pill_x < 0 ? 0 : pill_x;
                    - if:
                        condition:
                          lambda: "return x == 0;"
                        then:
                          - homeassistant.service:
                              service: light.turn_off
                              data:
                                entity_id: ${quoteYaml(entity.entityids[0])}
                        else:
                          - homeassistant.service:
                              service: light.turn_on
                              data:
                                entity_id: ${quoteYaml(entity.entityids[0])}
                              data_template:
                                brightness_pct: "{{ brightness }}"
                              variables:
                                brightness: "return x;"`;
}

function renderLightTileWidget(entity) {
  const iconId = getLightImageId(entity);
  const stateId = getLightStateLabelId(entity);
  const haId = getHaTextSensorId(entity, 0);
  const layout = getLightTileLayout(entity.props.tile_icon_position);

  return `- button:
    id: ${getWidgetId(entity, 0)}
    x: ${entity.props.x}
    y: ${entity.props.y}
    width: ${entity.props.width}
    height: ${entity.props.height}
    radius: 12
    border_width: 1
    border_color: 0xD7DDD9
    checkable: true
    pad_all: 0
    bg_opa: COVER
    bg_color: 0xEEF3F0
    checked:
      bg_color: 0xEF920C
    shadow_width: 0
    scrollbar_mode: "OFF"
    state:
      checked: !lambda return id(${haId}).state == "on";
    on_change:
      then:
        - lvgl.label.update:
            id: ${stateId}
            text: !lambda |-
              static std::string value;
              value = x ? "ON" : "OFF";
              return value.c_str();
        - if:
            condition:
              lambda: return x;
            then:
              - homeassistant.service:
                  service: light.turn_on
                  data:
                    entity_id: ${quoteYaml(entity.entityids[0])}
            else:
              - homeassistant.service:
                  service: light.turn_off
                  data:
                    entity_id: ${quoteYaml(entity.entityids[0])}
    widgets:
      - obj:
          align: ${layout.icon.align}
          x: ${layout.icon.x}
          y: ${layout.icon.y}
          width: SIZE_CONTENT
          height: SIZE_CONTENT
          radius: 999
          pad_all: 8
          border_width: 0
          bg_color: 0xFFFFFF
          bg_opa: ${LIGHT_TILE_ICON_BUBBLE_OPACITY}%
          shadow_width: 0
          scrollbar_mode: "OFF"
          widgets:
            - image:
                align: CENTER
                src: ${iconId}
      - label:
          align: ${layout.title.align}
          x: ${layout.title.x}
          y: ${layout.title.y}
          text_font: ${UI_FONT_BODY}
          text: ${quoteYaml(entity.props.title)}
          text_color: 0x24323A
      - label:
          id: ${stateId}
          align: ${layout.state.align}
          x: ${layout.state.x}
          y: ${layout.state.y}
          text_font: ${UI_FONT_BODY}
          text: !lambda |-
            static std::string value;
            value = id(${haId}).state == "on" ? "ON" : "OFF";
            return value.c_str();
          text_color: 0x596775`;
}
