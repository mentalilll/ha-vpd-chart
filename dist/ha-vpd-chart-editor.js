import {methods} from './methods.js';
import {MultiRange} from './ha-vpd-chart-editor-multiRange.js';

export class HaVpdChartEditor extends HTMLElement {
    config = {
        type: 'custom:ha-vpd-chart',
        sensors: [],
        vpd_phases: []
    };

    constructor() {
        super();
        this.config = this.initializeDefaults(this.config);

        this.attachShadow({mode: 'open'});
    }

    initializeDefaults(config) {
        if (config.vpd_phases === undefined) {
            config.vpd_phases = [];
        }
        if (config.vpd_phases.length === 0) {
            config.vpd_phases = [
                {upper: 0, className: 'gray-danger-zone', color: '#999999'},
                {lower: 0, upper: 0.4, className: 'under-transpiration', color: '#1a6c9c'},
                {lower: 0.4, upper: 0.8, className: 'early-veg', color: '#22ab9c'},
                {lower: 0.8, upper: 1.2, className: 'late-veg', color: '#9cc55b'},
                {lower: 1.2, upper: 1.6, className: 'mid-late-flower', color: '#e7c12b'},
                {lower: 1.6, className: 'danger-zone', color: '#ce4234'},
            ];
        }
        if (config.sensors === undefined) {
            config.sensors = [];
        }
        if (config.sensors.length === 0) {
            config.sensors = [{
                temperature: '',
                humidity: '',
                name: ''
            }];
        }
        if (config.is_bar_view === undefined) {
            config.is_bar_view = false;
        }
        if (config.min_temperature === undefined) {
            config.min_temperature = 5;
        }
        if (config.max_temperature === undefined) {
            config.max_temperature = 35;
        }
        if (config.min_humidity === undefined) {
            config.min_humidity = 10;
        }
        if (config.max_humidity === undefined) {
            config.max_humidity = 90;
        }
        if (config.min_height === undefined) {
            config.min_height = 200;
        }
        if (config.leaf_temperature_offset === undefined) {
            config.leaf_temperature_offset = 2;
        }
        if (config.enable_tooltip === undefined) {
            config.enable_tooltip = true;
        }
        if (config.air_text === undefined) {
            config.air_text = "Air";
        }
        if (config.rh_text === undefined) {
            config.rh_text = "RH";
        }
        if (config.kpa_text === undefined) {
            config.kpa_text = "kPa";
        }
        if (config.enable_axes === undefined) {
            config.enable_axes = true;
        }
        if (config.enable_ghostclick === undefined) {
            config.enable_ghostclick = true;
        }
        if (config.enable_ghostmap === undefined) {
            config.enable_ghostmap = true;
        }
        if (config.enable_triangle === undefined) {
            config.enable_triangle = true;
        }
        if (config.enable_crosshair === undefined) {
            config.enable_crosshair = true;
        }
        if (config.enable_fahrenheit === undefined) {
            config.enable_fahrenheit = false;
        }
        if (config.enable_zoom === undefined) {
            config.enable_zoom = true;
        }
        if (config.enable_show_always_informations === undefined) {
            config.enable_show_always_informations = true;
        }
        if (config.enable_legend === undefined) {
            config.enable_legend = true;
        }
        if (config.ghostmap_hours === undefined) {
            config.ghostmap_hours = 24;
        }
        if (config.unit_temperature === undefined) {
            config.unit_temperature = '°C';
        }

        return config;

    }

    set hass(hass) {
        this._hass = hass;
    }

    get _air_text() {
        return this.config.air_text || '';
    }

    get _rh_text() {
        return this.config.rh_text || '';
    }

    get _kpa_text() {
        return this.config.kpa_text || '';
    }

    get _vpd_phases() {
        return this.config.vpd_phases !== undefined ? this.config.vpd_phases : [
            {upper: 0, className: 'gray-danger-zone', color: '#999999'},
            {lower: 0, upper: 0.4, className: 'under-transpiration', color: '#1a6c9c'},
            {lower: 0.4, upper: 0.8, className: 'early-veg', color: '#22ab9c'},
            {lower: 0.8, upper: 1.2, className: 'late-veg', color: '#9cc55b'},
            {lower: 1.2, upper: 1.6, className: 'mid-late-flower', color: '#e7c12b'},
            {lower: 1.6, className: 'danger-zone', color: '#ce4234'},
        ];
    }

