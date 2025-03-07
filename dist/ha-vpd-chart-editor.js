import {methods} from './methods.js';

import {MultiRange} from './ha-vpd-chart-editor-multiRange.js';

export class HaVpdChartEditor extends HTMLElement {
    config = {
        type: 'custom:ha-vpd-chart', rooms: [], vpd_phases: []
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
            config.vpd_phases = [{upper: 0, className: 'gray-danger-zone', color: '#999999'}, {lower: 0, upper: 0.4, className: 'under-transpiration', color: '#1a6c9c'}, {lower: 0.4, upper: 0.8, className: 'early-veg', color: '#22ab9c'}, {lower: 0.8, upper: 1.2, className: 'late-veg', color: '#9cc55b'}, {lower: 1.2, upper: 1.6, className: 'mid-late-flower', color: '#e7c12b'}, {lower: 1.6, className: 'danger-zone', color: '#ce4234'},];
        }
        if (config.rooms === undefined) {
            config.rooms = [];
        }
        if (config.sensors !== undefined) {
            config.rooms = config.sensors;
        }
        if (config.rooms.length === 0) {
            config.rooms = [{
                temperature: '', humidity: '', name: ''
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
        if (config.leaf_text === undefined) {
            config.leaf_text = "Leaf";
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
        if (config.antialiasing === undefined) {
            config.antialiasing = 5;
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

    get _leaf_text() {
        return this.config.leaf_text || '';
    }

    get _rh_text() {
        return this.config.rh_text || '';
    }

    get _kpa_text() {
        return this.config.kpa_text || '';
    }

    get _vpd_phases() {
        return this.config.vpd_phases !== undefined ? this.config.vpd_phases : [{upper: 0, className: 'gray-danger-zone', color: '#999999'}, {lower: 0, upper: 0.4, className: 'under-transpiration', color: '#1a6c9c'}, {lower: 0.4, upper: 0.8, className: 'early-veg', color: '#22ab9c'}, {lower: 0.8, upper: 1.2, className: 'late-veg', color: '#9cc55b'}, {lower: 1.2, upper: 1.6, className: 'mid-late-flower', color: '#e7c12b'}, {lower: 1.6, className: 'danger-zone', color: '#ce4234'},];
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

    get _antialiasing() {
        return this.config.antialiasing !== undefined ? this.config.antialiasing : 5;
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
        let value = target.value;
        if (target.tagName === "HA-CHECKBOX") {
            if (target.checked === "checked") {
                target.checked = true;
            }
            value = target.checked;
        }
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
        let target = ev.target;
        if (ev.target === undefined) {
            target = ev;
        }
        const configValue = target.getAttribute('id');
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
        import('./lang/' + this._hass.language + '.js').then((module) => {
            this.language = module.language;
            this.render();
            this.initValues();
            this.initRooms();
            this.initColorEditor();
            this.initAddButton();
            this.initFormulaEditor();
        }).catch(() => {
            import('./lang/en.js').then((module) => {
                this.language = module.language;
                this.render();
                this.initValues();
                this.initRooms();
                this.initColorEditor();
                this.initAddButton();
                this.initFormulaEditor();
            });
        });
    }

    render() {
        this.shadowRoot.innerHTML = `<style>
    @import '/local/community/ha-vpd-chart/ha-vpd-chart-editor.css?v=${window.vpdChartVersion}'
</style>
<div class="vpd-chart-config">
    <button type="button" class="collapsible ">${this.language.buttons.rooms}</button>
    <div class="content">
        <div>
            <div class="roomEditor"></div>
        </div>
    </div>
    <button type="button" class="collapsible active">${this.language.buttons.main_settings}</button>
    <div class="content" style="max-height:fit-content;">
        <div>
            <table>
                <tr>
                    <td>
                        <ha-textfield label="${this.language.air_text}" id="air_text"></ha-textfield>
                    </td>         
                   <td>
                        <ha-textfield label="${this.language.leaf_text}" id="leaf_text"></ha-textfield>
                    </td>
                </tr>
                <tr>
                    <td>
                        <ha-textfield label="${this.language.rh_text}" id="rh_text"></ha-textfield>
                    </td>
                    <td>
                        <ha-textfield label="${this.language.kpa_text}" id="kpa_text"></ha-textfield>
                    </td>
                </tr>
                <tr>
                    <td>
                        <ha-textfield pattern="[0-9]+([.][0-9]+)?" type="number" label="${this.language.min_temperature}" id="min_temperature"></ha-textfield>
                    </td>
                    <td>
                        <ha-textfield pattern="[0-9]+([.][0-9]+)?" type="number" label="${this.language.max_temperature}" id="max_temperature"></ha-textfield>
                    </td>
                </tr>
                <tr>
                    <td>
                        <ha-textfield pattern="[0-9]+([.][0-9]+)?" type="number" label="${this.language.min_humidity}" id="min_humidity"></ha-textfield>
                    </td>
                    <td>
                        <ha-textfield pattern="[0-9]+([.][0-9]+)?" type="number" label="${this.language.max_humidity}" id="max_humidity"></ha-textfield>
                    </td>
                </tr>
                <tr>
                    <td>
                        <ha-textfield type="text" label="${this.language.leaf_temperature_offset}" id="leaf_temperature_offset"></ha-textfield>
                    </td>
                    <td>
                        <ha-textfield pattern="[0-9]+([.][0-9]+)?" type="number" label="${this.language.ghostmap_hours}" id="ghostmap_hours"></ha-textfield>
                    </td>
                </tr>
                <tr>
                    <td>
                        <ha-textfield pattern="[0-9]+([.][0-9]+)?" min="1" max="10" type="number" title="${this.language.antialiasing}" label="${this.language.antialiasing.substring(0, 20)}..." id="antialiasing"></ha-textfield>
                    </td>
                    <td>
                        <ha-textfield pattern="[0-9]+([.][0-9]+)?" type="number" label="${this.language.min_height}" id="min_height"></ha-textfield>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    <button type="button" class="collapsible">${this.language.buttons.features}</button>
    <div class="content">
        <div>
            <table>
                <tr>
                    <td>
                        <ha-formfield data-title="${this.language.description.is_bar_view}" label="${this.language.titles.is_bar_view}">
                            <ha-checkbox id="is_bar_view"></ha-checkbox>
                        </ha-formfield>
                    </td>
                    <td>
                        <ha-formfield title="${this.language.description.enable_axes}" label="${this.language.titles.enable_axes}">
                            <ha-checkbox id="enable_axes"></ha-checkbox>
                        </ha-formfield>
                    </td>
                </tr>
                <tr>
                    <td>
                        <ha-formfield title="${this.language.description.enable_ghostmap}" label="${this.language.titles.enable_ghostmap}">
                            <ha-checkbox id="enable_ghostmap"></ha-checkbox>
                        </ha-formfield>
                    </td>
                    <td>
                        <ha-formfield title="${this.language.description.enable_ghostclick}" label="${this.language.titles.enable_ghostclick}">
                            <ha-checkbox id="enable_ghostclick"></ha-checkbox>
                        </ha-formfield>
                    </td>
                </tr>
                <tr>
                    <td>
                        <ha-formfield title="${this.language.description.enable_triangle}" label="${this.language.titles.enable_triangle}">
                            <ha-checkbox id="enable_triangle"></ha-checkbox>
                        </ha-formfield>
                    </td>
                    <td>
                        <ha-formfield title="${this.language.description.enable_tooltip}" label="${this.language.titles.enable_tooltip}">
                            <ha-checkbox id="enable_tooltip"></ha-checkbox>
                        </ha-formfield>

                    </td>
                </tr>
                <tr>
                    <td>
                        <ha-formfield title="${this.language.description.enable_crosshair}" label="${this.language.titles.enable_crosshair}">
                            <ha-checkbox id="enable_crosshair"></ha-checkbox>
                        </ha-formfield>
                    </td>
                    <td>
                        <ha-formfield title="${this.language.description.enable_zoom}" label="${this.language.titles.enable_zoom}">
                            <ha-checkbox id="enable_zoom"></ha-checkbox>
                        </ha-formfield>
                    </td>
                </tr>
                <tr>

                    <td>
                        <ha-formfield title="${this.language.description.enable_legend}" label="${this.language.titles.enable_legend}">
                            <ha-checkbox id="enable_legend"></ha-checkbox>
                        </ha-formfield>
                    </td>
                    <td>
                        <ha-formfield title="${this.language.description.enable_show_always_informations}">                       
                            <ha-checkbox id="enable_show_always_informations"></ha-checkbox>
                            <label>
                                ${this.language.titles.enable_show_always_informations}
                            </label>
                        </ha-formfield>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    <button type="button" class="collapsible">${this.language.buttons.phases}</button>
    <div class="content">
        <div>
            <div id="slider-container" class="slider-container">
                <div id="slider-labels" class="slider-labels"></div>
            </div>
            <div class="colorEditor"></div>
        </div>
    </div>
    <button type="button" class="collapsible">${this.language.buttons.vpd_calibration}</button>
    <div class="content">
        <div class="formulaEditor"></div>
    </div>
</div>`;
        const debouncedHandleInputChange = this.debounce(this.handleValueChange, 500);

        this.shadowRoot.querySelectorAll('ha-switch, ha-textfield, input').forEach(input => {
            let target = input;

            input.addEventListener('input', () => {
                debouncedHandleInputChange(target);
            });
        });
        this.shadowRoot.querySelectorAll('ha-checkbox').forEach(input => {

            input.addEventListener('change', this.handleValueChange);
        })
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
            {id: 'leaf_text', prop: '_leaf_text', type: 'value'},
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
            {id: 'enable_zoom', prop: '_enable_zoom', type: 'checked'},
            {id: 'enable_legend', prop: '_enable_legend', type: 'checked'},
            {id: 'enable_show_always_informations', prop: '_enable_show_always_informations', type: 'checked'},
            {id: 'ghostmap_hours', prop: '_ghostmap_hours', type: 'value'},
            {id: 'antialiasing', prop: '_antialiasing', type: 'value'},
            {id: 'unit_temperature', prop: '_unit_temperature', type: 'value'}
        ];

        configValues.forEach(({id, prop, type}) => {
            const element = this.shadowRoot.querySelector(`#${id}`);
            if (element) {
                if (Object.isExtensible(element)) {
                    if (type === "checked") {
                        element[type] = this[prop] ? 'checked' : '';
                    } else {
                        element[type] = this[prop];
                    }
                } else {
                    console.warn('Cannot define property on a non-extensible object');
                }
            }
        });

        // Use requestAnimationFrame to update the multiRange
        requestAnimationFrame(() => {
            this.updateMultiRange();
        });

    }

    updateMultiRange() {
        const vpdPhases = this.config.vpd_phases;
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

    initRooms() {
        const roomEditor = this.shadowRoot.querySelector('.roomEditor');
        roomEditor.innerHTML = '';
        roomEditor.style.display = 'grid';
        roomEditor.style.gridTemplateColumns = 'repeat(2, 1fr)';
        roomEditor.style.gap = '10px';


        const updateSensors = (index, property, target) => {
            let configCopy = this.copyConfig();
            configCopy.rooms[index][property] = this.checkValue(target);
            this.config = configCopy;
            this.fireEvent(this, 'config-changed', {config: this.config});
        };

        if (this.config.rooms.length !== 0) {
            this.config.rooms.forEach((room, index) => {
                const container = document.createElement('div');
                container.style = "border: 1px solid rgba(127,127,127,0.3); padding: 5px; border-radius: 15px;";

                const fields = [this.language.name, this.language.temperature_sensor + '*', this.language.leaf_temperature_sensor, this.language.humidity_sensor + '*'];
                const properties = ['name', 'temperature', 'leaf_temperature', 'humidity'];

                fields.forEach((field, i) => {
                    let element;
                    switch (properties[i]) {
                        case 'temperature':
                        case 'leaf_temperature':
                            element = this.createComboBox(field, index, room[properties[i]], properties[i], 'temperature');
                            break;
                        case 'humidity':
                            element = this.createComboBox(field, index, room[properties[i]], properties[i], 'humidity');
                            break;
                        default:
                            element = this.createTextField(field, index, room[properties[i]]);
                            break;
                    }
                    element.addEventListener('value-changed', (ev) => updateSensors(index, properties[i], ev));
                    const debouncedHandleInputChange = this.debounce(updateSensors, 500);
                    element.addEventListener('input', function (event) {
                        debouncedHandleInputChange(index, properties[i], event.target);
                    });
                    container.appendChild(element);
                });
                const removeButton = document.createElement('button');
                removeButton.innerHTML = 'X';
                removeButton.className = "removeButton";
                removeButton.addEventListener('click', () => {
                    if (this.config.rooms.length === 1) return;
                    let copyConfig = this.copyConfig();
                    copyConfig.rooms.splice(index, 1);
                    this.config = copyConfig;
                    this.fireEvent(this, 'config-changed', {config: this.config});
                    this.initRooms();
                });
                container.appendChild(removeButton);
                roomEditor.appendChild(container);
            });
        }
        const addButton = document.createElement('button');
        addButton.innerHTML = this.language.buttons.addRoom;
        addButton.className = 'addButton';
        addButton.addEventListener('click', () => {
            let configCopy = this.copyConfig();
            configCopy.rooms[configCopy.rooms.length] = [{name: '', temperature: '', humidity: '', leaf_temperature: null}];
            this.config = configCopy;
            this.fireEvent(this, 'config-changed', {config: this.config});
            this.initRooms();
            roomEditor.parentElement.parentElement.style.maxHeight = `fit-content`;
        });
        roomEditor.appendChild(addButton);
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
                    ...this.copyConfig().vpd_phases[idx], color: ev.target.value
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
        addButton.innerHTML = this.language.buttons.addPhase;
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
                lower: newLowerValue, upper: maxVPD, className: randomPhaseName, color: randomColor
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
                value: newVpdPhases[i].upper, color: color
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