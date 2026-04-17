# ESPHome UI Builder

This repository is now a pure HTML/CSS/JS project.

Its job is narrow:

- visually edit the screen layout and widget settings in the browser
- preview the LVGL-style layout in the browser
- generate a complete ESPHome YAML file locally in the browser

No Python build step, local server, or generated YAML directory is required for the main workflow. The browser editor is the product.

Future AI collaborators should read `AGENTS.md` first.

## Project Structure

- `index.html`
  Main standalone app shell.
- `src/app.js`
  Browser entry module for the editor.
- `src/app/main.js`
  Main UI wiring, event handling, drag/resize interactions, and overall editor coordination.
- `src/app/persistence.js`
  Local cache snapshot/save/restore helpers and filename timestamp helpers.
- `src/app/screens.js`
  Screen selection, current-screen entity syncing, and screen control UI helpers.
- `src/app/spec.js`
  State initialization, spec parsing/export, normalization, and shared model helpers.
- `src/app/preview.js`
  Canvas preview rendering, entity list rendering, inspector rendering, and preview orchestration.
- `src/app/esphome.js`
  Board templates, shared ESPHome helpers, and final ESPHome YAML orchestration.
- `src/app/constants.js`
  Board metadata, widget constants, and shared layout helpers.
- `src/app/components/registry.js`
  Component registry for per-widget metadata and dispatch.
- `src/app/components/*.js`
  One module per widget type. These own widget defaults, style normalization, preview rendering, spec-property extension, and Inspector-specific behavior.
- `src/app/components/esphome/registry.js`
  Final LVGL/ESPHome renderer registry.
- `src/app/components/esphome/*.js`
  One module per widget type for final ESPHome widget rendering.
- `src/app/components/common.js`
  Shared component helpers.
- `src/app/components/preview-helpers.js`
  Shared preview/icon helper functions used by component modules.
- `assets/css/styles.css`
  Editor UI and preview styling.
- `mdi:thermometer`
  Default temperature icon example.
- `https://l2063610646.github.io/tools/hum.png`
  Default humidity icon example.

Current component modules:

- `switch`
- `multi_switch`
- `thermo_hygrometer`
- `cover`
- `hmi_screen_brightness`
- `light`

The project is now component-first. New widget behavior should usually be added in component modules instead of expanding type-switch logic in `spec.js`, `preview.js`, or `esphome.js`.

## Current Data Model

Internally, the editor stores page state in a compact YAML-friendly shape:

- Top-level page settings:
  `base_config`, optional `rotation`, optional `device`, optional `wifi`, optional `screen`, and `screens`.
- `screen.swipe_direction`
  Controls page-to-page swipe direction. Supported values: `horizontal`, `vertical`.
- `screens`
  Ordered list of HMI screens. Each screen has `name` and `entities`.
- `type: switch`
  Uses one `entityid`.
- `type: multi_switch`
  Uses up to four switch `entityids`. Visibility is controlled per channel with `props.channel_1_enabled` through `props.channel_4_enabled`.
- `type: light`
  Uses one `entityid`.
- `type: hmi_screen_brightness`
  Uses no Home Assistant `entityid`. This widget controls the local HMI backlight.
- `type: thermo_hygrometer`
  Uses exactly two `entityids`, ordered as temperature sensor then humidity sensor.
- Common widget metadata lives in `props`
  Position, size, title, style, and optional icon sources live here.

Supported styles:

- `switch.props.style: toggle`
- `switch.props.style: button`
- `multi_switch.props.style: tile`
- `light.props.style: icon`
- `light.props.style: tile`
- `light.props.style: slider`
- `light.props.tile_icon_position`
  Optional for `light.props.style: tile`. Supported values: `top-left`, `top-right`, `bottom-left`, `bottom-right`.
- `light.props.color_temp`
  Optional for `light.props.style: slider`. Adds a color temperature slider.
- `light.props.hue_360`
  Optional for `light.props.style: slider`. Adds a 360-degree hue slider and generates `rgb_color` output.
- `hmi_screen_brightness.props.style: tile`
  Shows an optional header row with HMI screen name on the left and current brightness on the right, plus a slider with a minimum value of `10%`.
- `hmi_screen_brightness.props.show_header`
  Optional. Defaults to `true`.
- `hmi_screen_brightness.props.slider_color`
  Optional slider fill color in YAML color format such as `0xFDBB13`.
