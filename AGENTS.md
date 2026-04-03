# Project Rules For Future AI

This directory is now a pure HTML project for generating ESPHome YAML.

The product is the standalone browser editor:

- visual spec editing
- LVGL-style preview
- final ESPHome YAML generation in the browser

The old Python build pipeline is not part of the normal workflow anymore.

## Project Intent

- Generate complete ESPHome YAML from the browser app.
- Add UI features through the editor/spec layer in `src/app/`.
- Keep the HTML preview and generated YAML behavior aligned.
- Keep the HTML preview visually close enough to LVGL that users are not misled.
- Do not turn this repo back into a mixed Python build tool unless explicitly requested.

## Project Structure

- `index.html`
  Main app shell and inspector UI.
- `src/app.js`
  Browser entry module. It loads the editor app.
- `src/app/main.js`
  Main UI wiring, event handling, local cache restore/save, and overall editor coordination.
- `src/app/spec.js`
  State initialization, spec parsing/export, normalization, and shared data-model helpers.
- `src/app/preview.js`
  Canvas preview rendering, entity list rendering, inspector rendering, and preview helpers.
- `src/app/esphome.js`
  Board templates and final ESPHome YAML generation.
- `src/app/constants.js`
  Board metadata, widget constants, and entity capability definitions.
- `assets/css/styles.css`
  App styling and preview styling.
- `mdi:thermometer`
  Example default temperature icon.
- `https://l2063610646.github.io/tools/humi.png`
  Example default humidity icon.

## Current Data Model

- Top-level page settings may include:
  `base_config`, `rotation`, `device`, `wifi`, and `screen`.
- `device.name`
  Maps to generated ESPHome `substitutions.device_name`.
- `device.friendly_name`
  Optional. If missing, generated output should use `device.name.toUpperCase()`.
- `wifi.ssid` and `wifi.password`
  Map to generated ESPHome Wi-Fi substitutions.
- `screen.bg_color`
  Maps to generated `lvgl.bg_color`.
- `type: switch`
  Uses one `entityid`.
- `type: thermo_hygrometer`
  Uses exactly two `entityids`, ordered as temperature sensor then humidity sensor.
- Common widget metadata lives in `props`.

Current style support:

- `switch.props.style: toggle`
- `switch.props.style: button`
- `thermo_hygrometer.props.style: compact`

When adding more built-in styles, prefer extending `props.style` instead of creating a new widget type unless the interaction model is genuinely different.

## Layering Rules

Work from top to bottom.

1. Spec contract
   The compact YAML shape exposed by the editor.
2. Editor logic
   `src/app/` parsing, normalization, preview rendering, board templates, and final YAML generation.
3. Editor UI
   `index.html` and `assets/css/styles.css`.

Do not add a separate generator implementation unless the user explicitly asks for one.

## Safe Change Zones

Normal feature work should stay inside:

- `index.html`
- `src/app.js`
- `src/app/*.js`
- `assets/css/styles.css`
- `README.md`

## Preview Fidelity Rule

For UI styling work, treat the generated YAML and intended LVGL result as the source of truth.

- Keep the preview close in card shape, spacing, borders, and control styling.
- Avoid strong gradients, heavy shadows, glass effects, or layered browser-only styling that LVGL cannot represent closely.
- If a visual choice cannot be represented reasonably in LVGL, simplify the preview.

The preview does not need pixel-perfect parity, but it must not materially overpromise the device result.

## Style Variant Rule

Style variants are allowed, but they must stay systematic.

- Add variants through `props.style`.
- Do not hardcode behavior based on specific entity IDs.
- A new style is not complete until the editor can:
  parse it,
  edit it,
  preview it,
  export it in spec YAML,
  and generate the correct final ESPHome YAML.
- Update documentation and example spec data in the same task when useful.

## Board Template Rule

Board-specific base YAML now lives inside `src/app/esphome.js`.

If a board changes:

- update `BOARD_CONFIGS`
- update the matching `renderNextion...Base()` function
- keep rotation behavior and preview dimensions aligned
- preserve support for page-level device, Wi-Fi, and screen settings in generated output

Do not make silent hardware decisions outside those explicit board template sections.

## Implementation Checklist For Future AI

When implementing a new widget style or layout variant:

1. Update the spec contract first.
2. Update parsing and normalization in `src/app/spec.js`.
3. Update final YAML generation in `src/app/esphome.js`.
4. Update preview rendering in `src/app/preview.js`.
5. Update inspector controls in `index.html` if needed.
6. Update styling in `assets/css/styles.css`.
7. Update example spec or docs when helpful.

## Expected Workflow

For most work:

1. Read the current editor behavior in `src/app/main.js` and the relevant modules in `src/app/`.
2. Update the spec contract and preview together.
3. Update final YAML generation in the same task.
4. Keep the preview and generated output aligned.

## Validation Standard

Before concluding work, sanity-check the browser-side generation path.

If external `esphome config` validation is available and relevant, use it.
If it cannot be run, say so explicitly.

## Decision Rule For Future AI

If the request is "add UI", "bind HA entity", "move widgets", "add page logic", or "change generated output":

- work in the editor files first
- keep the compact spec contract coherent
- keep preview behavior and final YAML generation in sync
