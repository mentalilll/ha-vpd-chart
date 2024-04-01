import { methods } from './methods.js';
import { chart } from './chart.js';
import { bar } from './bar.js';
import { ghostmap } from './ghostmap.js';

class HaVpdChart extends HTMLElement {
    _hass = {};
    static get properties() {
        return {
            sensors: {type: Array},
            min_temperature: {type: Number},
            max_temperature: {type: Number},
            min_humidity: {type: Number},
            max_humidity: {type: Number},
            steps_temperature: {type: Number},
            steps_humidity: {type: Number},
            vpd_phases: {type: Array},
            air_text: {type: String},
            rh_text: {type: String},
            enable_tooltip: {type: Boolean},
            is_bar_view: {type: Boolean},
            enable_axes: {type: Boolean},
            enable_ghostmap: {type: Boolean},
            enable_triangle: {type: Boolean},
        };
    }

    constructor() {

        super();
        this.vpd_phases = [
            {upper: 0, className: 'gray-danger-zone'},
            {lower: 0, upper: 0.4, className: 'under-transpiration'},
            {lower: 0.4, upper: 0.8, className: 'early-veg'},
            {lower: 0.8, upper: 1.2, className: 'late-veg'},
            {lower: 1.2, upper: 1.6, className: 'mid-late-flower'},
            {lower: 1.6, className: 'danger-zone'},
        ];
        this.sensors = [];
        this.is_bar_view = false;
        this.min_temperature = 5;
        this.max_temperature = 35;
        this.min_humidity = 10;
        this.max_humidity = 90;
        this.steps_temperature = .5;
        this.steps_humidity = 1;
        this.enable_tooltip = true;
        this.air_text = "Air";
        this.rh_text = "RH";
        this.enable_axes = true;
        this.enable_ghostmap = true;
        this.enable_triangle = false;
    }

    set hass(hass) {
        this._hass = hass;
        this.is_bar_view ? this.buildBarChart() : this.buildChart();
    }
    setConfig(config) {
        this.config = config;
        if (!config.sensors) {
            throw new Error('You need to define sensors');
        }

        if('vpd_phases' in config) {
            this.vpd_phases = config.vpd_phases;
        }
        if('sensors' in config) {
            this.sensors = config.sensors;
        }
        if('air_text' in config) {
            this.air_text = config.air_text;
        }
        if('rh_text' in config) {
            this.rh_text = config.rh_text;
        }
        if('min_temperature' in config) {
            this.min_temperature = config.min_temperature;
        }
        if('max_temperature' in config) {
            this.max_temperature = config.max_temperature;
        }
        if('min_humidity' in config) {
            this.min_humidity = config.min_humidity;
        }
        if('max_humidity' in config) {
            this.max_humidity = config.max_humidity;
        }
        if('steps_temperature' in config) {
            this.steps_temperature = config.steps_temperature;
        }
        if('steps_humidity' in config) {
            this.steps_humidity = config.steps_humidity;
        }
        if('is_bar_view' in config) {
            this.is_bar_view = config.is_bar_view;
        }
        if('enable_axes' in config) {
            this.enable_axes = config.enable_axes;
        }
        if('enable_ghostmap' in config) {
            this.enable_ghostmap = config.enable_ghostmap;
        }
        if('enable_tooltip' in config) {
            this.enable_tooltip = config.enable_tooltip;
        }
    }

    getCardSize() {
        return 3;
    }
}
Object.assign(HaVpdChart.prototype, methods );
Object.assign(HaVpdChart.prototype, chart);
Object.assign(HaVpdChart.prototype, bar);
Object.assign(HaVpdChart.prototype, ghostmap);

customElements.define('ha-vpd-chart', HaVpdChart);
window.customCards = window.customCards || [];
window.customCards.push({
    type: "ha-vpd-chart",
    name: "Home Assistant VPD Chart",
    preview: false, // Optional - defaults to false
    description: "A custom card to display VPD values in a table",
    documentationURL: "https://github.com/mentalilll/ha-vpd-chart", // Adds a help link in the frontend card editor
});
console.groupCollapsed("%c HA-VPD-CHART Installed", "color: green; background: black; font-weight: bold;");
console.log('Readme: ', 'https://github.com/mentalilll/ha-vpd-chart');
console.groupEnd()