- `thermo_hygrometer.props.style: compact`

Example:

```yaml
base_config: nextion_35
rotation: 90
device:
  name: "living-room-panel"
  friendly_name: "Living Room Panel"
wifi:
  ssid: "MyWifi"
  password: "MyPassword"
screen:
  bg_color: "0xF3EFE7"
  swipe_direction: "horizontal"
screens:
  - name: "Main"
    entities:
      - entityid: "switch.living_room"
        type: switch
        props:
          style: "button"
          x: 24
          y: 24
          width: 220
          height: 88
          title: "Living Room"
  - name: "Climate"
    entities:
      - entityids:
          - "sensor.room_temperature"
          - "sensor.room_humidity"
        type: thermo_hygrometer
        props:
          style: "compact"
          temp_icon: "mdi:thermometer"
          hum_icon: "https://l2063610646.github.io/tools/hum.png"
          x: 24
          y: 130
          width: 220
          height: 112
          title: "Climate"
      - type: hmi_screen_brightness
        props:
          style: "tile"
          x: 24
          y: 180
          width: 220
          height: 60
          title: "Main HMI"
          show_header: true
          slider_color: "0xFDBB13"
```

## Workflow

Open the app directly:

```bash
xdg-open index.html
```

Or serve it as any static site if preferred.

In the app you can:

- choose a board model and rotation
- choose one global screen swipe direction for the HMI
- set `device_name` and optional `friendly_name`
- set Wi-Fi SSID and password
- set the LVGL screen background color
- add, remove, rename, and switch between multiple screens
- drag and resize widgets
- drag and resize `hmi_screen_brightness` tiles; slider size follows the widget size
- edit the page through the visual editor
- inspect or paste YAML in the spec text area when needed
- generate the final ESPHome YAML locally in the browser
- download either the spec YAML or the final ESPHome YAML
- keep separate local browser cache for each supported HMI board

The board-specific ESPHome base templates are embedded in `src/app/esphome.js`.

## Architecture Notes

The editor now uses a component registry architecture:

- `src/app/components/registry.js`
  Dispatches type-specific defaults, style normalization, preview rendering, and Inspector behavior.
- `src/app/components/esphome/registry.js`
  Dispatches type-specific LVGL/ESPHome widget rendering.
- `src/app/spec.js`
  Uses the component registry for normalization and spec export.
- `src/app/preview.js`
  Uses the component registry for preview rendering and most Inspector visibility logic.
- `src/app/esphome.js`
  Keeps shared helper functions and board templates, then delegates widget rendering to component-specific ESPHome modules.
- `src/app/persistence.js`
  Owns browser-local state cache persistence so `main.js` does not carry snapshot/restore details.
- `src/app/screens.js`
  Owns current-screen lookup/sync logic so `main.js` does not carry all screen-selection state flow inline.

For a new widget type, the expected implementation path is:

1. Add `src/app/components/<type>.js`
2. Add `src/app/components/esphome/<type>.js`
3. Register both in their registries
4. Add any shared Inspector HTML only if the control is generic enough to belong in the common shell
5. Keep preview and final YAML in sync for the new widget before considering the work complete

## Board Templates

The current built-in boards are:

- `nextion_35`
  ONX3248G035
- `nextion_28`
  ONX2432G028

If a board template changes, update both:

- `BOARD_CONFIGS`
- the matching `renderNextion...Base()` function in `src/app/esphome.js`

## Preview Fidelity

Treat generated LVGL as the source of truth.

- Keep the web preview close to the generated card spacing, borders, radius, and control layout.
- Avoid browser-only effects that LVGL cannot match closely.
- If exact parity is not possible, simplify the web preview toward LVGL rather than making the preview more decorative.
- The browser preview canvas and generated LVGL screens are intentionally non-scrollable; content that does not fit the current screen should remain clipped rather than scroll.

## Notes

- The editor can generate the final ESPHome YAML entirely in the browser.
- The editor automatically regenerates the final ESPHome YAML as you edit.
- The browser caches editor state locally per HMI board and restores it on the next visit.
- The generated LVGL layout uses a multi-screen `tileview` when more than one screen is configured.
- If `friendly_name` is empty, the generated YAML uses `device_name.toUpperCase()`.
- Screen background color is generated as `lvgl.bg_color`.
- The repository no longer depends on the old Python generator for normal use.
- Validation with `esphome config` is still useful when available, but it is external to this repo's main workflow.
