import editorCss from '../styles/editor.css?raw';
import {methods} from '../methods.js';
import {DEFAULT_PHASES, DEFAULTS, ROOM_COLORS} from '../const.js';
import {getLanguage, translate} from '../lang/index.js';
import {PhaseSlider} from './phase-slider.js';

const TEMPERATURE_FILTER = [{domain: 'sensor', device_class: 'temperature'}, {domain: 'input_number'}];
const HUMIDITY_FILTER = [{domain: 'sensor', device_class: 'humidity'}, {domain: 'input_number'}];
const VPD_FILTER = [{domain: 'sensor'}, {domain: 'input_number'}];
const TEXT_KEYS = ['air_text', 'leaf_text', 'rh_text', 'kpa_text'];
const clone = (value) => JSON.parse(JSON.stringify(value));
const OPTIONAL_ROOM_KEYS = ['leaf_temperature', 'vpd', 'target_phase', 'color'];
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Loads HA's lazy form components (ha-form, entity selector) by asking a core card for its editor. */
async function ensureHaComponents() {
    if (customElements.get('ha-form') && customElements.get('ha-selector')) return;
    try {
        const helpers = window.loadCardHelpers ? await window.loadCardHelpers() : null;
        const card = helpers ? await helpers.createCardElement({type: 'entities', entities: []}) : null;
        if (card && card.constructor.getConfigElement) await card.constructor.getConfigElement();
    } catch {
        // fall through, the form simply shows up once HA has loaded it
    }
    await Promise.race([customElements.whenDefined('ha-form'), new Promise(resolve => setTimeout(resolve, 3000))]);
}