    get _min_temperature() {
        return this.config.min_temperature !== undefined ? this.config.min_temperature : 5;
    }

    get _max_temperature() {
        return this.config.max_temperature !== undefined ? this.config.max_temperature : 35;
    }

    get _min_humidity() {
        return this.config.min_humidity !== undefined ? this.config.min_humidity : 0;
    }

    get _max_humidity() {
        return this.config.max_humidity !== undefined ? this.config.max_humidity : 100;
    }

    get _min_height() {
        return this.config.min_height !== undefined ? this.config.min_height : 200;
    }

    get _leaf_temperature_offset() {
        return this.config.leaf_temperature_offset !== undefined ? this.config.leaf_temperature_offset : 2;
    }

    get _is_bar_view() {
        return this.config.is_bar_view || false;
    }

    get _enable_axes() {
        return this.config.enable_axes !== undefined ? this.config.enable_axes : true;
    }

    get _enable_ghostclick() {
        return this.config.enable_ghostclick !== undefined ? this.config.enable_ghostclick : true;
    }

    get _enable_ghostmap() {
        return this.config.enable_ghostmap !== undefined ? this.config.enable_ghostmap : true;
    }

    get _enable_triangle() {
        return this.config.enable_triangle !== undefined ? this.config.enable_triangle : true;
    }

    get _enable_crosshair() {
        return this.config.enable_crosshair !== undefined ? this.config.enable_crosshair : true;
    }

    get _enable_tooltip() {
        return this.config.enable_tooltip !== undefined ? this.config.enable_tooltip : true;
    }

    get _ghostmap_hours() {
        return this.config.ghostmap_hours !== undefined ? this.config.ghostmap_hours : 24;
    }

    get _enable_fahrenheit() {
        return this.config.enable_fahrenheit !== undefined ? this.config.enable_fahrenheit : false;
    }

    get _unit_temperature() {
        return this.config.unit_temperature || 'C';
    }

    get _enable_zoom() {
        return this.config.enable_zoom !== undefined ? this.config.enable_zoom : true;
    }

    get _enable_show_always_informations() {
        return this.config.enable_show_always_informations !== undefined ? this.config.enable_show_always_informations : true;
    }

    get _enable_legend() {
        return this.config.enable_legend !== undefined ? this.config.enable_legend : true;
    }

    setConfig(config) {
        let loadedConfig = {...config};
        this.config = this.initializeDefaults(loadedConfig);

        if (this.config.calculateVPD) {
            this.calculateVPD = new Function('Tleaf', 'Tair', 'RH', this.config.calculateVPD);
        }
    }

