export const methods = {
    calculateVPD(Tleaf, Tair, RH, unit_of_measuerment = "°F") {
        if (unit_of_measuerment === "°F" || unit_of_measuerment === "F") {
            Tleaf = (Tleaf - 32) * 5 / 9;
            Tair = (Tair - 32) * 5 / 9;
        }
        const VPleaf = 610.7 * Math.exp(17.27 * Tleaf / (Tleaf + 237.3)) / 1000;
        const VPair = 610.7 * Math.exp(17.27 * Tair / (Tair + 237.3)) / 1000 * RH / 100;
        return Number(VPleaf - VPair).toFixed(2);
    },
    calculateDP(relativeHumidity, airTemperature) {
        const MIN_RELATIVE_HUMIDITY = 0.0000001; // Minimal relative humidity to avoid log(0)
        if (relativeHumidity === 0) relativeHumidity = MIN_RELATIVE_HUMIDITY;
        const MAGNUS_CONSTANT = 243.12;
        const logarithm = Math.log(relativeHumidity / 100) + 17.62 * airTemperature / (MAGNUS_CONSTANT + airTemperature);
        return MAGNUS_CONSTANT * logarithm / (17.62 - logarithm);
    },
    getPhaseClass(vpd) {
        for (const phase of this.vpd_phases) {
            if (phase.upper === undefined) {
                if (vpd >= phase.lower) {
                    return phase.className;
                }
            } else if (vpd <= phase.upper && (!phase.lower || vpd >= phase.lower)) {
                return phase.className;
            }
        }
        return '';
    },
    toFixedNumber(value, digits = 2) {
        return parseFloat(parseFloat(value).toFixed(digits));
    },
    getColorByClassName(className) {
        for (const phase of this.vpd_phases) {
            if (phase.className === className) {
                return phase.color;
            }
        }
        return '';
    },
    shouldUpdate() {
        for (let key in this.config) {
            if (this.config[key] !== this.configMemory[key]) {
                this.configMemory = this.config;
                return true;
            }
        }

        return false;
    },
    debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                func.apply(this, args);
            }, timeout);
        };
    },
    async getEntityHistory(entityId, hours = 24) {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
        const isoStartTime = startTime.toISOString();
        const isoEndTime = endTime.toISOString();
        if (entityId === undefined) return [];
        try {
            const history = await this._hass.callApi('GET', `history/period/${isoStartTime}?filter_entity_id=${entityId}&end_time=${isoEndTime}&minimal_response&significant_changes_only&no_attributes`);
            return this.filterEntriesByHour(history[0]);
        } catch (error) {
            return [];
        }
    },
    createVPDMatrix(minTemperature, maxTemperature, stepsTemperature, maxHumidity, minHumidity, stepsHumidity, leafTemperatureOffset) {
        const temperatureSteps = Math.ceil((maxTemperature - minTemperature) / stepsTemperature) + 1;
        const humiditySteps = Math.ceil((maxHumidity - minHumidity) / stepsHumidity) + 1;
        const vpdMatrix = new Array(temperatureSteps);

        // Vorberechen der Klassen und Farben für VPD-Werte
        const vpdClassCache = new Map();
        const vpdColorCache = new Map();

        for (let i = 0; i < temperatureSteps; i++) {
            const Tair = minTemperature + i * stepsTemperature;
            const Tleaf = Tair - leafTemperatureOffset;
            const row = new Array(humiditySteps);

            for (let j = 0; j < humiditySteps; j++) {
                const RH = maxHumidity - j * stepsHumidity;
                const vpd = this.calculateVPD(Tleaf, Tair, RH, this.unit_temperature);
                const fixedVpd = this.toFixedNumber(vpd);

                let className = vpdClassCache.get(fixedVpd);
                if (className === undefined) {
                    className = this.getPhaseClass(vpd);
                    vpdClassCache.set(fixedVpd, className);
                }

                let color = vpdColorCache.get(fixedVpd);
                if (color === undefined) {
                    color = this.getColorForVpd(vpd);
                    vpdColorCache.set(fixedVpd, color);
                }

                row[j] = {vpd: fixedVpd, className, color};
            }

            vpdMatrix[i] = row;
        }

        return vpdMatrix;
    },
    stringToColor(str) {
        let hash = 0;
        let color = '#';

        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        let randomFactor = Math.sin(hash) * 10000;
        randomFactor = randomFactor - Math.floor(randomFactor);

        hash = (hash + Math.floor(randomFactor * 0xFFFFFF)) & 0xFFFFFF;

        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).slice(-2);
        }

        return color;
    },
    getLeafTemperatureOffset() {
        let offset = 2;
        if (typeof this.config.leaf_temperature_offset === 'number') {

            return this.config.leaf_temperature_offset;
        }
        if (typeof this.config.leaf_temperature_offset === 'string') {
            offset = this._hass.states[this.config.leaf_temperature_offset].state;
            if (!isNaN(offset)) {
                return offset;
            }
        }
        return offset;
    },
    copyConfig() {
        return JSON.parse(JSON.stringify(this.config));
    },
    createTextField(label, index, value) {
        const textField = document.createElement('ha-textfield');
        textField.style = 'width:100%';
        textField.label = label;
        textField.setAttribute('data-index', index);
        textField.value = value || '';
        return textField;
    },
    getSensorsByType(hass, type) {
        const sensors = Object.keys(hass.states).filter(entity_id => {
            const entity = hass.states[entity_id];
            return entity_id.startsWith('sensor.') && entity.attributes.device_class === type;
        });

        return sensors.map(sensor_id => ({
            entry_id: sensor_id,
            title: hass.states[sensor_id].attributes.friendly_name || sensor_id,
        }));
    },
    createHaListItem(item) {
        const haListItem = document.createElement('ha-list-item');
        haListItem.twoline = !!item.entry_id;

        const primarySpan = document.createElement('span');
        primarySpan.textContent = item.title;
        haListItem.appendChild(primarySpan);

        const secondarySpan = document.createElement('span');
        secondarySpan.setAttribute('slot', 'secondary');
        secondarySpan.textContent = item.entry_id;

        haListItem.appendChild(secondarySpan);

        return haListItem;
    },
    createComboBox(label, index, value, property, type) {
        const temperatureSensors = this.getSensorsByType(this._hass, type);

        const haComboBox = document.createElement('ha-combo-box');
        haComboBox.hass = this._hass;
        haComboBox.label = label;
        haComboBox.value = value;
        haComboBox.required = false;
        haComboBox.placeholder = 'Select Sensor';
        haComboBox.disabled = false;
        haComboBox.helper = '';
        haComboBox.renderer = (root, obj) => {
            return this.createHaListItem(obj.item, this._hass);
        }
        haComboBox.items = temperatureSensors;
        haComboBox.itemValuePath = 'entry_id';
        haComboBox.itemIdPath = 'entry_id';
        haComboBox.itemLabelPath = 'title';
        haComboBox.itemSecondaryPath = 'entry_id';
        haComboBox.allowCustomValue = true;

        return haComboBox;
    },
    createCheckbox(label, index, value, property, title = '') {
        const haFormfield = document.createElement('ha-formfield');
        haFormfield.label = label;
        if (title !== '') haFormfield.title = title;
        haFormfield.setAttribute('data-index', index);
        const checkbox = document.createElement('ha-checkbox');
        checkbox.id = property;
        checkbox.checked = value;
        checkbox.setAttribute('data-configvalue', property);
        haFormfield.appendChild(checkbox);
        return haFormfield;
    },
    fireEvent(node, type, detail = {}, options = {}) {
        const event = new Event(type, {
            bubbles: options.bubbles === undefined ? true : options.bubbles,
            cancelable: Boolean(options.cancelable),
            composed: options.composed === undefined ? true : options.composed,
        });
        if (detail.config.vpd_phases !== undefined) {
            if (detail.config.vpd_phases[0] !== undefined) {
                detail.config.vpd_phases[0].lower = undefined;
            }
            if (detail.config.vpd_phases[detail.config.vpd_phases.length - 1] !== undefined) {
                detail.config.vpd_phases[detail.config.vpd_phases.length - 1].upper = undefined;
            }
        }
        event.detail = detail;
        node.dispatchEvent(event);
        return event;
    }
}