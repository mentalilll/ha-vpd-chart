import {beforeAll, describe, expect, it} from 'vitest';

const state = (value, unit) => ({state: String(value), attributes: unit ? {unit_of_measurement: unit} : {}});
const baseStates = {
    'sensor.t1': state(25, '°C'), 'sensor.h1': state(60, '%'), 'sensor.l1': state(23, '°C'),
    'sensor.t2': state('unavailable', '°C'), 'sensor.h2': state(55, '%'),
    'sensor.tf': state(77, '°F'), 'sensor.hf': state(60, '%'),
};
const hass = (states = baseStates, language = 'de') => ({states: {...states}, language});

beforeAll(async () => {
    await import('../src/ha-vpd-chart.js');
});

const mount = (config, h = hass()) => {
    const card = document.createElement('ha-vpd-chart');
    card.setConfig(config);
    document.body.appendChild(card);
    card.hass = h;
    return card;
};

describe('ha-vpd-chart card', () => {
    it('renders all rooms and hides unavailable ones', () => {
        const card = mount({rooms: [
            {name: 'Zelt <b>1</b>', temperature: 'sensor.t1', humidity: 'sensor.h1', leaf_temperature: 'sensor.l1'},
            {name: 'Kaputt', temperature: 'sensor.t2', humidity: 'sensor.h2'},
        ]});
        const rooms = card.shadowRoot.querySelectorAll('.room');
        expect(rooms).toHaveLength(2);
        expect(rooms[0].querySelector('.tt-name').innerHTML).toBe('Zelt &lt;b&gt;1&lt;/b&gt;');
        expect(rooms[0].querySelector('.tt-details').textContent).toContain('Luft25\u202f°C');
        expect(rooms[1].classList.contains('vpd-unavailable')).toBe(true);
        const chips = card.shadowRoot.querySelectorAll('.legend-chip');
        expect(chips[1].classList.contains('unavailable')).toBe(true);
    });

    it('uses a Fahrenheit range automatically', () => {
        const card = mount({rooms: [{temperature: 'sensor.tf', humidity: 'sensor.hf'}]});
        expect(card.min_temperature).toBe(41);
        expect(card.max_temperature).toBe(95);
        const labels = [...card.shadowRoot.querySelectorAll('.axis-label.temperature')].map(l => l.textContent);
        expect(labels[0]).toContain('°F');
    });

    it('does not re-render on unrelated state changes', () => {
        const card = mount({rooms: [{temperature: 'sensor.t1', humidity: 'sensor.h1'}]});
        let renders = 0;
        const original = card.render.bind(card);
        card.render = () => { renders++; original(); };
        const states = {...baseStates};
        for (let i = 0; i < 50; i++) {
            states['sensor.other'] = state(i);
            card.hass = hass({...states});
        }
        expect(renders).toBe(0);
        card.hass = hass({...states, 'sensor.t1': state(26, '°C')});
        expect(renders).toBe(1);
    });

    it('rebuilds on config changes and validates ranges', () => {
        const card = mount({rooms: [{temperature: 'sensor.t1', humidity: 'sensor.h1'}]});
        card.setConfig({min_temperature: 15, max_temperature: 30, rooms: [{name: 'Neu', temperature: 'sensor.t1', humidity: 'sensor.h1'}]});
        expect(card.shadowRoot.querySelector('.tt-name').textContent).toBe('Neu');
        expect(() => card.setConfig({min_temperature: 30, max_temperature: 20, rooms: [{}]})).toThrow();
        expect(() => card.setConfig({})).toThrow();
    });

    it('falls back to the default formula when the custom one is broken', () => {
        const card = mount({calculateVPD: 'return (', rooms: [{temperature: 'sensor.t1', humidity: 'sensor.h1'}]});
        expect(card.shadowRoot.querySelector('.tt-vpd b').textContent).toBe('0,91');
    });

    it('renders the bar view with unavailable rooms and empty names', () => {
        const card = mount({is_bar_view: true, rooms: [
            {name: '', temperature: 'sensor.t1', humidity: 'sensor.h1'},
            {temperature: 'sensor.missing', humidity: 'sensor.h1'},
        ]});
        const bars = card.shadowRoot.querySelectorAll('.bar-room');
        expect(bars).toHaveLength(2);
        expect(bars[0].querySelector('.vpd-title').style.display).toBe('none');
        expect(bars[1].textContent).toContain('nicht verfügbar');
        expect(bars[1].querySelector('.vpd-title').textContent).toBe('Raum 2');
    });

    it('opens more-info when configured', () => {
        const card = mount({tap_action: 'more-info', rooms: [{temperature: 'sensor.t1', humidity: 'sensor.h1'}]});
        let entityId = null;
        card.addEventListener('hass-more-info', (event) => { entityId = event.detail.entityId; });
        card.shadowRoot.querySelector('.room-pointer').click();
        expect(entityId).toBe('sensor.t1');
    });

    it('pins a room via legend click', () => {
        const card = mount({rooms: [
            {name: 'A', temperature: 'sensor.t1', humidity: 'sensor.h1'},
            {name: 'B', temperature: 'sensor.tf', humidity: 'sensor.hf'},
        ]});
        card.shadowRoot.querySelectorAll('.legend-chip')[1].click();
        expect(card.getActiveIndex()).toBe(1);
        expect(card.shadowRoot.querySelectorAll('.room')[1].classList.contains('active')).toBe(true);
    });

    it('shows a mould risk warning from the humidity history', async () => {
        const MIN5 = 5 * 60 * 1000;
        const start = Math.floor(Date.now() / MIN5) * MIN5 - 100 * MIN5;
        const rows = (fn) => Array.from({length: 100}, (_, i) => ({start: start + i * MIN5, mean: fn(i)}));
        const h = hass();
        h.callWS = async (msg) => (msg.type === 'recorder/statistics_during_period'
            ? {'sensor.t1': rows(() => 22), 'sensor.h1': rows(i => (i < 90 ? 85 : 60))}
            : {});
        const card = mount({enable_mold_risk: true, mold_risk_humidity: 80, mold_risk_hours: 6, rooms: [{temperature: 'sensor.t1', humidity: 'sensor.h1'}]}, h);
        await card.refreshHistory(true);
        const mold = card.shadowRoot.querySelector('.tt-mold');
        expect(mold.hidden).toBe(false);
        expect(mold.textContent).toContain('Schimmelrisiko');
        expect(mold.textContent).toContain('7,5 h');
        expect(card.shadowRoot.querySelector('.tt-warn .mold').textContent).toContain('Schimmelrisiko');
        expect(card.shadowRoot.querySelector('.tt-alert').hidden).toBe(true);
        const room = card.shadowRoot.querySelector('.room');
        expect(room.classList.contains('has-mold')).toBe(true);
        expect(room.classList.contains('has-warning')).toBe(false);
        // trail and phase statistics stay hidden without history_hours
        expect(card.shadowRoot.querySelector('.phase-stats').hidden).toBe(true);
    });

    it('stops timers when removed', () => {
        const card = mount({enable_cycle_rooms: true, rooms: [
            {name: 'A', temperature: 'sensor.t1', humidity: 'sensor.h1'},
            {name: 'B', temperature: 'sensor.tf', humidity: 'sensor.hf'},
        ]});
        expect(card.roomCycleInterval).toBeTruthy();
        card.remove();
        expect(card.roomCycleInterval).toBeFalsy();
    });
});
