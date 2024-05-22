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

export class HaVpdChartEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._config = {};
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
        // check if value is string but is only numeric
        if (typeof value === 'string' && !isNaN(value)) {
            value = parseFloat(value);
        }

        if(isNaN(value)) {
            value = target.value;
        }

        if(value === "on") {
            value = true;
        }

        if(value === "off") {
            value = false;
        }
        if (this._config[configValue] !== value) {
            this._config[configValue] = value;
            fireEvent(this, 'config-changed', { config: this._config });
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
    }

    render() {
        this.shadowRoot.innerHTML = `<style>
    .card-config {
        display: flex;
        flex-direction: column;
    }

    .card-config .input-item {
        margin-bottom: 8px;
    }

    .card-config .switch-item {
        padding: 8px 0;
    }
</style>
<div class="card-config">
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

    }


}

customElements.define('ha-vpd-chart-editor', HaVpdChartEditor);
