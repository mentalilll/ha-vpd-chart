import {describe, expect, it} from 'vitest';
import {methods} from '../src/methods.js';
import {history} from '../src/history.js';
import {DEFAULT_PHASES} from '../src/const.js';

const MIN5 = 5 * 60 * 1000;

const createContext = (callWS) => Object.assign(Object.create({...methods, ...history}), {
    vpd_phases: JSON.parse(JSON.stringify(DEFAULT_PHASES)),
    config: {history_hours: 1, rooms: [{temperature: 'sensor.t', humidity: 'sensor.h'}]},
    calculateVPD: methods.calculateVPD,
    _hass: {
        callWS,
        states: {
            'sensor.t': {state: '25', attributes: {unit_of_measurement: '°C'}},
            'sensor.h': {state: '60', attributes: {}},
        },
    },
});

describe('history', () => {
    it('pairs statistics buckets exactly', async () => {
        const start = Math.floor(Date.now() / MIN5) * MIN5 - 6 * MIN5;
        const rows = (values) => values.map((mean, i) => ({start: start + i * MIN5, mean}));
        const ctx = createContext(async (msg) => {
            if (msg.type === 'recorder/statistics_during_period') {
                return {'sensor.t': rows([24, 25, 26]), 'sensor.h': rows([60, 60, 50])};
            }
            throw new Error('unexpected');
        });
        await ctx.refreshHistory(true);
        const [room] = ctx._history;
        expect(room.points).toHaveLength(3);
        expect(room.points[2].temperature).toBe(26);
        expect(room.points[2].humidity).toBe(50);
        expect(room.stats.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1, 5);
    });

    it('falls back to the state history and resamples it', async () => {
        const now = Date.now();
        const ctx = createContext(async (msg) => {
            if (msg.type === 'recorder/statistics_during_period') return {};
            return {
                'sensor.t': [{s: '20', lu: (now - 50 * 60000) / 1000}, {s: '22', lu: (now - 20 * 60000) / 1000}],
                'sensor.h': [{s: '70', lu: (now - 55 * 60000) / 1000}],
            };
        });
        await ctx.refreshHistory(true);
        const points = ctx._history[0].points;
        expect(points.length).toBeGreaterThan(5);
        expect(points[0].temperature).toBe(20);
        expect(points[points.length - 1].temperature).toBe(22);
        expect(points.every(p => p.humidity === 70)).toBe(true);
    });

    it('measures the longest uninterrupted time above the mould threshold', () => {
        const ctx = createContext(async () => ({}));
        ctx.config.mold_risk_humidity = 80;
        const grid = new Map();
        const values = [85, 85, 70, 81, 82, 83, 84, 60];
        values.forEach((v, i) => grid.set(i * MIN5, v));
        const exposure = ctx.calculateMoldExposure(grid, MIN5);
        expect(exposure.longestMs).toBe(4 * MIN5);
        expect(exposure.totalMs).toBe(6 * MIN5);
    });

    it('counts the time per phase', () => {
        const ctx = createContext(async () => ({}));
        const phase = (vpd) => ctx.getPhase(vpd);
        const stats = ctx.calculatePhaseStats([{phase: phase(1)}, {phase: phase(1)}, {phase: phase(1.4)}, {phase: phase(0.5)}]);
        expect(stats.map(s => [s.phase.className, s.share])).toEqual([
            ['early-veg', 0.25], ['late-veg', 0.5], ['mid-late-flower', 0.25],
        ]);
    });
});
