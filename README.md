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
  Main UI wiring, event handling, local cache restore/save, and overall editor coordination.
- `src/app/spec.js`
  State initialization, spec parsing/export, normalization, and shared model helpers.
- `src/app/preview.js`
  Canvas preview rendering, entity list rendering, inspector rendering, and preview helpers.
- `src/app/esphome.js`
  Board templates and final ESPHome YAML generation.
- `src/app/constants.js`
  Board metadata, widget constants, and entity capability definitions.
- `assets/css/styles.css`
  Editor UI and preview styling.
- `assets/images/temp.png`
  Default temperature icon example.
- `assets/images/hum.png`
  Default humidity icon example.

## Current Data Model

Internally, the editor stores page state in a compact YAML-friendly shape:

- Top-level page settings:
  `base_config`, optional `rotation`, optional `device`, optional `wifi`, optional `screen`.
- `type: switch`
  Uses one `entityid`.
- `type: dual_switch`
  Uses exactly two `entityids`.
- `type: thermo_hygrometer`
  Uses exactly two `entityids`, ordered as temperature sensor then humidity sensor.
- Common widget metadata lives in `props`
  Position, size, title, style, and optional icon sources live here.

Supported styles:

- `switch.props.style: toggle`
- `switch.props.style: button`
- `dual_switch.props.style: stacked`
- `dual_switch.props.style: columns`
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
  - entityids:
      - "sensor.room_temperature"
      - "sensor.room_humidity"
    type: thermo_hygrometer
    props:
      style: "compact"
      temp_icon: "assets/images/temp.png"
      hum_icon: "assets/images/hum.png"
      x: 24
      y: 130
      width: 220
      height: 112
      title: "Climate"
```

## Workflow

Open the app directly:

```bash
xdg-open index.html
```

Or serve it as any static site if preferred.

In the app you can:

- choose a board model and rotation
- set `device_name` and optional `friendly_name`
- set Wi-Fi SSID and password
- set the LVGL screen background color
- drag and resize widgets
- edit the page through the visual editor
- inspect or paste YAML in the spec text area when needed
- generate the final ESPHome YAML locally in the browser
- download either the spec YAML or the final ESPHome YAML
- keep separate local browser cache for each supported HMI board

The board-specific ESPHome base templates are embedded in `src/app/esphome.js`.

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

## Notes

- The editor can generate the final ESPHome YAML entirely in the browser.
- The editor automatically regenerates the final ESPHome YAML as you edit.
- The browser caches editor state locally per HMI board and restores it on the next visit.
- If `friendly_name` is empty, the generated YAML uses `device_name.toUpperCase()`.
- Screen background color is generated as `lvgl.bg_color`.
- The repository no longer depends on the old Python generator for normal use.
- Validation with `esphome config` is still useful when available, but it is external to this repo's main workflow.
