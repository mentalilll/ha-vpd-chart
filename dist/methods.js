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
    checkIfFileExists(url) {
        let http = new XMLHttpRequest();
        http.open('HEAD', url, false);
        http.send();
        return http.status != 404;
    },
}