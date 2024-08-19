export const methods = {
    calculateVPD(Tleaf, Tair, RH) {
        const VPleaf = 610.7 * Math.exp(17.27 * Tleaf / (Tleaf + 237.3)) / 1000;
        const VPair = 610.7 * Math.exp(17.27 * Tair / (Tair + 237.3)) / 1000 * RH / 100;
        return VPleaf - VPair;
    },
    calculateRH(Tleaf, Tair, VPD) {
        const VPleaf = 610.7 * Math.exp(17.27 * Tleaf / (Tleaf + 237.3)) / 1000;
        const VPair = 610.7 * Math.exp(17.27 * Tair / (Tair + 237.3)) / 1000;
        return ((VPleaf - VPD) / VPair) * 100;
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
    createVPDMatrix(minTemperature, maxTemperature, stepsTemperature, maxHumidity, minHumidity, stepsHumidity) {
        const vpdMatrix = [];

        for (let Tair = minTemperature; Tair <= maxTemperature; Tair += stepsTemperature) {
            const row = [];
            const Tleaf = Tair - 2;

            for (let RH = minHumidity; RH <= maxHumidity; RH += stepsHumidity) {
                const vpd = this.calculateVPD(Tleaf, Tair, RH).toFixed(2);
                const className = this.getPhaseClass(vpd);
                row.push({vpd: this.toFixedNumber(vpd), className: className, color: this.getColorForVpd(vpd)});
            }
            // mirror row array
            const mirroredRow = row.slice().reverse();

            vpdMatrix.push(mirroredRow);
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
            if (this.config.leaf_temperature_offset < 2) {
                return 2;
            }
            return this.config.leaf_temperature_offset;
        }
        if (typeof this.config.leaf_temperature_offset === 'string') {
            offset = this._hass.states[this.config.leaf_temperature_offset].state;
            if (!isNaN(offset)) {
                if (offset < 2) {
                    return 2;
                }
                return offset;
            }
        }
        if (offset < 2) {
            offset = 2;
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
        haComboBox.renderer = (root, obj, index) => {
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
    createCheckbox(label, index, value, property) {
        const divElement = document.createElement('div');
        divElement.style = 'display: flex; align-items: center; padding:13px;';
        const labelElement = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = property;
        if (value) {
            checkbox.setAttribute('checked', 'checked');
        }
        checkbox.setAttribute('data-configvalue', property);
        labelElement.appendChild(checkbox);
        labelElement.innerHTML += label;
        divElement.appendChild(labelElement);
        return divElement;
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