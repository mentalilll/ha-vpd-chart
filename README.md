# HaVpdChart for Home Assistant

`HaVpdChart` is a custom card component for Home Assistant that allows for visual representations of VPD (Vapour Pressure Deficit) based on temperature and humidity sensors. It's ideal for monitoring environmental conditions in tents or rooms.

## Prerequisites

- Home Assistant installation
- Basic knowledge of YAML and Home Assistant configuration

## Installation

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

### Local Installation

Follow the steps above to store the file locally and include it as a resource.

## Usage

To use the `HaVpdChart` in your Lovelace dashboard, add the following configuration to your dashboard. Adjust the sensors and other options according to your setup:

```yaml
type: custom:ha-vpd-chart
air_text: Temp.
rh_text: r.H.
min_temperature: 5
max_temperature: 35
min_humidity: 10
max_humidity: 100
steps_humidity: 1
steps_temperature: 0.5
sensors:
  - temperature: sensor.temperature_2
    humidity: sensor.humidity_2
    leafTemperature: sensor.infrared_sensor
    name: Tent 1
  - temperature: sensor.temperature_tent_2
    humidity: sensor.humidity_tent_2
    vpd: sensor.vpd
    name: Tent 2
vpd_phases:
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
- type: (required) Must be custom:ha-vpd-chart.
- air_text: (optional) The text used for temperature readings. Default is "Air".
- rh_text: (optional) The text used for humidity readings. Default is "RH".
- min_temperature: (optional) Minimum temperature in the chart
- min_humidity: (optional) Minimum humidity in the chart
- max_temperature: (optional) Maximum temperature in the chart
- max_humidity: (optional) Maximum humidity in the chart
- steps_temperature: (optional) Temperature resolution in the chart
- steps_humidity: (optional) Humidity resolution in the chart
- sensors: (required) A list of sensors with their temperature and humidity entity IDs, and an optional name for display.
- vpd_phases: (optional) A list of VPD phases and their classes for visual representation.

![Example Image](https://raw.githubusercontent.com/mentalilll/ha-vpd-chart/main/image.png?raw=true)


###############################################################################################################################################################################


# HaVpdChart für Home Assistant

`HaVpdChart` ist eine benutzerdefinierte Kartenkomponente für Home Assistant, die es ermöglicht, visuelle Darstellungen von VPD (Vapour Pressure Deficit) basierend auf Temperatur- und Feuchtigkeitssensoren zu erstellen. Ideal für die Überwachung von Umgebungsbedingungen in Zelten oder Räumen.

## Voraussetzungen

- Home Assistant Installation
- Grundkenntnisse in YAML und Home Assistant Konfiguration

## Installation

### Von GitHub

1. **Repository klonen oder JS-Datei herunterladen**

    Zuerst müssen Sie das JavaScript-File `ha-vpd-chart.js` von GitHub herunterladen oder das gesamte Repository klonen.

2. **Datei in Home Assistant einbinden**

    Kopieren Sie `ha-vpd-chart.js` in Ihr `www` Verzeichnis von Home Assistant, typischerweise unter `<config>/www/`.

3. **Resource in Home Assistant hinzufügen**

    Fügen Sie die Resource in Ihre `configuration.yaml` oder über die Home Assistant UI unter `Konfiguration` -> `Lovelace-Dashboards` -> `Ressourcen` hinzu:

    ```yaml
    lovelace:
      resources:
        - url: /local/ha-vpd-chart.js
          type: module
    ```

    **Hinweis:** Nachdem Sie die Resource hinzugefügt haben, müssen Sie möglicherweise Home Assistant neustarten.

### Lokale Installation

Folgen Sie den oben genannten Schritten, um die Datei lokal zu speichern und als Resource einzubinden.

## Anwendung

Um die `HaVpdChart` in Ihrem Lovelace-Dashboard zu nutzen, fügen Sie die folgende Konfiguration zu Ihrem Dashboard hinzu. Passen Sie die Sensoren und andere Optionen entsprechend Ihrer Konfiguration an:

```yaml
type: custom:ha-vpd-chart
air_text: Temp.
rh_text: r.F.
min_temperature: 5
max_temperature: 35
min_humidity: 10
max_humidity: 100
steps_humidity: 1
steps_temperature: 0.5
sensors:
  - temperature: sensor.temperatur_2
    humidity: sensor.luftfeuchtigkeit_2
    leafTemperature: sensor.infrared_sensor
    name: Zelt 1
  - temperature: sensor.temperatur_zelt_2
    humidity: sensor.luftfeuchtigkeit_zelt_2
    vpd: sensor.vpd
    name: Zelt 2
vpd_phases:
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
## Konfigurationsparameter
- type: (erforderlich) Muss custom:ha-vpd-chart sein.
- air_text: (optional) Der Text, der für Temperaturangaben verwendet wird. Standard ist "Air".
- rh_text: (optional) Der Text, der für Feuchtigkeitsangaben verwendet wird. Standard ist "RH".
- min_temperature: (optional) Minimale Temperatur im Chart
- min_humidity: (optional) Minimale Luftfeuchtigkeit im Chart
- max_temperature: (optional) Maximale Temperatur im Chart
- max_humidity: (optional) Maximale Luftfeuchtigkeit im Chart
- steps_temperature: (optional) Auflösung der Temperatur im Chart
- steps_humidity: (optional) Auflösung der Luftfeuchtigkeit im Chart
- sensors: (erforderlich) Eine Liste von Sensoren mit ihren temperature und humidity Entity-IDs sowie optionalen name zur Anzeige.
- vpd_phases: (optional) Eine Liste von VPD-Phasen und ihren Klassen zur visuellen Darstellung.

![Beispielbild](https://raw.githubusercontent.com/mentalilll/ha-vpd-chart/main/image.png?raw=true)