    checkValue(target) {
        let value = target.type === 'checkbox' ? target.checked : target.value;

        if (typeof value === 'string' && !isNaN(value)) {
            value = this.toFixedNumber(value);
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
        if (value === "") {
            value = undefined;
        }

        if (target.detail !== undefined && target.detail.value !== undefined) {
            value = target.detail.value;
        }
        if (target.detail !== undefined && target.detail.value === undefined) {
            value = undefined;
            if (target.currentTarget.renderOptions.host.renderRoot.activeElement !== null) {
                target.currentTarget.renderOptions.host.renderRoot.activeElement.__value = "";
            }
            target.currentTarget.renderOptions.host.__value = "";
        }
        return value;
    }

    handleValueChange = (ev) => {
        const target = ev.target;
        const configValue = target.getAttribute('data-configvalue');
        let value = this.checkValue(target);
        let configCopy = this.copyConfig();


        if (configCopy[configValue] !== value) {
            configCopy[configValue] = value;
            this.fireEvent(this, 'config-changed', {config: configCopy});
        }
        this.config = configCopy;

    }

    handleVPDPhaseChange = (ev) => {
        const target = ev.target;
        const index = target.getAttribute('data-index');
        let value = target.value;
        if (this._vpd_phases[index].className !== value) {
            if (Object.isExtensible(this.config.vpd_phases[index])) {
                this.config.vpd_phases[index].className = value;
            } else {
                console.warn('Cannot define property on a non-extensible object');
            }
            this.fireEvent(this, 'config-changed', {config: this.config});
        }
    }

    connectedCallback() {
        this.render();
        this.initValues();
        this.initSensors();
        this.initColorEditor();
        this.initAddButton();
        this.initFormulaEditor();
    }

    render() {
        this.shadowRoot.innerHTML = `<style>
    @import '/local/community/ha-vpd-chart/ha-vpd-chart-editor.css?v=${window.vpdChartVersion}'
</style>
<div class="vpd-chart-config">
    <button type="button" class="collapsible ">Sensors</button>
    <div class="content">
        <div>
            <div class="sensorEditor"></div>
        </div>
        </div>
    <button type="button" class="collapsible active">Main Settings</button>
    <div class="content" style="max-height:fit-content;">
        <div>
            <table>
                <tr>
                    <td>
                        <ha-textfield style="width:100%;" label="Air Text" id="air_text" data-configvalue="air_text"></ha-textfield>
                    </td>
                    <td>
                        <ha-textfield style="width:100%;" label="RH Text" id="rh_text" data-configvalue="rh_text"></ha-textfield>
                    </td>
                </tr>
                <tr>
                    <td>
                        <ha-textfield style="width:100%;" label="kPa Text" id="kpa_text" data-configvalue="kpa_text"></ha-textfield>
                    </td>
                    <td>
                        <ha-textfield style="width:100%;" pattern="[0-9]+([.][0-9]+)?" type="number" label="Min Height of Table" id="min_height" data-configvalue="min_height"></ha-textfield>
                    </td>
                </tr>
                <tr>
                    <td>
                        <ha-textfield style="width:100%;" pattern="[0-9]+([.][0-9]+)?" type="number" label="Min Temperature" id="min_temperature" data-configvalue="min_temperature"></ha-textfield>
                    </td>
                    <td>
                        <ha-textfield style="width:100%;" pattern="[0-9]+([.][0-9]+)?" type="number" label="Max Temperature" id="max_temperature" data-configvalue="max_temperature"></ha-textfield>
                    </td>
                </tr>
                <tr>
                    <td>
                        <ha-textfield style="width:100%;" pattern="[0-9]+([.][0-9]+)?" type="number" label="Min Humidity" id="min_humidity" data-configvalue="min_humidity"></ha-textfield>
                    </td>
                    <td>
                        <ha-textfield style="width:100%;" pattern="[0-9]+([.][0-9]+)?" type="number" label="Max Humidity" id="max_humidity" data-configvalue="max_humidity"></ha-textfield>
                    </td>
                </tr>
                <tr>
                    <td>
                        <ha-textfield style="width:100%;" type="text" label="Leaf Temperature offset" id="leaf_temperature_offset" data-configvalue="leaf_temperature_offset"></ha-textfield>
                    </td>
                    <td>
                        <ha-textfield style="width:100%;" pattern="[0-9]+([.][0-9]+)?" type="number" label="Ghostmap Hours" id="ghostmap_hours" data-configvalue="ghostmap_hours"></ha-textfield>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    <button type="button" class="collapsible">Features</button>
    <div class="content">
        <div>
            <table>
                <tr>
                    <td>
                        <label>
                            <input type="checkbox" id="is_bar_view" data-configvalue="is_bar_view">
                            Bar View
                        </label>
                    </td>
                    <td>
                        <label>
                            <input type="checkbox" id="enable_axes" data-configvalue="enable_axes">
                            Enable Axes
                        </label>
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>
                            <input type="checkbox" id="enable_ghostmap" data-configvalue="enable_ghostmap">
                            Enable Ghostmap
                        </label>
                    </td>
                    <td>
                        <label>
                            <input type="checkbox" id="enable_ghostclick" data-configvalue="enable_ghostclick">
                            Enable Ghostclick
                        </label>
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>
                            <input type="checkbox" id="enable_triangle" data-configvalue="enable_triangle">
                            Enable Triangle
                        </label>
                    </td>
                    <td>
                        <label>
                            <input type="checkbox" id="enable_tooltip" data-configvalue="enable_tooltip">
                            Enable Tooltip
                        </label>
                    </td>
                </tr>
                <tr>         
                    <td>
                        <label>
                            <input type="checkbox" id="enable_crosshair" data-configvalue="enable_crosshair">
                            Enable Mousehover Crosshair
                        </label>
                    </td>
                    <td>
                        <label>
                            <input type="checkbox" id="enable_fahrenheit" data-configvalue="enable_fahrenheit">
                            Enable Fahrenheit
                        </label>
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>
                            <input type="checkbox" id="enable_zoom" data-configvalue="enable_zoom">
                            Enable Zoom
                        </label>
                    </td>
                    <td>
                        <label>
                            <input type="checkbox" id="enable_legend" data-configvalue="enable_legend">
                            Enable Legend
                        </label>
                    </td>
                </tr>
                <tr>
                    <td>
                        <label>
                            <input type="checkbox" id="enable_show_always_informations" data-configvalue="enable_show_always_informations">
                            Always Show Info 
                        </label>
                    </td>
                    <td>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    <button type="button" class="collapsible">Configure Phases</button>
    <div class="content">
        <div>
            <div id="slider-container" class="slider-container">
                <div id="slider-labels" class="slider-labels"></div>
            </div>
            <div class="colorEditor"></div>
        </div>
    </div>
    <button type="button" class="collapsible">VPD Calibration Formula</button>
    <div class="content">
            <div class="formulaEditor"></div>
    </div>
</div>`;
        this.shadowRoot.querySelectorAll('ha-switch, ha-textfield, ha-checkbox, label, input').forEach(input => {
            input.addEventListener('input', this.handleValueChange);
        });
        this.shadowRoot.querySelectorAll('.collapsible').forEach(collapsible => {
            collapsible.onclick = () => {
                collapsible.classList.toggle("active");
                let content = collapsible.nextElementSibling;
                content.style.maxHeight = content.style.maxHeight ? null : `fit-content`;

            };
        });

    }

    initValues() {

        const configValues = [
            {id: 'air_text', prop: '_air_text', type: 'value'},
            {id: 'rh_text', prop: '_rh_text', type: 'value'},
            {id: 'kpa_text', prop: '_kpa_text', type: 'value'},
            {id: 'min_temperature', prop: '_min_temperature', type: 'value'},
            {id: 'max_temperature', prop: '_max_temperature', type: 'value'},
            {id: 'min_humidity', prop: '_min_humidity', type: 'value'},
            {id: 'max_humidity', prop: '_max_humidity', type: 'value'},
            {id: 'leaf_temperature_offset', prop: '_leaf_temperature_offset', type: 'value'},
            {id: 'min_height', prop: '_min_height', type: 'value'},
            {id: 'is_bar_view', prop: '_is_bar_view', type: 'checked'},
            {id: 'enable_axes', prop: '_enable_axes', type: 'checked'},
            {id: 'enable_ghostclick', prop: '_enable_ghostclick', type: 'checked'},
            {id: 'enable_ghostmap', prop: '_enable_ghostmap', type: 'checked'},
            {id: 'enable_triangle', prop: '_enable_triangle', type: 'checked'},
            {id: 'enable_crosshair', prop: '_enable_crosshair', type: 'checked'},
            {id: 'enable_tooltip', prop: '_enable_tooltip', type: 'checked'},
            {id: 'enable_fahrenheit', prop: '_enable_fahrenheit', type: 'checked'},
            {id: 'enable_zoom', prop: '_enable_zoom', type: 'checked'},
            {id: 'enable_legend', prop: '_enable_legend', type: 'checked'},
            {id: 'enable_show_always_informations', prop: '_enable_show_always_informations', type: 'checked'},
            {id: 'ghostmap_hours', prop: '_ghostmap_hours', type: 'value'},
            {id: 'unit_temperature', prop: '_unit_temperature', type: 'value'}
        ];

        configValues.forEach(({id, prop, type}) => {
            const element = this.shadowRoot.querySelector(`#${id}`);
            if (element) {
                if (Object.isExtensible(element)) {
                    if (type === "checked") {
                        if (this[prop]) {
                            element[type] = 'checked';
                        } else {
                            element[type] = '';
                        }
                    } else {
                        element[type] = this[prop];
                    }
                } else {
                    console.warn('Cannot define property on a non-extensible object');
                }
            }
        });

        let vpdPhases = this.config.vpd_phases;
        const sliderContainer = this.shadowRoot.querySelector('#slider-container');

        let rangesArray = this.generateRangesArray(vpdPhases);

        let settings = {
            step: 0,
            min: this.toFixedNumber(vpdPhases[0].lower),
            max: this.toFixedNumber(vpdPhases[vpdPhases.length - 1].lower + 0.6),
            ranges: rangesArray,
        };

        this.multiRange = new MultiRange(sliderContainer, settings);

        this.multiRange.on("changed", (event) => {

            if (event.detail.idx === undefined || event.detail.value === undefined) return;
            let configCopy = this.copyConfig();
            const idx = event.detail.idx;
            let value = this.toFixedNumber(event.detail.value);

            if (configCopy.vpd_phases[idx + 1] !== undefined) {
                configCopy.vpd_phases[idx + 1] = {
                    ...configCopy.vpd_phases[idx + 1],
                    lower: this.toFixedNumber(value),
                };
            }

            if (configCopy.vpd_phases[idx] !== undefined) {
                configCopy.vpd_phases[idx] = {
                    ...configCopy.vpd_phases[idx],
                    upper: this.toFixedNumber(value),
                };
            }
            this.config = configCopy;
            this.fireEvent(this, 'config-changed', {config: this.config});
        });

    }

    initSensors() {
        const sensorEditor = this.shadowRoot.querySelector('.sensorEditor');
        sensorEditor.innerHTML = '';
        sensorEditor.style.display = 'grid';
        sensorEditor.style.gridTemplateColumns = 'repeat(2, 1fr)';
        sensorEditor.style.gap = '10px';


        const updateSensors = (index, property, target) => {
            let configCopy = this.copyConfig();
            configCopy.sensors[index][property] = this.checkValue(target);
            this.config = configCopy;
            this.fireEvent(this, 'config-changed', {config: this.config});
        };

        if (this.config.sensors.length !== 0) {
            this.config.sensors.forEach((sensor, index) => {
                const container = document.createElement('div');
                container.style = "border: 1px solid rgba(127,127,127,0.3); padding: 5px; border-radius: 15px;";

                const fields = ['Name', 'Temperature Sensor*', 'Leaf Temperature Sensor', 'Humidity Sensor*', /*'VPD Helper',*/ 'Calculated RH?'];
                const properties = ['name', 'temperature', 'leaf_temperature', 'humidity', /*'vpd_helper',*/ 'show_calculated_rh'];

                fields.forEach((field, i) => {
                    let element;
                    switch (properties[i]) {
                        case 'temperature':
                        case 'leaf_temperature':
                            element = this.createComboBox(field, index, sensor[properties[i]], properties[i], 'temperature');
                            break;
                        case 'humidity':
                            element = this.createComboBox(field, index, sensor[properties[i]], properties[i], 'humidity');
                            break;
                        case 'show_calculated_rh':
                            element = this.createCheckbox(field, index, sensor[properties[i]], properties[i]);
                            break;
                        default:
                            element = this.createTextField(field, index, sensor[properties[i]]);
                            break;
                    }
                    element.addEventListener('value-changed', (ev) => updateSensors(index, properties[i], ev));
                    element.addEventListener('input', (ev) => updateSensors(index, properties[i], ev.target));
                    container.appendChild(element);
                });
                const removeButton = document.createElement('button');
                removeButton.innerHTML = 'X';
                removeButton.className = "removeButton";
                removeButton.addEventListener('click', () => {
                    if (this.config.sensors.length === 1) return;
                    let copyConfig = this.copyConfig();
                    copyConfig.sensors.splice(index, 1);
                    this.config = copyConfig;
                    this.fireEvent(this, 'config-changed', {config: this.config});
                    this.initSensors();
                });
                container.appendChild(removeButton);
                sensorEditor.appendChild(container);
            });
        }
        const addButton = document.createElement('button');
        addButton.innerHTML = 'Add Sensor';
        addButton.className = 'addButton';
        addButton.addEventListener('click', () => {
            let configCopy = this.copyConfig();
            configCopy.sensors[configCopy.sensors.length] = [
                {name: '', temperature: '', humidity: '', leaf_temperature: null, vpd_helper: false, show_calculated_rh: false}
            ];

            this.config = configCopy;
            this.fireEvent(this, 'config-changed', {config: this.config});
            this.initSensors();
            sensorEditor.parentElement.parentElement.style.maxHeight = `fit-content`;
        });
        sensorEditor.appendChild(addButton);
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
                let copyConfig = this.copyConfig();
                copyConfig.vpd_phases.splice(index, 1);
                this.config = copyConfig;
                this.fireEvent(this, 'config-changed', {config: this.config});

                let rangesArray = this.generateRangesArray(copyConfig.vpd_phases);
                this.multiRange.update(rangesArray);
                container.remove();
                if (index === this._vpd_phases.length) {
                    delete copyConfig.vpd_phases[index - 1].upper;
                    this.config = copyConfig;
                    this.fireEvent(this, 'config-changed', {config: this.config});
                }
                this.initColorEditor();
                this.resortPhases();
                this.initAddButton();
            });
            container.appendChild(removeButton);


