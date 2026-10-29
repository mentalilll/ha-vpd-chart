# VPD Chart for Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Default-41BDF5.svg)](https://hacs.xyz)
[![Validate](https://github.com/mentalilll/ha-vpd-chart/actions/workflows/validate.yaml/badge.svg)](https://github.com/mentalilll/ha-vpd-chart/actions/workflows/validate.yaml)
[![Release](https://img.shields.io/github/v/release/mentalilll/ha-vpd-chart?include_prereleases)](https://github.com/mentalilll/ha-vpd-chart/releases)

A Lovelace card that shows the **vapour pressure deficit (VPD)** of your grow tents and rooms: where the climate is right now, where it has been, how long it stayed in each growth phase, and when it needs your attention.

![VPD Chart](https://github.com/mentalilll/ha-vpd-chart/blob/main/assets/demo.gif?raw=true)

## Features

- **VPD chart** (temperature × humidity) with your own phases, borders and colours
- **Several rooms** in one chart, each with its own colour. Hover, tap or use the legend to select one
- **Leaf temperature** from an IR sensor, a fixed offset or an `input_number`
- **History trail** of the last hours and **time in phase** statistics, from Home Assistant's long term statistics
- **Target phase** per room, with a warning when the room leaves it
- **Mould risk** warning when the humidity stayed high for too long (optional)
- **Dew point** and condensation warning (optional)
- **Bar view** as a compact overview, light and dark theme
- Celsius and Fahrenheit, numbers in your locale
- Zoom (Ctrl + mouse wheel or optionally the wheel alone, pinch on touch devices) and pan
- Visual editor, 10 languages
- [VPD template sensor and humidifier blueprint](#vpd-sensor-and-humidifier-automation) included

> [!TIP]
> Want to **control** your climate, not just see it? This repo also ships a ready-to-use [VPD template sensor](examples/vpd_sensor.yaml) and an [automation blueprint](blueprints/automation/mentalilll/vpd_humidifier.yaml) for humidifiers and dehumidifiers. See [VPD sensor and humidifier automation](#vpd-sensor-and-humidifier-automation).

## Screenshots

| Chart with history, target phase and mould warning | Bar view |
|---|---|
| ![Chart](https://github.com/mentalilll/ha-vpd-chart/blob/main/assets/chart.png?raw=true) | ![Bar view](https://github.com/mentalilll/ha-vpd-chart/blob/main/assets/bar_view.png?raw=true) |
| **Bar view, light theme** | **Visual editor** |
| ![Bar view light](https://github.com/mentalilll/ha-vpd-chart/blob/main/assets/bar_view_light.png?raw=true) | ![Editor](https://github.com/mentalilll/ha-vpd-chart/blob/main/assets/settings.png?raw=true) |

## Installation

### HACS (recommended)

[![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=mentalilll&repository=ha-vpd-chart&category=plugin)

Or open HACS, search for **VPD Chart**, download it and reload the browser.

### Manual

1. Download `ha-vpd-chart.js` from the [latest release](https://github.com/mentalilll/ha-vpd-chart/releases).
2. Copy it to `<config>/www/community/ha-vpd-chart/ha-vpd-chart.js`.
3. Add the resource: **Settings → Dashboards → ⋮ → Resources → Add resource**, URL `/local/community/ha-vpd-chart/ha-vpd-chart.js`, type **JavaScript module**.
4. Reload the browser (Ctrl + F5).

## Usage

Add the card from the card picker (**VPD Chart**) and set it up in the visual editor: rooms with sensor pickers, feature toggles, history and mould settings, and a slider for the phase borders (see [Screenshots](#screenshots)). Or use YAML:

```yaml
type: custom:ha-vpd-chart
rooms:
  - name: Tent 1
    temperature: sensor.tent1_temperature
    humidity: sensor.tent1_humidity
    leaf_temperature: sensor.tent1_leaf_temperature   # optional IR sensor
    target_phase: late-veg                            # optional
  - name: Tent 2
    temperature: sensor.tent2_temperature
    humidity: sensor.tent2_humidity
history_hours: 24
enable_mold_risk: true
enable_dewpoint: true
```

Bar view:

```yaml
type: custom:ha-vpd-chart
is_bar_view: true
history_hours: 24
rooms:
  - name: Tent 1
    temperature: sensor.tent1_temperature
    humidity: sensor.tent1_humidity
```

Fahrenheit works automatically when the temperature sensor reports `°F`. If no range is configured, the chart then uses 41–95 °F.

### Reading the chart

| Marker | Meaning |
|---|---|
| ▼ / ● in the room colour | Current climate of the room. The tip of the triangle is the measured point |
| Yellow ⚠ at the marker | Target phase missed or condensation risk. The reason is listed in the tooltip |
| Red **!** at the marker | Mould risk. A red line in the tooltip says how long the humidity was too high |
| Small dots and line | History trail of the selected room (`history_hours`) |

**Tooltips:** with `enable_show_always_information: true` every room shows its details as long as there is room for them; otherwise all tooltips are compact. With `false` the tooltips stay compact until you hover or select a room. Tooltips avoid each other, the markers and the legend, and move to the side of the marker when the card is low.

**Interaction:** hover a marker or legend chip to highlight a room, click it to keep the selection, click again to release it. Zoom with Ctrl / ⌘ + mouse wheel (or the wheel alone with `enable_wheel_zoom`) or pinch, drag with the left or right mouse button to pan, double click (or the reset button) to reset the zoom. With `tap_action: more-info` a click opens the entity details instead.

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `rooms` | list | **required** | Rooms, see below |
| `is_bar_view` | boolean | `false` | Compact bar view instead of the chart |
| `min_temperature` / `max_temperature` | number | `5` / `35` (`41` / `95` for °F) | Temperature range of the chart |
| `min_humidity` / `max_humidity` | number | `10` / `90` | Humidity range of the chart |
| `min_height` | number | `200` | Minimum chart height in px |
| `leaf_temperature_offset` | number \| entity | `2` | Leaf is this much colder than the air (rooms without leaf sensor). Number or entity id, in the unit of the sensor |
| `history_hours` | number | `0` | Hours of history for the trail and the phase statistics, `0` = off |
| `enable_phase_stats` | boolean | `true` | Show time in phase (needs `history_hours`) |
| `enable_mold_risk` | boolean | `false` | Mould risk warning when the humidity stayed at or above `mold_risk_humidity` for at least `mold_risk_hours` in a row |
| `mold_risk_humidity` | number | `75` | Humidity threshold in % for the mould risk |
| `mold_risk_hours` | number | `6` | Uninterrupted hours above the threshold that trigger the warning |
| `enable_dewpoint` | boolean | `false` | Dew point in the tooltip and condensation warning (leaf less than 1 °C / 1.8 °F above the dew point) |
| `enable_tooltip` | boolean | `true` | Tooltips at the room markers |
| `enable_show_always_information` | boolean | `true` | Details in every tooltip; `false` = compact until hovered or selected |
| `enable_legend` | boolean | `true` | Room legend |
| `enable_axes` | boolean | `true` | Grid and axis labels |
| `enable_triangle` | boolean | `true` | Triangle marker (tip on the measured point) instead of a dot |
| `enable_crosshair` | boolean | `true` | Crosshair with VPD readout following the mouse |
| `enable_zoom` | boolean | `true` | Zoom and pan |
| `enable_wheel_zoom` | boolean | `false` | Zoom with the mouse wheel alone, like 2.x. The page then does not scroll while the mouse is over the chart. Off: Ctrl / ⌘ + mouse wheel |
| `enable_cycle_rooms` | boolean | `false` | Select the next room every 10 seconds |
| `tap_action` | `none` \| `more-info` | `none` | A tap selects the room (`none`) or opens the entity details |
| `air_text`, `rh_text`, `leaf_text`, `kpa_text` | string | translated | Labels in the tooltip, `""` hides a label |
| `vpd_phases` | list | see below | Phases with borders and colours |
| `calculateVPD` | string | built in | Custom formula (function body), variables `Tleaf`, `Tair`, `RH`, `unit_of_measurement` |

#### Room options

| Option | Type | Description |
|---|---|---|
| `temperature` | entity | **Required.** Air temperature |
| `humidity` | entity | **Required.** Relative humidity |
| `name` | string | Display name |
| `leaf_temperature` | entity | Leaf temperature (e.g. IR sensor), replaces the offset |
| `vpd` | entity | Existing VPD sensor, used instead of the calculated value |
| `target_phase` | string | `className` or `label` of the phase this room should be in |
| `color` | string | Colour of the marker, e.g. `#56b4e9`. Without it, the room gets a colour from a colour-blind safe palette |

#### VPD phases

```yaml
vpd_phases:
  - upper: 0
    className: gray-danger-zone
    color: "#999999"
  - lower: 0
    upper: 0.4
    className: under-transpiration
    label: Under transpiration    # optional display name
    color: "#1a6c9c"
  - lower: 0.4
    upper: 0.8
    className: early-veg
    color: "#22ab9c"
  - lower: 0.8
    upper: 1.2
    className: late-veg
    color: "#9cc55b"
  - lower: 1.2
    upper: 1.6
    className: mid-late-flower
    color: "#e7c12b"
  - lower: 1.6
    className: danger-zone
    color: "#ce4234"
```

A value exactly on a border belongs to the upper phase (`lower` is inclusive, `upper` exclusive). In the editor you can drag the borders with a slider.

### History and mould risk

The trail and the phase statistics use Home Assistant's **long term statistics** (5 minute means up to 48 h, hourly means above). They exist for sensors with a `state_class` (most temperature and humidity sensors). For other entities, e.g. `input_number`, the card falls back to the recorder history, which is limited by your `purge_keep_days`.

The mould risk looks at the same data (the last 24 h when `history_hours` is `0`), so it works without showing the trail. It is a rule of thumb, not a measurement: long periods above roughly 75 % RH make mould likely, especially in dense flowers.

### Custom VPD formula

```yaml
# air VPD without leaf temperature
calculateVPD: |
  const svp = 0.61078 * Math.exp(17.27 * Tair / (Tair + 237.3));
  return svp * (1 - RH / 100);
```

The editor checks the formula while you type. If it fails at runtime, the card falls back to the built-in formula.

## VPD sensor and humidifier automation

The card only displays. To use the VPD in automations, two templates are included.

**VPD template sensor:** [`examples/vpd_sensor.yaml`](examples/vpd_sensor.yaml) calculates the VPD with the same formula as the card (leaf sensor or offset, °C and °F). Create it as a template helper in the UI (**Settings → Devices & services → Helpers → Template sensor**, paste the state template) or copy it into your configuration as YAML. With long term statistics enabled (`state_class: measurement`), you can also pass it to the card as `vpd:` of a room.

**Humidifier blueprint:** keeps the VPD in a range by switching a humidifier and optionally a dehumidifier, with hysteresis, a maximum humidity as mould protection and an optional "only while the light is on" condition.

[![Import blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmentalilll%2Fha-vpd-chart%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fmentalilll%2Fvpd_humidifier.yaml)

| Input | Default | Description |
|---|---|---|
| VPD sensor | | Any sensor with the VPD in kPa |
| Humidifier / Dehumidifier | | `humidifier`, `switch`, `fan`, `input_boolean` or `light` entities |
| Humidifier on above / off at | `1.2` / `1.0` kPa | Too dry → humidifier on, until the VPD dropped to the lower value |
| Dehumidifier on below / off at | `0.6` / `0.8` kPa | Too humid → dehumidifier on, until the VPD rose to the upper value |
| Maximum humidity | `75` % | The humidifier never runs at or above this humidity (needs a humidity sensor) |
| Only while on | | e.g. the grow light; outside of it, the devices are left alone |

## Troubleshooting

- **The card still looks like the old version:** reload the browser with Ctrl + F5. In the browser console the card prints `HA-VPD-CHART v<version>`. For manual installations add a version to the resource URL, e.g. `/local/community/ha-vpd-chart/ha-vpd-chart.js?v=3.0.0`.
- **No trail or phase statistics:** set `history_hours`, and check that the sensors have a `state_class` (Developer tools → States). Without it, only the recorder history is used.
- **Room shows "unavailable":** one of its sensors has no numeric state.
- **Wrong VPD with °F sensors:** `leaf_temperature_offset` is in the unit of the sensor, so 2 °C correspond to 3.6 °F.

## Upgrading from 2.x

- The card is now a single file, `ha-vpd-chart.js`. HACS updates the resource; for manual installations change the resource URL.
- Mouse wheel zoom needs **Ctrl** (or ⌘), so your dashboard scrolls normally. For the 2.x behaviour set `enable_wheel_zoom: true`.
- The `antialiasing` option is ignored; the background is always drawn in full resolution.
- The card uses a shadow DOM. `card-mod` styles that targeted inner elements need to be adapted.
- Labels follow the Home Assistant language unless you set `air_text` etc. explicitly.

## Development

```bash
npm install
npm run watch     # rebuilds dist/ha-vpd-chart.js on change
npm run check     # lint, tests and production build
```

The source lives in `src/`, the bundle in `dist/` is what HACS installs. Please run `npm run build` before committing.

## License

[MIT](LICENSE)
