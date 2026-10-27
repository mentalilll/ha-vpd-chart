import {DEFAULT_LEAF_OFFSET, ROOM_COLORS} from './const.js';

const isSet = (value) => value !== undefined && value !== null && value !== '';

/**
 * Pure helpers shared by the card, the bar view and the editor. They are mixed into
 * the element prototypes, so `this` is the card (vpd_phases, config, _hass, ...).
 */
export const methods = {
    /**
     * Default leaf VPD formula (Tetens). Temperatures in the sensor unit, RH in %.
     * Kept as a plain function body so it can be shown and replaced in the editor.
     */
    calculateVPD(Tleaf, Tair, RH, unit_of_measurement = "°C") {
        if (unit_of_measurement === "°F" || unit_of_measurement === "F" || unit_of_measurement === "℉") {
            Tleaf = (Tleaf - 32) * 5 / 9;
            Tair = (Tair - 32) * 5 / 9;
        }
        const VPleaf = 610.7 * Math.exp(17.27 * Tleaf / (Tleaf + 237.3)) / 1000;
        const VPair = 610.7 * Math.exp(17.27 * Tair / (Tair + 237.3)) / 1000 * RH / 100;
        return Number(VPleaf - VPair).toFixed(2);
    },
    /** Safe wrapper around calculateVPD (may be a user formula). Number or NaN, never throws. */
    computeVPD(Tleaf, Tair, RH, unit = "°C") {
        if (![Tleaf, Tair, RH].every(Number.isFinite)) return NaN;
        try {
            const value = parseFloat(this.calculateVPD(Tleaf, Tair, RH, unit));
            return Number.isFinite(value) ? value : NaN;
        } catch (error) {
            if (!this._vpdFormulaErrorLogged) {
                console.warn('HA-VPD-CHART: custom calculateVPD failed, check your formula.', error);
                this._vpdFormulaErrorLogged = true;
            }
            return NaN;
        }
    },
    isFahrenheit(unit) {
        return unit === '°F' || unit === 'F' || unit === '℉';
    },
    toCelsius(value, unit) {
        return this.isFahrenheit(unit) ? (value - 32) * 5 / 9 : value;
    },
    fromCelsius(value, unit) {
        return this.isFahrenheit(unit) ? value * 9 / 5 + 32 : value;
    },
    /** Dew point (Magnus formula) in the unit of the temperature sensor. */
    calculateDewPoint(humidity, temperature, unit = '°C') {
        if (!Number.isFinite(humidity) || !Number.isFinite(temperature) || humidity <= 0) return NaN;
        const t = this.toCelsius(temperature, unit);
        const a = 17.62;
        const b = 243.12;
        const gamma = Math.log(humidity / 100) + a * t / (b + t);
        return this.fromCelsius(b * gamma / (a - gamma), unit);
    },
    numberLocale() {
        const hass = this._hass;
        return (hass && hass.locale && hass.locale.language) || (hass && hass.language) || undefined;
    },
    formatVPD(vpd) {
        if (!Number.isFinite(vpd)) return '–';
        try {
            return new Intl.NumberFormat(this.numberLocale(), {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(vpd);
        } catch {
            return vpd.toFixed(2);
        }
    },
    formatNumber(value, digits = 1) {
        if (!Number.isFinite(value)) return '–';
        try {
            return new Intl.NumberFormat(this.numberLocale(), {maximumFractionDigits: digits}).format(value);
        } catch {
            const factor = 10 ** digits;
            return (Math.round(value * factor) / factor).toString();
        }
    },
    /** Value with unit, separated by a narrow no-break space (25,3 °C, 56 %). */
    formatWithUnit(value, unit, digits = 1) {
        return `${this.formatNumber(value, digits)}\u202f${unit}`;
    },
    /**
     * Phase of a VPD value. Lower bound inclusive, upper bound exclusive
     * (0.4 belongs to the phase starting at 0.4). Out of range values clamp to the first / last phase.
     */
    getPhase(vpd) {
        const value = Number(vpd);
        const phases = this.vpd_phases || [];
        if (!Number.isFinite(value) || phases.length === 0) return null;

        for (const phase of phases) {
            const lowerOk = !isSet(phase.lower) || value >= Number(phase.lower);
            const upperOk = !isSet(phase.upper) || value < Number(phase.upper);
            if (lowerOk && upperOk) return phase;
        }
        const first = phases[0];
        if (isSet(first.lower) && value < Number(first.lower)) return first;
        return phases[phases.length - 1];
    },
    getPhaseClass(vpd) {
        const phase = this.getPhase(vpd);
        return phase ? phase.className : '';
    },
    getPhaseLabel(phaseOrVpd) {
        const phase = typeof phaseOrVpd === 'object' ? phaseOrVpd : this.getPhase(phaseOrVpd);
        return phase ? (phase.label || phase.className) : '';
    },
    getColorForVpd(vpd) {
        const phase = this.getPhase(vpd);
        return phase && phase.color ? phase.color : 'grey';
    },
    findPhase(nameOrClass) {
        if (!isSet(nameOrClass)) return null;
        return (this.vpd_phases || []).find(p => p.className === nameOrClass || p.label === nameOrClass) || null;
    },
    toFixedNumber(value, digits = 2) {
        return parseFloat(parseFloat(value).toFixed(digits));
    },
    debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), timeout);
        };
    },
    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },
    parseState(entityId) {
        if (!entityId || !this._hass || !this._hass.states) return NaN;
        const stateObj = this._hass.states[entityId];
        if (!stateObj) return NaN;
        const value = parseFloat(stateObj.state);
        return Number.isFinite(value) ? value : NaN;
    },
    getTemperatureUnit(room) {
        const stateObj = room && this._hass && this._hass.states ? this._hass.states[room.temperature] : undefined;
        const unit = stateObj && stateObj.attributes ? stateObj.attributes.unit_of_measurement : undefined;
        return unit || (this.config && this.config.unit_temperature) || '°C';
    },
    getRoomName(room, index) {
        return isSet(room.name) ? String(room.name) : `${this.t ? this.t('card.room') : 'Room'} ${index + 1}`;
    },
    getRoomColor(room, index) {
        return room.color || ROOM_COLORS[index % ROOM_COLORS.length];
    },
    /**
     * Leaf temperature offset from config: number, numeric string or entity id.
     * Falls back to 2 when the entity is missing or unavailable.
     */
    getLeafTemperatureOffset() {
        const configured = this.config ? this.config.leaf_temperature_offset : undefined;
        if (typeof configured === 'number' && Number.isFinite(configured)) return configured;
        if (typeof configured === 'string' && configured.trim() !== '') {
            const trimmed = configured.trim();
            if (/^-?\d+([.,]\d+)?$/.test(trimmed)) return parseFloat(trimmed.replace(',', '.'));
            const value = this.parseState(trimmed);
            if (Number.isFinite(value)) return value;
        }
        return DEFAULT_LEAF_OFFSET;
    },
    /** All values needed to display one room. Never throws; invalid values are NaN. */
    getRoomData(room) {
        const temperature = this.parseState(room.temperature);
        const humidity = this.parseState(room.humidity);
        const unit = this.getTemperatureUnit(room);
        const sensorLeafTemperature = this.parseState(room.leaf_temperature);
        const hasLeafSensor = Number.isFinite(sensorLeafTemperature);

        let leafTemperature;
        let leafOffset;
        if (hasLeafSensor && Number.isFinite(temperature)) {
            leafTemperature = sensorLeafTemperature;
            leafOffset = temperature - sensorLeafTemperature;
        } else {
            leafOffset = this.getLeafTemperatureOffset();
            leafTemperature = temperature - leafOffset;
        }

        let vpd = this.parseState(room.vpd);
        if (!Number.isFinite(vpd)) {
            vpd = this.computeVPD(leafTemperature, temperature, humidity, unit);
        }

        const dewPoint = this.calculateDewPoint(humidity, temperature, unit);
        // condensation risk when the leaf is less than 1 °C (1.8 °F) above the dew point
        const margin = this.isFahrenheit(unit) ? 1.8 : 1;
        const condensation = Number.isFinite(dewPoint) && Number.isFinite(leafTemperature) && leafTemperature - dewPoint < margin;

        const phase = this.getPhase(vpd);
        const targetPhase = this.findPhase(room.target_phase);
        const offTarget = !!(targetPhase && phase && targetPhase !== phase);

        const valid = Number.isFinite(temperature) && Number.isFinite(humidity) && Number.isFinite(vpd);
        return {
            temperature, humidity, leafTemperature, leafOffset, unit, vpd, valid, hasLeafSensor,
            dewPoint, condensation, phase, targetPhase, offTarget,
        };
    },
    fireEvent(node, type, detail = {}, options = {}) {
        const event = new CustomEvent(type, {
            detail,
            bubbles: options.bubbles === undefined ? true : options.bubbles,
            cancelable: Boolean(options.cancelable),
            composed: options.composed === undefined ? true : options.composed,
        });
        node.dispatchEvent(event);
        return event;
    },
};
