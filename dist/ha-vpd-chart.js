// Set version for the card
window.vpdChartVersion = "1.4.0";

import {methods} from './methods.js';
import {chart} from './chart.js';
import {bar} from './bar.js';
import {ghostmap} from './ghostmap.js';
import {HaVpdChartEditor} from './ha-vpd-chart-editor.js';

const DEFAULT_UNIT_TEMPERATURE = '°C';
const FAHRENHEIT_UNIT_TEMPERATURE = '°F';
const CONFIG_KEYS = [
    'vpd_phases', 'sensors', 'air_text', 'rh_text', 'kpa_text', 'min_temperature',
    'max_temperature', 'min_humidity', 'max_humidity', 'min_height',
    'is_bar_view', 'enable_axes', 'enable_ghostclick', 'enable_ghostmap', 'enable_triangle',
    'enable_tooltip', 'enable_crosshair', 'enable_fahrenheit', 'ghostmap_hours',
    'unit_temperature', 'enable_zoom'
];

class HaVpdChart extends HTMLElement {
    constructor() {
        super();
        this.initializeDefaults();
    }

    initializeDefaults() {
        this.vpd_phases = [
            {upper: 0, className: 'gray-danger-zone', color: '#999999'},
            {lower: 0, upper: 0.4, className: 'under-transpiration', color: '#1a6c9c'},
            {lower: 0.4, upper: 0.8, className: 'early-veg', color: '#22ab9c'},
            {lower: 0.8, upper: 1.2, className: 'late-veg', color: '#9cc55b'},
            {lower: 1.2, upper: 1.6, className: 'mid-late-flower', color: '#e7c12b'},
            {lower: 1.6, className: 'danger-zone', color: '#ce4234'},
        ];
        this.sensors = [];
        this.is_bar_view = false;
        this.min_temperature = 5;
        this.max_temperature = 35;
        this.min_humidity = 10;
        this.max_humidity = 90;
        this.min_height = 200;
        this.leaf_temperature_offset = 2;
        this.steps_temperature = .1;
        this.steps_humidity = .1;
        this.enable_tooltip = true;
        this.air_text = "Air";
        this.rh_text = "RH";
        this.kpa_text = "kPa";
        this.enable_axes = true;
        this.enable_ghostclick = true;
        this.enable_ghostmap = true;
        this.enable_triangle = false;
        this.enable_crosshair = false;
        this.enable_fahrenheit = false;
        this.enable_zoom = false;
        this.updateRunning = false;
        this.configMemory = {};
        this.ghostmap_hours = 24;
        this.unit_temperature = DEFAULT_UNIT_TEMPERATURE;
        this.clickedTooltip = false;
    }

    static get properties() {
        return {
            sensors: {type: Array},
            min_temperature: {type: Number},
            max_temperature: {type: Number},
            min_humidity: {type: Number},
            max_humidity: {type: Number},
            leaf_temperature_offset: {type: Number},
            min_height: {type: Number},
            vpd_phases: {type: Array},
            air_text: {type: String},
            rh_text: {type: String},
            kpa_text: {type: String},
            enable_tooltip: {type: Boolean},
            is_bar_view: {type: Boolean},
            enable_axes: {type: Boolean},
            enable_ghostclick: {type: Boolean},
            enable_ghostmap: {type: Boolean},
            enable_triangle: {type: Boolean},
            enable_crosshair: {type: Boolean},
            enable_fahrenheit: {type: Boolean},
            enable_zoom: {type: Boolean},
            configMemory: {type: Object},
            calculateVPD: {type: Function},
            ghostmap_hours: {type: Number},
            unit_temperature: {type: String},
        };
    }

    _hass = {};

    set hass(hass) {
        this._hass = hass;
        this.updateChartView();
        this.updateTemperatureUnit();
    }

    updateChartView() {
        this.is_bar_view ? this.buildBarChart() : this.buildChart();
    }

    updateTemperatureUnit() {
        this.unit_temperature = this.config.enable_fahrenheit ? FAHRENHEIT_UNIT_TEMPERATURE : DEFAULT_UNIT_TEMPERATURE;
    }

    static getConfigElement() {
        return document.createElement("ha-vpd-chart-editor");
    }

    setConfig(config) {
        this.config = config;

        if (!config.sensors) {
            throw new Error('You need to define sensors');
        }

        CONFIG_KEYS.forEach(key => {
            if (key in config) {
                this[key] = config[key];
            }
        });

        if (this.config.calculateVPD) {
            this.calculateVPD = new Function('Tleaf', 'Tair', 'RH', this.config.calculateVPD);
        }
    }
}

Object.assign(HaVpdChart.prototype, methods);
Object.assign(HaVpdChart.prototype, chart);
Object.assign(HaVpdChart.prototype, bar);
Object.assign(HaVpdChart.prototype, ghostmap);
Object.assign(HaVpdChart.prototype, HaVpdChartEditor);

customElements.define('ha-vpd-chart', HaVpdChart);
window.customCards = window.customCards || [];
window.customCards.push({
    type: "ha-vpd-chart",
    name: "Home Assistant VPD Chart",
    preview: false, // Optional - defaults to false
    description: "A custom card to display VPD values in a table",
    documentationURL: "https://github.com/mentalilll/ha-vpd-chart", // Adds a help link in the frontend card editor
});
console.groupCollapsed(`%c HA-VPD-CHART v${window.vpdChartVersion} Installed`, "color: green; background: black; font-weight: bold;");
console.log('Readme: ', 'https://github.com/mentalilll/ha-vpd-chart');
console.groupEnd();