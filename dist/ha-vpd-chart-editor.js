export const fireEvent = (node, type, detail = {}, options = {}) => {
    const event = new Event(type, {
        bubbles: options.bubbles === undefined ? true : options.bubbles,
        cancelable: Boolean(options.cancelable),
        composed: options.composed === undefined ? true : options.composed,
    });

    event.detail = detail;
    node.dispatchEvent(event);
    return event;
};
import {methods} from './methods.js';
import {MultiRange} from './ha-vpd-chart-editor-multiRange.js';

export class HaVpdChartEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this._config = {};
        this.handles = {};
        this.segments = {};
        this.vpd_phases = {};
    }

    setConfig(config) {
        this._config = config;
    }

    set hass(hass) {
        this._hass = hass;
    }

    get _sensors() {
        return this._config.sensors || '';
    }

    get _air_text() {
        return this._config.air_text || '';
    }

    get _rh_text() {
        return this._config.rh_text || '';
    }

    get _kpa_text() {
        return this._config.kpa_text || '';
    }

    get _vpd_phases() {
        return this._config.vpd_phases !== undefined ? this._config.vpd_phases : [
            {lower: -0.6, upper: 0, className: 'gray-danger-zone', color: '#999999'},
            {lower: 0, upper: 0.4, className: 'under-transpiration', color: '#1a6c9c'},
            {lower: 0.4, upper: 0.8, className: 'early-veg', color: '#22ab9c'},
            {lower: 0.8, upper: 1.2, className: 'late-veg', color: '#9cc55b'},
            {lower: 1.2, upper: 1.6, className: 'mid-late-flower', color: '#e7c12b'},
            {lower: 1.6, className: 'danger-zone', color: '#ce4234'},
        ];
    }

    get _min_temperature() {
        return this._config.min_temperature !== undefined ? this._config.min_temperature : 5;
    }

    get _max_temperature() {
        return this._config.max_temperature !== undefined ? this._config.max_temperature : 35;
    }

    get _min_humidity() {
        return this._config.min_humidity !== undefined ? this._config.min_humidity : 0;
    }

    get _max_humidity() {
        return this._config.max_humidity !== undefined ? this._config.max_humidity : 100;
    }

    get _min_height() {
        return this._config.min_height !== undefined ? this._config.min_height : 200;
    }

    get _leaf_temperature_offset() {
        return this._config.leaf_temperature_offset !== undefined ? this._config.leaf_temperature_offset : 2;
    }

    get _is_bar_view() {
        return this._config.is_bar_view || false;
    }

    get _enable_axes() {
        return this._config.enable_axes !== undefined ? this._config.enable_axes : false;
    }

    get _enable_ghostmap() {
        return this._config.enable_ghostmap !== undefined ? this._config.enable_ghostmap : false;
    }

    get _enable_triangle() {
        return this._config.enable_triangle || false;
    }

    get _enable_crosshair() {
        return this._config.enable_crosshair || true;
    }

    get _enable_tooltip() {
        return this._config.enable_tooltip !== undefined ? this._config.enable_tooltip : false;
    }

    handleValueChange = (ev) => {
        const target = ev.target;
        const configValue = target.getAttribute('configvalue');
        let value = target.type === 'checkbox' ? target.checked : target.value;
        if (typeof value === 'string' && !isNaN(value)) {
            value = parseFloat(value);
        }

        if (isNaN(value)) {
            value = target.value;
        }

        if (value === "on") {
            value = true;
        }

        if (value === "off") {
            value = false;
        }
        if (this._config[configValue] !== value) {
            this._config[configValue] = value;
            fireEvent(this, 'config-changed', {config: this._config});
        }
    }
    handleVPDPhaseChange = (ev) => {
        const target = ev.target;
        const index = target.getAttribute('data-index');
        let value = target.value;
        if (this._vpd_phases[index].className !== value) {
            this._config.vpd_phases[index].className = value;
            fireEvent(this, 'config-changed', {config: this._config});
        }
    }

    static get properties() {
        return {
            hass: {},
            _config: {},
        };
    }

    connectedCallback() {
        this.render();
        this.initValues();
        this.initColorEditor();
        this.initAddButton();
        this.initFormulaEditor();
    }

    render() {
        this.shadowRoot.innerHTML = `<style>
@import '/hacsfiles/ha-vpd-chart/ha-vpd-chart-editor.css?v=${window.vpdChartVersion}'
</style>
<div class="vpd-chart-config">
    <table>
        <tr>
            <td>
                <ha-textfield style="width:100%;" label="Air Text" id="air_text" configvalue="air_text"></ha-textfield>
            </td>
            <td>
                <ha-textfield style="width:100%;" label="RH Text" id="rh_text" configvalue="rh_text"></ha-textfield>
            </td>
        </tr>
        <tr>
            <td>
                <ha-textfield style="width:100%;" label="kPa Text" id="kpa_text" configvalue="kpa_text"></ha-textfield>
            </td>
            <td>
                <ha-textfield style="width:100%;" pattern="[0-9]+([.][0-9]+)?" type="number" label="Min Height of Table" id="min_height" configvalue="min_height"></ha-textfield>
            </td>

        </tr>
        <tr>
            <td>
                <ha-textfield style="width:100%;" pattern="[0-9]+([.][0-9]+)?" type="number" label="Min Temperature" id="min_temperature" configvalue="min_temperature"></ha-textfield>
            </td>
            <td>
                <ha-textfield style="width:100%;" pattern="[0-9]+([.][0-9]+)?" type="number" label="Max Temperature" id="max_temperature" configvalue="max_temperature"></ha-textfield>
            </td>
        </tr>
        <tr>
            <td>
                <ha-textfield style="width:100%;" pattern="[0-9]+([.][0-9]+)?" type="number" label="Min Humidity" id="min_humidity" configvalue="min_humidity"></ha-textfield>
            </td>
            <td>
                <ha-textfield style="width:100%;" pattern="[0-9]+([.][0-9]+)?" type="number" label="Max Humidity" id="max_humidity" configvalue="max_humidity"></ha-textfield>
            </td>
        </tr>
        <tr>
            <td>
                <ha-textfield style="width:100%;" pattern="[0-9]+([.][0-9]+)?" type="number" label="Leaf Temperature offset" id="leaf_temperature_offset" configvalue="leaf_temperature_offset"></ha-textfield>
            </td>
        </tr>

        <tr>
            <td colspan="2">
                <hr>
            </td>
        </tr>
        <tr>
            <td>
                <div class="switch-item">
                    <input type="checkbox" id="is_bar_view" configvalue="is_bar_view">
                    <label for="is_bar_view">Bar View</label>
                </div>
            </td>
            <td>
                <div class="switch-item">
                    <input type="checkbox" id="enable_axes" configvalue="enable_axes">
                    <label for="enable_axes">Enable Axes</label>
                </div>
            </td>
        </tr>
        <tr>
            <td>
                <div class="switch-item">
                    <input type="checkbox" id="enable_ghostmap" configvalue="enable_ghostmap">
                    <label for="enable_ghostmap">Enable Ghostmap</label>
                </div>
            </td>
            <td>
                <div class="switch-item">
                    <input type="checkbox" id="enable_triangle" configvalue="enable_triangle">
                    <label for="enable_triangle">Enable Triangle</label>

                </div>
            </td>
        </tr>
        <tr>
            <td>
                <div class="switch-item">
                    <input type="checkbox" id="enable_tooltip" configvalue="enable_tooltip">
                    <label for="enable_tooltip">Enable Tooltip</label>
                </div>
            </td>
            <td>
                <div class="switch-item">
                    <input type="checkbox" id="enable_crosshair" configvalue="enable_crosshair">
                    <label for="enable_crosshair">Enable Mousehover Crosshair</label>
                </div>
            </td>
        </tr>
        <tr>
            <td colspan="2">
                <hr>
            </td>
        </tr>
        <tr>
            <td colspan="2">
                <div id="slider-container" class="slider-container">
                    <div id="slider-labels" class="slider-labels"></div>
                </div>
            </td>
        </tr>
        <tr>
            <td colspan="2">
                <div class="colorEditor"></div>
            </td>
        </tr>
        <tr>
            <td colspan="2">
                <hr>
            </td>
        </tr>
        <tr>
            <td colspan="2">
                <div class="formulaEditor"></div>
            </td>
        </tr>
    </table>
</div>

        `;
        this.shadowRoot.querySelectorAll('ha-textfield, ha-checkbox, label, input').forEach(input => {
            input.addEventListener('input', this.handleValueChange);
        });

    }

    initValues() {

        const sensors = this.shadowRoot.querySelector('#sensors');
        const airText = this.shadowRoot.querySelector('#air_text');
        const rhText = this.shadowRoot.querySelector('#rh_text');
        const kpaText = this.shadowRoot.querySelector('#kpa_text');
        const minTemperature = this.shadowRoot.querySelector('#min_temperature');
        const maxTemperature = this.shadowRoot.querySelector('#max_temperature');
        const minHumidity = this.shadowRoot.querySelector('#min_humidity');
        const maxHumidity = this.shadowRoot.querySelector('#max_humidity');
        const leafTemperatureOffset = this.shadowRoot.querySelector('#leaf_temperature_offset');
        const minHeight = this.shadowRoot.querySelector('#min_height');
        const isBarView = this.shadowRoot.querySelector('#is_bar_view');
        const enableAxes = this.shadowRoot.querySelector('#enable_axes');
        const enableGhostmap = this.shadowRoot.querySelector('#enable_ghostmap');
        const enableTriangle = this.shadowRoot.querySelector('#enable_triangle');
        const enableCrosshair = this.shadowRoot.querySelector('#enable_crosshair');
        const enableTooltip = this.shadowRoot.querySelector('#enable_tooltip');


        if (airText) airText.value = this._air_text;
        if (rhText) rhText.value = this._rh_text;
        if (kpaText) kpaText.value = this._kpa_text;
        if (minTemperature) minTemperature.value = this._min_temperature;
        if (maxTemperature) maxTemperature.value = this._max_temperature;
        if (minHumidity) minHumidity.value = this._min_humidity;
        if (maxHumidity) maxHumidity.value = this._max_humidity;
        if (leafTemperatureOffset) leafTemperatureOffset.value = this._leaf_temperature_offset;
        if (minHeight) minHeight.value = this._min_height;
        if (isBarView) isBarView.checked = this._is_bar_view;
        if (enableAxes) enableAxes.checked = this._enable_axes;
        if (enableGhostmap) enableGhostmap.checked = this._enable_ghostmap;
        if (enableTriangle) enableTriangle.checked = this._enable_triangle;
        if (enableCrosshair) enableCrosshair.checked = this._enable_crosshair;
        if (enableTooltip) enableTooltip.checked = this._enable_tooltip;

        const minVPD = this.toFixedNumber(this.calculateVPD(maxTemperature.value - leafTemperatureOffset.value, maxTemperature.value, maxHumidity.value));
        const maxVPD = this.toFixedNumber(this.calculateVPD(maxTemperature.value - leafTemperatureOffset.value, maxTemperature.value, minHumidity.value));

        let vpdPhases = this._vpd_phases;
        vpdPhases[0].lower = parseFloat(minVPD);
        vpdPhases[vpdPhases.length - 1].upper = maxVPD;

        this.vpd_phases = vpdPhases;
        const sliderContainer = this.shadowRoot.querySelector('#slider-container');

        let rangesArray = this.generateRangesArray(vpdPhases);

        let settings = {
            step: 0,
            min: parseFloat(vpdPhases[0].lower),
            max: parseFloat(vpdPhases[vpdPhases.length - 1].lower + 0.6),
            ranges: rangesArray,
        };

        this.multiRange = new MultiRange(sliderContainer, settings);

        this.multiRange.on("changed", (event) => {

            if (event.detail.idx === undefined || event.detail.value === undefined) return;

            const idx = event.detail.idx;
            let value = this.toFixedNumber(event.detail.value);
            let newVpdPhases = [...this._vpd_phases];
            newVpdPhases[idx + 1] = {
                ...newVpdPhases[idx + 1],
                lower: parseFloat(value),
            };

            newVpdPhases[idx] = {
                ...newVpdPhases[idx],
                upper: parseFloat(value),
            };

            this.vpd_phases = newVpdPhases;
            this._config.vpd_phases = this.vpd_phases;
            fireEvent(this, 'config-changed', {config: this._config});
        });

    }

    initColorEditor() {
        let colorEditor = this.shadowRoot.querySelector('.colorEditor');
        colorEditor.innerHTML = '';
        colorEditor.style.display = 'grid';
        colorEditor.style.gridTemplateColumns = 'repeat(2, 1fr)';
        colorEditor.style.gap = '10px';

        this._vpd_phases.forEach((phase, index) => {
            const container = document.createElement('div');

            const input = document.createElement('ha-textfield');
            input.style = 'width:100%';
            input.label = 'Phase ' + (index + 1);
            input.setAttribute('data-index', index);
            input.value = phase.className;
            container.appendChild(input);


            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.className = 'colorPicker';
            colorPicker.value = phase.color;
            const removeButton = document.createElement('button');
            removeButton.innerHTML = 'X';
            removeButton.className = "removeButton";
            removeButton.addEventListener('click', () => {
                if (this._vpd_phases.length === 1) {
                    return;
                }
                let newVpdPhases = [...this._vpd_phases];
                newVpdPhases.splice(index, 1);
                this.vpd_phases = newVpdPhases;
                this._config.vpd_phases = this.vpd_phases;
                fireEvent(this, 'config-changed', {config: this._config});

                let rangesArray = this.generateRangesArray(newVpdPhases);
                this.multiRange.update(rangesArray);
                container.remove();
                this.initColorEditor();
                this.resortPhases();
                this.initAddButton();


            });
            container.appendChild(removeButton);


            colorPicker.addEventListener('change', (ev) => {
                let newVpdPhases = [...this._vpd_phases];
                let idx = index;
                newVpdPhases[idx] = {
                    ...newVpdPhases[idx],
                    color: ev.target.value
                };

                this.vpd_phases = newVpdPhases;
                let vpdPhases = [...newVpdPhases];
                let rangesArray = this.generateRangesArray(vpdPhases);
                this._config.vpd_phases = this.vpd_phases;
                this.multiRange.update(rangesArray);
                fireEvent(this, 'config-changed', {config: this._config});
            });
            input.addEventListener('input', this.handleVPDPhaseChange);

            container.appendChild(colorPicker);
            colorEditor.appendChild(container);
        });
    }

    initAddButton() {
        let colorEditor = this.shadowRoot.querySelector('.colorEditor');
        let existingButton = colorEditor.querySelector('.addButton');
        if (existingButton) {
            colorEditor.removeChild(existingButton);
        }

        const addButton = document.createElement('button');
        addButton.innerHTML = 'Add Phase';
        addButton.className = 'addButton';
        addButton.addEventListener('click', () => {
            let newVpdPhases = [...this._vpd_phases];
            if (newVpdPhases.length === 0) {
                console.error('No phases exist');
                return;
            }
            const maxVPD = this.toFixedNumber(this.calculateVPD(this._max_temperature - this._leaf_temperature_offset, this._max_temperature, this._min_humidity));
            let lastPhase = newVpdPhases[newVpdPhases.length - 1];
            let lowerValue = this.toFixedNumber(lastPhase.lower);

            let randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
            let randomPhaseName = 'phase-' + (newVpdPhases.length + 1);


            let newLowerValue = this.toFixedNumber(lowerValue + ((this.toFixedNumber(this.multiRange.settings.max) - lowerValue) / 2))
            newVpdPhases[newVpdPhases.length - 1].upper = newLowerValue;
            newVpdPhases.push({
                lower: newLowerValue,
                upper: maxVPD,
                className: randomPhaseName,
                color: randomColor
            });

            let rangesArray = this.generateRangesArray(newVpdPhases);

            this._config.vpd_phases = newVpdPhases;
            this.multiRange.update(rangesArray);
            this.vpd_phases = newVpdPhases;
            this._config.vpd_phases = this.vpd_phases;
            fireEvent(this, 'config-changed', {
                config: this._config
            });

            this.initColorEditor();
            this.initAddButton();
        });
        colorEditor.appendChild(addButton);
    }
    generateRangesArray(newVpdPhases) {
        let rangesArray = [];
        for (let i = 0; i < newVpdPhases.length; i++) {
            let color = null;
            if (newVpdPhases[i + 1] !== undefined) {
                color = newVpdPhases[i + 1].color;
            }
            rangesArray.push({
                value: newVpdPhases[i].upper,
                color: color
            });
        }
        return rangesArray;
    }
    resortPhases() {
        let newVpdPhases = [...this._vpd_phases];
        newVpdPhases.forEach((phase, index) => {
            if (newVpdPhases[index + 1] !== undefined) {
                newVpdPhases[index + 1].lower = phase.upper;
            }
        });

        this.vpd_phases = newVpdPhases;
        this._config.vpd_phases = this.vpd_phases;
        fireEvent(this, 'config-changed', {config: this._config});
    }

    initFormulaEditor() {
        const container = this.shadowRoot.querySelector('.formulaEditor');
        container.innerHTML = `
        <div>
            <label style="margin-bottom: 10px; font-size: 1.2em;">VPD Calibration Formula</label>
            <p style="margin-bottom: 10px;">Available Variables: Tleaf, Tair, RH</p>
            <textarea style="width: 100%; height: 100px; margin-top: 10px;"></textarea>
        </div>
    `;
        container.style.display = 'grid';
        container.style.marginTop = '10px';

        const textarea = container.querySelector('textarea');
        textarea.value = this._config.calculateVPD || this.extractFunctionBody(this.calculateVPD);

        textarea.addEventListener('input', (ev) => {
            this._config.calculateVPD = ev.target.value;
            fireEvent(this, 'config-changed', {config: this._config});
        });
    }

    extractFunctionBody(func) {
        const funcAsString = func.toString();
        return funcAsString.slice(funcAsString.indexOf("{") + 1, funcAsString.lastIndexOf("}"));
    }
}

customElements.define('ha-vpd-chart-editor', HaVpdChartEditor);
Object.assign(HaVpdChartEditor.prototype, methods);
Object.assign(HaVpdChartEditor.prototype, MultiRange);