export class HaVpdChartEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this._config = {rooms: [{}]};
        this._lang = getLanguage('en');
    }

    t(path, params) {
        return translate(this._lang, path, params);
    }

    set hass(hass) {
        const languageChanged = !this._hass || this._hass.language !== hass.language;
        this._hass = hass;
        if (languageChanged) this._lang = getLanguage(hass.language);
        this.shadowRoot.querySelectorAll('ha-form').forEach(form => {
            form.hass = hass;
        });
        if (languageChanged && this._rendered) this.renderAll();
    }

    setConfig(config) {
        this._config = clone(config || {});
        if (!Array.isArray(this._config.rooms) || !this._config.rooms.length) {
            this._config.rooms = this._config.sensors || [{}];
            delete this._config.sensors;
        }
        if (this._rendered) this.refresh();
    }

    connectedCallback() {
        if (this._rendered) return;
        this._rendered = true;
        ensureHaComponents().then(() => this.renderAll());
    }

    get phases() {
        return Array.isArray(this._config.vpd_phases) && this._config.vpd_phases.length ? this._config.vpd_phases : clone(DEFAULT_PHASES);
    }

    // ------------------------------------------------------------- rendering
    renderAll() {
        const t = (key) => this.t(key);
        this.shadowRoot.innerHTML = `
            <style>${editorCss}</style>
            <div class="editor">
                <details class="section" open data-section="rooms">
                    <summary>${t('editor.sections.rooms')}</summary>
                    <div class="rooms"></div>
                    <div class="buttons"><button type="button" class="action add-room">+ ${t('editor.buttons.add_room')}</button></div>
                </details>
                <details class="section" data-section="chart">
                    <summary>${t('editor.sections.chart')}</summary>
                    <ha-form data-form="chart"></ha-form>
                </details>
                <details class="section" data-section="features">
                    <summary>${t('editor.sections.features')}</summary>
                    <ha-form data-form="features"></ha-form>
                </details>
                <details class="section" data-section="history">
                    <summary>${t('editor.sections.history')}</summary>
                    <ha-form data-form="history"></ha-form>
                </details>
                <details class="section" data-section="texts">
                    <summary>${t('editor.sections.texts')}</summary>
                    <p class="helper">${t('editor.helpers.texts')}</p>
                    <ha-form data-form="texts"></ha-form>
                </details>
                <details class="section" data-section="phases">
                    <summary>${t('editor.sections.phases')}</summary>
                    <p class="helper">${t('editor.helpers.phases')}</p>
                    <div class="slider"></div>
                    <div class="phase-list"></div>
                    <div class="buttons" style="margin-top:10px">
                        <button type="button" class="action add-phase">+ ${t('editor.buttons.add_phase')}</button>
                        <button type="button" class="action secondary reset-phases">${t('editor.buttons.reset_phases')}</button>
                    </div>
                </details>
                <details class="section" data-section="formula">
                    <summary>${t('editor.sections.formula')}</summary>
                    <p class="helper">${t('editor.helpers.formula')}</p>
                    <textarea spellcheck="false"></textarea>
                    <div class="error"></div>
                </details>
            </div>
        `;

        this.shadowRoot.querySelector('.add-room').addEventListener('click', () => this.addRoom());
        this.shadowRoot.querySelector('.add-phase').addEventListener('click', () => this.addPhase());
        this.shadowRoot.querySelector('.reset-phases').addEventListener('click', () => this.resetPhases());

        this.shadowRoot.querySelectorAll('ha-form[data-form]').forEach(form => {
            form.computeLabel = (schema) => this.t(`editor.fields.${schema.name}`);
            form.computeHelper = (schema) => {
                const helper = translate(this._lang, `editor.helpers.${schema.name}`);
                return helper === `editor.helpers.${schema.name}` ? undefined : helper;
            };
            form.addEventListener('value-changed', (event) => this.onOptionsChanged(form.dataset.form, event.detail.value));
        });

        this.slider = new PhaseSlider(this.shadowRoot.querySelector('.slider'), {
            phases: this.phases,
            max: this.sliderMax(),
            onChange: ({index, value}) => this.setPhaseBorder(index, value),
        });
        this.initFormula();
        this._roomCount = -1;
        this.refresh();
    }

    /** Pushes the current config into the existing forms without rebuilding them (keeps focus). */
    refresh() {
        const rooms = this._config.rooms;
        if (rooms.length !== this._roomCount) this.renderRooms();
        this.shadowRoot.querySelectorAll('.rooms ha-form').forEach((form, index) => {
            const room = rooms[index] || {};
            form.hass = this._hass;
            form.schema = this.roomSchema(room);
            form.data = room;
            this.updateRoomHeader(form.closest('.room'), room, index);
            this.updateColorRow(form.closest('.room'), room, index);
        });
        const data = {...DEFAULTS, ...this._config};
        Object.entries(this.optionSchemas()).forEach(([name, schema]) => {
            const form = this.shadowRoot.querySelector(`ha-form[data-form="${name}"]`);
            if (!form) return;
            form.hass = this._hass;
            form.schema = schema;
            form.data = data;
        });
        this.renderPhaseList();
        if (this.slider) {
            this.slider.max = this.sliderMax();
            this.slider.update(this.phases);
        }
    }

    renderRooms() {
        const container = this.shadowRoot.querySelector('.rooms');
        const rooms = this._config.rooms;
        const previouslyOpen = new Set([...container.querySelectorAll('details.room[open]')].map(el => Number(el.dataset.index)));
        const firstRender = this._roomCount === -1 && !container.children.length;
        this._roomCount = rooms.length;
        container.replaceChildren(...rooms.map((room, index) => {
            const wrapper = document.createElement('details');
            wrapper.className = 'room';
            wrapper.dataset.index = String(index);
            const incomplete = !room.temperature || !room.humidity;
            wrapper.open = firstRender ? (rooms.length === 1 || incomplete) : (previouslyOpen.has(index) || incomplete);
            wrapper.innerHTML = `
                <summary>
                    <span class="room-dot"></span>
                    <span class="room-title"><span class="room-name"></span><span class="room-sub"></span></span>
                    <span class="room-actions">
                        <button type="button" class="icon up" title="▲"><ha-icon icon="mdi:arrow-up"></ha-icon></button>
                        <button type="button" class="icon down" title="▼"><ha-icon icon="mdi:arrow-down"></ha-icon></button>
                        <button type="button" class="icon remove" title="${this.t('editor.buttons.remove_room')}"><ha-icon icon="mdi:delete-outline"></ha-icon></button>
                    </span>
                </summary>
                <div class="room-body">
                    <ha-form></ha-form>
                    <div class="color-row">
                        <span class="color-label">${this.t('editor.fields.color')}</span>
                        <div class="swatches"></div>
                    </div>
                </div>
            `;
            const up = wrapper.querySelector('.up');
            const down = wrapper.querySelector('.down');
            const remove = wrapper.querySelector('.remove');
            up.disabled = index === 0;
            down.disabled = index === rooms.length - 1;
            remove.disabled = rooms.length === 1;
            const action = (handler) => (event) => {
                event.preventDefault();
                event.stopPropagation();
                handler();
            };
            up.addEventListener('click', action(() => this.moveRoom(index, -1)));
            down.addEventListener('click', action(() => this.moveRoom(index, 1)));
            remove.addEventListener('click', action(() => this.removeRoom(index)));
            const form = wrapper.querySelector('ha-form');
            form.computeLabel = (schema) => this.t(`editor.fields.${schema.name}`);
            form.computeHelper = (schema) => (schema.name === 'target_phase' ? this.t('editor.helpers.target_phase') : undefined);
            form.addEventListener('value-changed', (event) => this.onRoomChanged(index, {...event.detail.value, color: this._config.rooms[index].color}));
            this.buildColorRow(wrapper, index);
            this.updateRoomHeader(wrapper, room, index);
            return wrapper;
        }));
    }

    buildColorRow(wrapper, index) {
        const swatches = wrapper.querySelector('.swatches');
        const make = (value, title) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'swatch';
            button.dataset.value = value;
            button.title = title;
            if (value) button.style.background = value;
            else button.textContent = 'A';
            button.addEventListener('click', () => this.setRoomColor(index, value || undefined));
            return button;
        };
        const custom = document.createElement('label');
        custom.className = 'swatch custom';
        custom.title = '#';
        custom.innerHTML = '<ha-icon icon="mdi:eyedropper-variant"></ha-icon><input type="color">';
        custom.querySelector('input').addEventListener('change', (event) => this.setRoomColor(index, event.target.value));
        swatches.replaceChildren(make('', 'Auto'), ...ROOM_COLORS.map(color => make(color, color)), custom);
    }

    updateColorRow(wrapper, room, index) {
        if (!wrapper) return;
        const current = (room.color || '').toLowerCase();
        let matched = !current;
        wrapper.querySelectorAll('.swatch[data-value]').forEach(button => {
            const selected = button.dataset.value.toLowerCase() === current;
            if (selected) matched = true;
            button.classList.toggle('selected', selected);
        });
        const custom = wrapper.querySelector('.swatch.custom');
        custom.classList.toggle('selected', !matched);
        custom.style.background = matched ? '' : room.color;
        custom.querySelector('input').value = /^#[0-9a-f]{6}$/i.test(room.color || '') ? room.color : ROOM_COLORS[index % ROOM_COLORS.length];
    }

    setRoomColor(index, color) {
        const config = clone(this._config);
        if (color) config.rooms[index].color = color;
        else delete config.rooms[index].color;
        if (sameJson(config, this._config)) return;
        this.commit(config);
        this.refresh();
    }

    updateRoomHeader(wrapper, room, index) {
        if (!wrapper) return;
        const color = room.color || ROOM_COLORS[index % ROOM_COLORS.length];
        wrapper.style.setProperty('--room-color', color);
        wrapper.querySelector('.room-name').textContent = room.name || `${this.t('card.room')} ${index + 1}`;
        const friendly = (id) => {
            const stateObj = id && this._hass && this._hass.states ? this._hass.states[id] : undefined;
            return stateObj && stateObj.attributes && stateObj.attributes.friendly_name ? stateObj.attributes.friendly_name : id;
        };
        const parts = [room.temperature, room.humidity].filter(Boolean).map(friendly);
        const sub = wrapper.querySelector('.room-sub');
        sub.textContent = parts.length ? parts.join(' · ') : this.t('editor.room_missing_sensors');
        sub.classList.toggle('missing', parts.length < 2);
    }

    // ---------------------------------------------------------------- schemas
    roomSchema(room = {}) {
        const phaseOptions = [{value: '', label: this.t('editor.no_target')}]
            .concat(this.phases.map(phase => ({value: phase.className, label: phase.label || phase.className})));
        return [
            {name: 'name', selector: {text: {}}},
            {name: 'temperature', required: true, selector: {entity: {filter: TEMPERATURE_FILTER}}},
            {name: 'humidity', required: true, selector: {entity: {filter: HUMIDITY_FILTER}}},
            {
                type: 'expandable',
                name: '',
                flatten: true,
                title: this.t('editor.sections.room_optional'),
                icon: 'mdi:tune-variant',
                expanded: OPTIONAL_ROOM_KEYS.some(key => room[key] !== undefined && room[key] !== ''),
                schema: [
                    {name: 'leaf_temperature', selector: {entity: {filter: TEMPERATURE_FILTER}}},
                    {name: 'vpd', selector: {entity: {filter: VPD_FILTER}}},
                    {name: 'target_phase', selector: {select: {mode: 'dropdown', options: phaseOptions}}},
                ],
            },
        ];
    }

    optionSchemas() {
        const number = (min, max, step, mode = 'box', unit) => ({number: {min, max, step, mode, unit_of_measurement: unit}});
        const toggle = (name) => ({name, selector: {boolean: {}}});
        const zoomOn = this._config.enable_zoom !== false;
        return {
            chart: [
                {
                    type: 'grid', name: '', schema: [
                        {name: 'min_temperature', selector: number(-50, 150, 0.5)},
                        {name: 'max_temperature', selector: number(-50, 150, 0.5)},
                        {name: 'min_humidity', selector: number(0, 100, 1, 'box', '%')},
                        {name: 'max_humidity', selector: number(0, 100, 1, 'box', '%')},
                        {name: 'min_height', selector: number(120, 1000, 10, 'box', 'px')},
                        {name: 'leaf_temperature_offset', selector: {text: {}}},
                    ],
                },
            ],
            features: [
                {
                    type: 'grid', name: '', schema: [
                        toggle('is_bar_view'), toggle('enable_axes'),
                        toggle('enable_tooltip'), toggle('enable_show_always_information'),
                        toggle('enable_legend'), toggle('enable_triangle'),
                        toggle('enable_crosshair'), toggle('enable_zoom'),
                        toggle('enable_cycle_rooms'),
                        // right below "Zoom" and only while zoom is on
                        ...(zoomOn ? [toggle('enable_wheel_zoom')] : []),
                        toggle('enable_dewpoint'),
                    ],
                },
                {
                    name: 'tap_action', selector: {
                        select: {
                            mode: 'dropdown', options: [
                                {value: 'none', label: this.t('editor.tap_actions.none')},
                                {value: 'more-info', label: this.t('editor.tap_actions.more-info')},
                            ],
                        },
                    },
                },
            ],
            history: [
                {name: 'history_hours', selector: number(0, 168, 1, 'slider', 'h')},
                toggle('enable_phase_stats'),
                toggle('enable_mold_risk'),
                {
                    type: 'grid', name: '', schema: [
                        {name: 'mold_risk_humidity', selector: number(50, 100, 1, 'box', '%')},
                        {name: 'mold_risk_hours', selector: number(1, 48, 0.5, 'box', 'h')},
                    ],
                },
            ],
            texts: [
                {type: 'grid', name: '', schema: TEXT_KEYS.map(name => ({name, selector: {text: {}}}))},
            ],
        };
    }

    // ---------------------------------------------------------------- updates
    commit(config) {
        const cleaned = clone(config);
        if (cleaned.vpd_phases && sameJson(cleaned.vpd_phases, DEFAULT_PHASES)) delete cleaned.vpd_phases;
        this._config = cleaned;
        this.fireEvent(this, 'config-changed', {config: cleaned});
    }

    onOptionsChanged(formName, value) {
        const config = clone(this._config);
        const fields = [];
        const collect = (schema) => schema.forEach(item => (item.schema ? collect(item.schema) : fields.push(item.name)));
        collect(this.optionSchemas()[formName] || []);
        fields.forEach(key => {
            const newValue = value[key];
            const empty = newValue === undefined || newValue === null || newValue === '';
            if (TEXT_KEYS.includes(key)) {
                if (empty) delete config[key];
                else config[key] = newValue;
                return;
            }
            if (empty || (key in DEFAULTS && newValue === DEFAULTS[key] && !(key in this._config))) {
                if (empty) delete config[key];
                return;
            }
            config[key] = key === 'leaf_temperature_offset' && /^-?\d+([.,]\d+)?$/.test(String(newValue).trim())
                ? parseFloat(String(newValue).replace(',', '.'))
                : newValue;
        });
        if (sameJson(config, this._config)) return;
        this.commit(config);
        this.refresh();
    }

    onRoomChanged(index, value) {
        const config = clone(this._config);
        const room = {};
        Object.entries(value || {}).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') room[key] = val;
        });
        if (sameJson(room, config.rooms[index])) return;
        config.rooms[index] = room;
        this.commit(config);
        this.refresh();
    }

    addRoom() {
        const config = clone(this._config);
        config.rooms.push({});
        this.commit(config);
        this.refresh();
    }

    removeRoom(index) {
        if (this._config.rooms.length <= 1) return;
        const config = clone(this._config);
        config.rooms.splice(index, 1);
        this.commit(config);
        this.refresh();
    }

    moveRoom(index, direction) {
        const target = index + direction;
        if (target < 0 || target >= this._config.rooms.length) return;
        const config = clone(this._config);
        [config.rooms[index], config.rooms[target]] = [config.rooms[target], config.rooms[index]];
        this.commit(config);
        this._roomCount = -1;
        this.refresh();
    }

    // ----------------------------------------------------------------- phases
    sliderMax() {
        const borders = this.phases.slice(0, -1).map(phase => Number(phase.upper)).filter(Number.isFinite);
        return Math.max(2.5, Math.ceil(((borders.length ? Math.max(...borders) : 1.6) + 0.6) * 2) / 2);
    }

    updatePhases(mutator) {
        const config = clone(this._config);
        const phases = clone(this.phases);
        mutator(phases);
        if (phases.length) {
            delete phases[0].lower;
            delete phases[phases.length - 1].upper;
        }
        config.vpd_phases = phases;
        this.commit(config);
        this.refresh();
    }

    setPhaseBorder(index, value) {
        this.updatePhases(phases => {
            phases[index].upper = value;
            phases[index + 1].lower = value;
        });
    }

    addPhase() {
        this.updatePhases(phases => {
            const last = phases[phases.length - 1];
            const start = Number(last.lower) || 0;
            const border = Math.round((start + 0.4) * 100) / 100;
            last.upper = border;
            phases.push({
                lower: border,
                className: `phase-${phases.length + 1}`,
                color: `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')}`,
            });
        });
    }

    removePhase(index) {
        this.updatePhases(phases => {
            if (phases.length <= 2) return;
            const [removed] = phases.splice(index, 1);
            if (index > 0 && index < phases.length) {
                phases[index].lower = removed.lower;
                phases[index - 1].upper = removed.lower;
            }
        });
    }

    resetPhases() {
        const config = clone(this._config);
        delete config.vpd_phases;
        this.commit(config);
        this.refresh();
    }

    renderPhaseList() {
        const list = this.shadowRoot.querySelector('.phase-list');
        if (!list) return;
        const phases = this.phases;
        const focused = this.shadowRoot.activeElement;
        if (focused && list.contains(focused) && list.children.length === phases.length) {
            // user is typing: only refresh ranges, keep the inputs
            phases.forEach((phase, index) => {
                const range = list.children[index].querySelector('.phase-range');
                if (range) range.textContent = this.phaseRange(phase);
            });
            return;
        }
        list.replaceChildren(...phases.map((phase, index) => {
            const row = document.createElement('div');
            row.className = 'phase-row';
            row.innerHTML = `
                <input type="color">
                <input type="text" class="label" placeholder="${this.t('editor.fields.phase_label')}">
                <input type="text" class="name" placeholder="${this.t('editor.fields.phase_name')}">
                <button type="button" class="icon remove" title="${this.t('editor.buttons.remove')}">✕</button>
                <div class="phase-range"></div>
            `;
            const color = row.querySelector('input[type="color"]');
            const label = row.querySelector('.label');
            const name = row.querySelector('.name');
            color.value = /^#[0-9a-f]{6}$/i.test(phase.color) ? phase.color : '#999999';
            label.value = phase.label || '';
            name.value = phase.className || '';
            row.querySelector('.phase-range').textContent = this.phaseRange(phase);
            row.querySelector('.remove').disabled = phases.length <= 2;
            color.addEventListener('change', () => this.updatePhases(p => {
                p[index].color = color.value;
            }));
            const onLabel = this.debounce(() => this.updatePhases(p => {
                if (label.value.trim()) p[index].label = label.value.trim();
                else delete p[index].label;
            }), 600);
            const onName = this.debounce(() => this.updatePhases(p => {
                const cleaned = name.value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
                if (cleaned) p[index].className = cleaned;
            }), 600);
            label.addEventListener('input', onLabel);
            name.addEventListener('input', onName);
            row.querySelector('.remove').addEventListener('click', () => this.removePhase(index));
            return row;
        }));
    }

    phaseRange(phase) {
        const lower = phase.lower !== undefined ? Number(phase.lower).toFixed(2) : '−∞';
        const upper = phase.upper !== undefined ? Number(phase.upper).toFixed(2) : '∞';
        return `${lower} – ${upper} kPa`;
    }

    // ---------------------------------------------------------------- formula
    initFormula() {
        const textarea = this.shadowRoot.querySelector('textarea');
        const errorEl = this.shadowRoot.querySelector('.error');
        const source = methods.calculateVPD.toString();
        const defaultBody = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}')).trim();
        textarea.value = this._config.calculateVPD || defaultBody;
        const apply = this.debounce(() => {
            const body = textarea.value.trim();
            const config = clone(this._config);
            if (body === '' || body === defaultBody) {
                errorEl.textContent = '';
                if (config.calculateVPD === undefined) return;
                delete config.calculateVPD;
            } else {
                try {
                    const fn = new Function('Tleaf', 'Tair', 'RH', 'unit_of_measurement', body);
                    const test = parseFloat(fn(23, 25, 60, '°C'));
                    if (!Number.isFinite(test)) throw new Error('no number returned (test: Tleaf=23, Tair=25, RH=60)');
                    errorEl.textContent = '';
                } catch (error) {
                    errorEl.textContent = `${this.t('editor.formula_error')}: ${error.message}`;
                    return;
                }
                if (config.calculateVPD === body) return;
                config.calculateVPD = body;
            }
            this.commit(config);
        }, 800);
        textarea.addEventListener('input', apply);
    }
}

Object.assign(HaVpdChartEditor.prototype, {debounce: methods.debounce, fireEvent: methods.fireEvent});

if (!customElements.get('ha-vpd-chart-editor')) {
    customElements.define('ha-vpd-chart-editor', HaVpdChartEditor);
}
