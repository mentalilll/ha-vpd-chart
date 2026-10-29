# Changelog

## 3.1.0 (2026-10-29)

### New
- `enable_wheel_zoom`: zoom with the mouse wheel alone, like 2.x (off by default: Ctrl / ⌘ + wheel). Also in the editor under Features.
- Panning works with the left or right mouse button, like in 2.x.

### Maintenance
- Removed the unused build dependency `@rollup/plugin-node-resolve` (fixes a Dependabot alert for `deepmerge`). The card itself is unchanged by this.

## 3.0.0 (2026-10-27)

### Breaking changes
- The card is now a single bundled file (`dist/ha-vpd-chart.js`) and renders inside a shadow DOM. Styles from `card-mod` that targeted inner classes need to be adjusted.
- Zooming with the mouse wheel now needs **Ctrl** (or ⌘) so the dashboard can be scrolled normally. Pinch zoom works on touch devices.
- `antialiasing` is no longer needed (the background is drawn on a canvas in full resolution) and is ignored.
- Phase borders: a value exactly on a border now belongs to the upper phase (`0.4` → `early-veg`), as documented.
- Default texts (Air, RH, Leaf) follow the language of Home Assistant unless set in the config.

### New
- All rooms are shown at the same time; hover, tap or the legend highlights a room and switches the background to its leaf temperature.
- History trail (`history_hours`) based on long term statistics with fallback to the state history, plus **time in phase** statistics in chart and bar view.
- `target_phase` per room: yellow warning badge at the marker and a warning in the tooltip when the VPD is outside the target phase.
- `enable_dewpoint`: dew point in the tooltip and a condensation warning when the leaf gets close to it.
- `enable_mold_risk`: warning when the humidity stayed above `mold_risk_humidity` (75 %) for `mold_risk_hours` (6 h) in a row.
- Clearer markers: solid room colour with white border (dot or triangle), the selected room is larger, a yellow warning triangle marks a missed target phase or condensation risk, a red "!" marks mould risk.
- Stable tooltip layout: selecting or hovering a room never moves the other tooltips.
- With `enable_show_always_information: false` all tooltips start collapsed; only the hovered / selected room expands.
- Mould risk is shown in red in the tooltip (below the other warnings, or under the name when collapsed) and in the bar view.
- Redesigned tooltips: room colour, large VPD value, phase chip, value grid, warnings, numbers in the local format. Tooltips avoid each other, the markers and the legend, and move beside the marker in low cards.
- `tap_action: more-info` opens the entity details of a room.
- Phase `label` for display names (the `className` stays the technical key).
- `color` per room.
- Touch support: pinch zoom, drag to pan, tap to select.
- New visual editor based on Home Assistant's own form components, entity pickers filtered by device class, touch friendly phase slider, live validation of custom formulas.
- Card picker preview, `getGridOptions` for sections dashboards.
- Proper translations for Czech and Ukrainian.
- VPD template sensor example (`examples/vpd_sensor.yaml`) and an automation blueprint for humidifiers and dehumidifiers (`blueprints/automation/mentalilll/vpd_humidifier.yaml`).

### Fixed
- Fahrenheit sensors were rendered on a Celsius background.
- Event listeners piled up on every state change (memory leak) and the card re-rendered on every Home Assistant state change.
- Crashes with missing/unavailable sensors, empty room names in the bar view and invalid custom formulas.
- Config changes in the editor were not applied until reload.
- Tooltips ended up in the wrong place when the card was resized.
- Room cycling kept running after the card was removed and could switch to rooms without data.
