# HaVpdChart for Home Assistant
![HaVpdChart Image](https://github.com/mentalilll/ha-vpd-chart/blob/main/assets/image.png?raw=true)

![HaVpdChart Image](https://github.com/mentalilll/ha-vpd-chart/blob/main/assets/bar_view.png)

![HaVpdChart Image](https://github.com/mentalilll/ha-vpd-chart/blob/main/assets/bar_view_light.png)

`HaVpdChart` is a custom card component for Home Assistant that allows for visual representations of VPD (Vapour Pressure Deficit) based on temperature and humidity sensors. It's ideal for monitoring environmental conditions in tents or rooms.

## Prerequisites

- Home Assistant installation
- Basic knowledge of YAML and Home Assistant configuration

## Installation
### HACS Easy Installation
1. **Currently not available - still wait for accept pull request**

### HACS Installation
1. **Add Repository**
   
    Click `HACS` -> `Three Dot Menu upper right` -> `Custom Repository`
    -> `Category: Integration` | `Repositury Url: https://github.com/mentalilll/ha-vpd-chart`
   
3. **Install Plugin**
   
   Search for VPD within Integrations and install `ha-vpd-chart`
     

### From GitHub

1. **Clone the repository or download the JS file**

    First, you need to download the JavaScript file `ha-vpd-chart.js` from GitHub or clone the entire repository.

2. **Incorporate the file into Home Assistant**

    Copy `ha-vpd-chart.js` into your `www` directory of Home Assistant, typically located at `<config>/www/`.

3. **Add the resource in Home Assistant**

    Add the resource to your `configuration.yaml` or through the Home Assistant UI under `Configuration` -> `Lovelace Dashboards` -> `Resources`:

    ```yaml
    lovelace:
      resources:
        - url: /local/ha-vpd-chart.js
          type: module
    ```

    **Note:** After adding the resource, you may need to restart Home Assistant.

Follow the steps above to store the file locally and include it as a resource.

## Usage

Easy start as Chart View:
```yaml
type: custom:ha-vpd-chart
sensors:
  - temperature: sensor.temperature_2
    humidity: sensor.humidity_2
    name: Tent 1
  - temperature: sensor.temperature_tent_2
    humidity: sensor.humidity_tent_2
    name: Tent 2
```

Easy start as Bar View:
```yaml
type: custom:ha-vpd-chart
is_bar_view: true
sensors:
  - temperature: sensor.temperature_2
    humidity: sensor.humidity_2
    name: Tent 1
  - temperature: sensor.temperature_tent_2
    humidity: sensor.humidity_tent_2
    name: Tent 2
```

To use the `HaVpdChart` in your Lovelace dashboard, add the following configuration to your dashboard. Adjust the sensors and other options according to your setup:
```yaml
type: custom:ha-vpd-chart
air_text: Temp. #optional "" for Empty
rh_text: r.H. #optional "" for Empty
min_temperature: 5 #optional
max_temperature: 35 #optional
min_humidity: 10 #optional
max_humidity: 100 #optional
min_height: 200 #optional (minimum height of the chart as px)
is_bar_view: true #optional
enable_tooltip: true #optional
enable_axes: true #optional
enable_ghostmap: true #optional
enable_triangle: false #optional
sensors:
  - temperature: sensor.temperature_2
    humidity: sensor.humidity_2
    leaf_temperature: sensor.infrared_sensor #optional
    name: Tent 1
  - temperature: sensor.temperature_tent_2
    humidity: sensor.humidity_tent_2
    vpd: sensor.vpd #optional
    leaf_temperature_offset: 3 # optional and is ignored if leaf_temperature isset
    name: Tent 2
vpd_phases: #optional
  - upper: 0.4
    className: under-transpiration
  - lower: 0.4
    upper: 0.8
    className: early-veg
  - lower: 0.8 
    upper: 1.2
    className: late-veg
  - lower: 1.2
    upper: 1.6
    className: mid-late-flower
  - lower: 1.6
    className: danger-zone
```
## Configuration Parameters


| Name            | Type         | Required     | Default         | Description                                                                                         |
|-----------------| ------------ | ------------ |-----------------|-----------------------------------------------------------------------------------------------------|
| type            | string       | **required** |                 | Must be `custom:ha-vpd-chart`.                                                                      |
| air_text        | string       | optional     | `Air`           | The text used for temperature readings. Default is "Air".                                           |
| rh_text         | string       | optional     | `RH`            | The text used for humidity readings. Default is "RH".                                               |
| min_temperature | number       | optional     | `5`             | Minimum temperature in the chart. Default is 5.                                                     |
| min_humidity    | number       | optional     | `10`            | Minimum humidity in the chart. Default is 10.                                                       |
| max_temperature | number       | optional     | `35`            | Maximum temperature in the chart. Default is 35.                                                    |
| max_humidity    | number       | optional     | `90`            | Maximum humidity in the chart. Default is 90.                                                       |
| min_height      | number       | optional     | `200`           | Minimum height of the chart as px. Default is 200.                                                  |
| sensors         | list         | **required** |                 | A list of sensors with their temperature and humidity entity IDs, and an optional name for display. |
| vpd_phases      | list         | optional     | See description | A list of VPD phases and their classes for visual representation. See below for defaults.           |
| enable_tooltip  | boolean      | optional     | `true`          | Tooltip enabled by default.                                                                         |
| is_bar_view     | boolean      | optional     | `false`         | Second view of this chart for fast information of sensors                                           |
| enable_axes     | boolean      | optional     | `true`          | Enable Axes on the Chart                                                                            |
| enable_ghostmap | boolean      | optional     | `true`          | Enable Ghostmap on the Chart                                                                        |
| enable_triangle | boolean      | optional     | `true`          | Enable Triangle instead of Circle for tooltip marker                                                |

**Default `vpd_phases` Configuration:**
- `under-transpiration`: VPD < 0.4
- `early-veg`: 0.4 ≤ VPD < 0.8
- `late-veg`: 0.8 ≤ VPD < 1.2
- `mid-late-flower`: 1.2 ≤ VPD < 1.6
- `danger-zone`: VPD ≥ 1.6
