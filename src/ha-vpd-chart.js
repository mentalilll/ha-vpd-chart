import {methods} from './methods.js';
import {chart} from './chart.js';
import {bar} from './bar.js';
import {history} from './history.js';
import {getLanguage, translate} from './lang/index.js';
import {CARD_VERSION, DEFAULT_PHASES, DEFAULTS} from './const.js';
import './editor/editor.js';

const OPTION_KEYS = [
    ...Object.keys(DEFAULTS),
    'vpd_phases', 'air_text', 'leaf_text', 'rh_text', 'kpa_text', 'unit_temperature',
];
const NUMBER_KEYS = ['min_temperature', 'max_temperature', 'min_humidity', 'max_humidity', 'min_height', 'history_hours', 'mold_risk_humidity', 'mold_risk_hours'];

class HaVpdChart extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({mode: 'open'});
        this._lang = getLanguage('en');
        this.initializeDefaults();
    }

    initializeDefaults() {
        Object.assign(this, JSON.parse(JSON.stringify(DEFAULTS)));
        this.vpd_phases = JSON.parse(JSON.stringify(DEFAULT_PHASES));
        this.air_text = undefined;
        this.leaf_text = undefined;
        this.rh_text = undefined;
        this.kpa_text = undefined;
        this.unit_temperature = '°C';
        this.calculateVPD = methods.calculateVPD;
    }

    t(path, params) {
        return translate(this._lang, path, params);
    }

    set hass(hass) {
        const languageChanged = !this._hass || this._hass.language !== hass.language;
        this._hass = hass;
        if (languageChanged) {
            this._lang = getLanguage(hass.language);
            if (this._initialized) this.resetView();
        }
        if (!this.config) return;
        const relevant = this.hasRelevantChanges(hass);
        if (!languageChanged && !relevant) return;
        this.render();
    }

    get hass() {
        return this._hass;
    }

    /**
     * hass is set on every state change in Home Assistant. Only re-render when an
     * entity used by this card changed (state objects are immutable in HA).
     */
    snapshotStates(hass) {
        return this.getRelevantEntityIds().map(id => (hass && hass.states ? hass.states[id] : undefined));
    }

    hasRelevantChanges(hass) {
        const current = this.snapshotStates(hass);
        const previous = this._lastStates;
        this._lastStates = current;
        if (!previous || previous.length !== current.length) return true;
        return current.some((stateObj, index) => stateObj !== previous[index]);
    }

    getRelevantEntityIds() {
        const ids = [];
        (this.config.rooms || []).forEach(room => {
            ['temperature', 'humidity', 'leaf_temperature', 'vpd'].forEach(key => {
                if (room[key]) ids.push(room[key]);
            });
        });
        const offset = this.config.leaf_temperature_offset;
        if (typeof offset === 'string' && offset.includes('.') && !/^-?\d+([.,]\d+)?$/.test(offset.trim())) {
            ids.push(offset.trim());
        }
        return ids;
    }

    render() {
        if (!this._hass || !this.config) return;
        if (this.is_bar_view) {
            this.buildBarChart();
        } else {
            this.buildChart();
        }
    }

    connectedCallback() {
        if (this._hass && this.config) {
            this._lastStates = this.snapshotStates(this._hass);
            if (this._initialized === 'chart') this.observeResize();
            this.render();
        }
        this.startHistoryTimer();
    }

    disconnectedCallback() {
        this.stopRoomCycling();
        this.disconnectResizeObserver();
        this.stopHistoryTimer();
    }

    getCardSize() {
        if (this.is_bar_view) {
            return (this.config && this.config.rooms ? this.config.rooms.length : 1) + 1;
        }
        return Math.max(3, Math.ceil((this.min_height || 200) / 50) + (this.historyEnabled && this.historyEnabled() ? 2 : 1));
    }

    getGridOptions() {
        return {columns: 12, min_columns: 6, rows: 'auto', min_rows: this.is_bar_view ? 2 : 4};
    }

    static getConfigElement() {
        return document.createElement('ha-vpd-chart-editor');
    }

    static getStubConfig(hass) {
        const find = (deviceClass) => Object.keys((hass && hass.states) || {}).find(id => id.startsWith('sensor.')
            && hass.states[id].attributes && hass.states[id].attributes.device_class === deviceClass) || '';
        return {rooms: [{name: 'Tent 1', temperature: find('temperature'), humidity: find('humidity')}]};
    }

    setConfig(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Invalid configuration');
        }
        const newConfig = JSON.parse(JSON.stringify(config));
        if (!newConfig.rooms && newConfig.sensors) {
            newConfig.rooms = newConfig.sensors;
        }
        if (!Array.isArray(newConfig.rooms) || newConfig.rooms.length === 0) {
            throw new Error('You need to define at least one room (rooms: [...])');
        }
        newConfig.rooms.forEach((room, index) => {
            if (!room || typeof room !== 'object') throw new Error(`Room ${index + 1} is invalid`);
        });

        const configChanged = JSON.stringify(newConfig) !== JSON.stringify(this.config);
        this.config = newConfig;
        if (!configChanged) return;

        this.initializeDefaults();
        OPTION_KEYS.forEach(key => {
            if (key in newConfig && newConfig[key] !== undefined && newConfig[key] !== null) {
                this[key] = newConfig[key];
            }
        });
        NUMBER_KEYS.forEach(key => {
            const value = Number(this[key]);
            if (Number.isFinite(value)) this[key] = value;
        });
        if (this.min_temperature >= this.max_temperature) {
            throw new Error('min_temperature must be lower than max_temperature');
        }
        if (this.min_humidity >= this.max_humidity) {
            throw new Error('min_humidity must be lower than max_humidity');
        }
        if (!Array.isArray(this.vpd_phases) || this.vpd_phases.length === 0) {
            this.vpd_phases = JSON.parse(JSON.stringify(DEFAULT_PHASES));
        }

        this._vpdFormulaErrorLogged = false;
        if (newConfig.calculateVPD) {
            try {
                this.calculateVPD = new Function('Tleaf', 'Tair', 'RH', 'unit_of_measurement', newConfig.calculateVPD);
            } catch (error) {
                console.warn('HA-VPD-CHART: invalid calculateVPD formula, using the default formula.', error);
                this.calculateVPD = methods.calculateVPD;
            }
        }

        this.resetView();
        this.resetHistory();
        if (this.isConnected) this.startHistoryTimer();
        if (this._hass) {
            this._lastStates = this.snapshotStates(this._hass);
            this.render();
        }
    }

    /** Drop the rendered DOM; the next render builds the card from scratch. */
    resetView() {
        this.stopRoomCycling();
        this.disconnectResizeObserver();
        this.root.innerHTML = '';
        this._initialized = null;
        this.content = null;
        this.roomsEl = null;
        this.hoverIndex = null;
        this.pinnedIndex = null;
        this.cycleIndex = undefined;
        this._bgKey = null;
        this._gridKey = null;
    }
}

Object.assign(HaVpdChart.prototype, methods, history, chart, bar);
// the instance always holds the formula in use (default or custom)
HaVpdChart.prototype.calculateVPD = methods.calculateVPD;

if (!customElements.get('ha-vpd-chart')) {
    customElements.define('ha-vpd-chart', HaVpdChart);
}
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === 'ha-vpd-chart')) {
    window.customCards.push({
        type: 'ha-vpd-chart',
        name: 'VPD Chart',
        preview: true,
        description: 'Visualizes the vapour pressure deficit (VPD) of your grow rooms and tents',
        documentationURL: 'https://github.com/mentalilll/ha-vpd-chart',
    });
}
window.vpdChartVersion = CARD_VERSION;
console.info(`%c HA-VPD-CHART %c v${CARD_VERSION} `, 'color: white; background: #2e7d32; font-weight: bold;', 'color: #2e7d32; background: white; font-weight: bold;');

export {HaVpdChart};
