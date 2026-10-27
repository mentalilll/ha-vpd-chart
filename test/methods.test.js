import {describe, expect, it} from 'vitest';
import {methods} from '../src/methods.js';
import {DEFAULT_PHASES} from '../src/const.js';

const createContext = (overrides = {}) => Object.assign(Object.create(methods), {
    vpd_phases: JSON.parse(JSON.stringify(DEFAULT_PHASES)),
    config: {},
    calculateVPD: methods.calculateVPD,
    _hass: {states: {}},
}, overrides);

const state = (value, unit) => ({state: String(value), attributes: unit ? {unit_of_measurement: unit} : {}});

describe('VPD calculation', () => {
    it('calculates the leaf VPD', () => {
        const ctx = createContext();
        expect(ctx.computeVPD(23, 25, 60, '°C')).toBeCloseTo(0.91, 2);
    });

    it('gives the same result for °F and °C', () => {
        const ctx = createContext();
        const celsius = ctx.computeVPD(23, 25, 60, '°C');
        const fahrenheit = ctx.computeVPD(23 * 9 / 5 + 32, 25 * 9 / 5 + 32, 60, '°F');
        expect(Math.abs(celsius - fahrenheit)).toBeLessThan(0.011);
    });

    it('never throws for a broken custom formula', () => {
        const ctx = createContext({calculateVPD: () => { throw new Error('boom'); }, _vpdFormulaErrorLogged: true});
        expect(Number.isNaN(ctx.computeVPD(1, 2, 3))).toBe(true);
    });

    it('returns NaN for invalid input', () => {
        expect(Number.isNaN(createContext().computeVPD(NaN, 25, 60))).toBe(true);
    });
});

describe('phases', () => {
    it('uses inclusive lower and exclusive upper borders', () => {
        const ctx = createContext();
        expect(ctx.getPhaseClass(0.4)).toBe('early-veg');
        expect(ctx.getPhaseClass(0.39)).toBe('under-transpiration');
        expect(ctx.getPhaseClass(1.6)).toBe('danger-zone');
        expect(ctx.getPhaseClass(-0.2)).toBe('gray-danger-zone');
        expect(ctx.getPhaseClass(NaN)).toBe('');
    });

    it('keeps class and colour consistent', () => {
        const ctx = createContext();
        for (let v = -0.5; v < 3; v += 0.01) {
            expect(ctx.getColorForVpd(v)).toBe(ctx.getPhase(v).color);
        }
    });

    it('prefers the label for display', () => {
        const ctx = createContext({vpd_phases: [{upper: 1, className: 'a', label: 'Wachstum', color: '#111111'}, {lower: 1, className: 'b', color: '#222222'}]});
        expect(ctx.getPhaseLabel(0.5)).toBe('Wachstum');
        expect(ctx.getPhaseLabel(1.5)).toBe('b');
        expect(ctx.findPhase('Wachstum').className).toBe('a');
    });
});

describe('leaf temperature offset', () => {
    it('accepts numbers, numeric strings and entities', () => {
        const ctx = createContext({_hass: {states: {'input_number.off': state(3.5), 'input_number.bad': state('unavailable')}}});
        ctx.config = {leaf_temperature_offset: 'input_number.off'};
        expect(ctx.getLeafTemperatureOffset()).toBe(3.5);
        ctx.config = {leaf_temperature_offset: 'input_number.bad'};
        expect(ctx.getLeafTemperatureOffset()).toBe(2);
        ctx.config = {leaf_temperature_offset: 'input_number.missing'};
        expect(ctx.getLeafTemperatureOffset()).toBe(2);
        ctx.config = {leaf_temperature_offset: '1,5'};
        expect(ctx.getLeafTemperatureOffset()).toBe(1.5);
        ctx.config = {leaf_temperature_offset: 0};
        expect(ctx.getLeafTemperatureOffset()).toBe(0);
    });
});

describe('room data', () => {
    const states = {
        't': state(25, '°C'), 'h': state(60, '%'), 'l': state(23, '°C'),
        'bad': state('unavailable', '°C'), 'v': state(1.23, 'kPa'), 'wet': state(99, '%'),
    };

    it('uses the leaf sensor when available', () => {
        const data = createContext({_hass: {states}}).getRoomData({temperature: 't', humidity: 'h', leaf_temperature: 'l'});
        expect(data.valid).toBe(true);
        expect(data.leafOffset).toBe(2);
        expect(data.hasLeafSensor).toBe(true);
    });

    it('marks rooms with missing or unavailable sensors as invalid', () => {
        const ctx = createContext({_hass: {states}});
        expect(ctx.getRoomData({temperature: 'bad', humidity: 'h'}).valid).toBe(false);
        expect(ctx.getRoomData({temperature: 'missing', humidity: 'h'}).valid).toBe(false);
    });

    it('prefers an external VPD sensor', () => {
        const data = createContext({_hass: {states}}).getRoomData({temperature: 't', humidity: 'h', vpd: 'v'});
        expect(data.vpd).toBe(1.23);
    });

    it('flags rooms outside their target phase', () => {
        const ctx = createContext({_hass: {states}});
        expect(ctx.getRoomData({temperature: 't', humidity: 'h', target_phase: 'late-veg'}).offTarget).toBe(false);
        expect(ctx.getRoomData({temperature: 't', humidity: 'h', target_phase: 'early-veg'}).offTarget).toBe(true);
    });

    it('detects condensation risk near the dew point', () => {
        const ctx = createContext({_hass: {states}});
        expect(ctx.getRoomData({temperature: 't', humidity: 'h'}).condensation).toBe(false);
        expect(ctx.getRoomData({temperature: 't', humidity: 'wet'}).condensation).toBe(true);
    });
});

describe('dew point', () => {
    it('matches the Magnus formula in °C and °F', () => {
        const ctx = createContext();
        expect(ctx.calculateDewPoint(60, 25, '°C')).toBeCloseTo(16.7, 1);
        expect(ctx.calculateDewPoint(60, 77, '°F')).toBeCloseTo(16.7 * 9 / 5 + 32, 0);
    });
});