            colorPicker.addEventListener('change', (ev) => {
                if (ev.target.value == null) {
                    return;
                }
                let idx = index;
                let copyConfig = this.copyConfig();
                copyConfig.vpd_phases[idx] = {
                    ...this.copyConfig().vpd_phases[idx],
                    color: ev.target.value
                };

                let vpdPhases = [...copyConfig.vpd_phases];
                let rangesArray = this.generateRangesArray(vpdPhases);
                this.multiRange.update(rangesArray);
                this.config = copyConfig;
                this.fireEvent(this, 'config-changed', {config: this.config});
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
            let copyConfig = this.copyConfig();
            let newVpdPhases = [...copyConfig.vpd_phases];
            if (newVpdPhases.length === 0) {
                console.error('No phases exist');
                return;
            }
            const maxVPD = this.toFixedNumber(this.calculateVPD(this.max_temperature - this.leaf_temperature_offset, this.max_temperature, this.min_humidity));
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

            this.multiRange.update(rangesArray);
            copyConfig.vpd_phases = newVpdPhases;
            this.config = copyConfig;
            this.fireEvent(this, 'config-changed', {
                config: this.config
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
        let copyConfig = this.copyConfig();
        let newVpdPhases = [...copyConfig.vpd_phases];
        newVpdPhases.forEach((phase, index) => {
            if (newVpdPhases[index + 1] !== undefined) {
                newVpdPhases[index + 1].lower = phase.upper;
            }
        });

        copyConfig.vpd_phases = newVpdPhases;
        this.config = copyConfig;
        this.fireEvent(this, 'config-changed', {config: this.config});
    }

    initFormulaEditor() {
        const container = this.shadowRoot.querySelector('.formulaEditor');
        container.innerHTML = `
        <div>
            <p style="margin-bottom: 10px;">Available Variables: Tleaf, Tair, RH</p>
            <textarea style="width: 100%; height: 100px; margin-top: 10px;"></textarea>
        </div>
    `;
        container.style.display = 'grid';

        const textarea = container.querySelector('textarea');
        textarea.value = this.config.calculateVPD || this.extractFunctionBody(this.calculateVPD);

        textarea.addEventListener('input', (ev) => {
            this.config.calculateVPD = ev.target.value;
            this.fireEvent(this, 'config-changed', {config: this.config});
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