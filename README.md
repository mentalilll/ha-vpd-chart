# VpdTableCard für Home Assistant

`VpdTableCard` ist eine benutzerdefinierte Kartenkomponente für Home Assistant, die es ermöglicht, visuelle Darstellungen von VPD (Vapour Pressure Deficit) basierend auf Temperatur- und Feuchtigkeitssensoren zu erstellen. Ideal für die Überwachung von Umgebungsbedingungen in Zelten oder Räumen.

## Voraussetzungen

- Home Assistant Installation
- Grundkenntnisse in YAML und Home Assistant Konfiguration

## Installation

### Von GitHub

1. **Repository klonen oder JS-Datei herunterladen**

    Zuerst müssen Sie das JavaScript-File `vpd-table-card.js` von GitHub herunterladen oder das gesamte Repository klonen.

2. **Datei in Home Assistant einbinden**

    Kopieren Sie `vpd-table-card.js` in Ihr `www` Verzeichnis von Home Assistant, typischerweise unter `<config>/www/`.

3. **Resource in Home Assistant hinzufügen**

    Fügen Sie die Resource in Ihre `configuration.yaml` oder über die Home Assistant UI unter `Konfiguration` -> `Lovelace-Dashboards` -> `Ressourcen` hinzu:

    ```yaml
    lovelace:
      resources:
        - url: /local/vpd-table-card.js
          type: module
    ```

    **Hinweis:** Nachdem Sie die Resource hinzugefügt haben, müssen Sie möglicherweise Home Assistant neustarten.

### Lokale Installation

Folgen Sie den oben genannten Schritten, um die Datei lokal zu speichern und als Resource einzubinden.

## Anwendung

Um die `VpdTableCard` in Ihrem Lovelace-Dashboard zu nutzen, fügen Sie die folgende Konfiguration zu Ihrem Dashboard hinzu. Passen Sie die Sensoren und andere Optionen entsprechend Ihrer Konfiguration an:

```yaml
type: custom:vpd-table-card
air_text: Temp.
rh_text: r.F.
sensors:
  - temperature: sensor.temperatur_2
    humidity: sensor.luftfeuchtigkeit_2
    name: Zelt 1
  - temperature: sensor.temperatur_zelt_2
    humidity: sensor.luftfeuchtigkeit_zelt_2
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
- type: (erforderlich) Muss custom:vpd-table-card sein.
- air_text: (optional) Der Text, der für Temperaturangaben verwendet wird. Standard ist "Air".
- rh_text: (optional) Der Text, der für Feuchtigkeitsangaben verwendet wird. Standard ist "RH".
- sensors: (erforderlich) Eine Liste von Sensoren mit ihren temperature und humidity Entity-IDs sowie optionalen name zur Anzeige.
- vpd_phases: (optional) Eine Liste von VPD-Phasen und ihren Klassen zur vis
