import {HISTORY_REFRESH_MS, MOLD_RISK_WINDOW_HOURS} from './const.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Loads the recent past of all room sensors and turns it into aligned points
 * (temperature, humidity, leaf temperature, VPD, phase) on a fixed time grid.
 *
 * Source 1: long term statistics (5 minute / hourly means). Buckets are identical for
 * every sensor, so values pair up exactly and survive the recorder purge.
 * Source 2 (fallback for entities without state_class, e.g. input_number):
 * the state history, resampled onto the same grid (last known value per bucket).
 */
export const history = {
    /** History is loaded for the trail / phase statistics and for the mould risk. */
    historyEnabled() {
        return !!(this.config && (this.showHistory() || this.config.enable_mold_risk) && this._hass && typeof this._hass.callWS === 'function');
    },
    /** Trail and time in phase are only shown when history_hours is set. */
    showHistory() {
        return Number(this.config && this.config.history_hours) > 0;
    },
    historyHours() {
        const hours = this.showHistory() ? Number(this.config.history_hours) : MOLD_RISK_WINDOW_HOURS;
        return Math.min(Math.max(hours, 1), 24 * 30);
    },
    resetHistory() {
        this._history = null;
        this._historyFetchedAt = 0;
        this._historyToken = (this._historyToken || 0) + 1;
        this._historyLoading = false;
    },
    startHistoryTimer() {
        this.stopHistoryTimer();
        if (!this.historyEnabled()) return;
        this._historyTimer = setInterval(() => this.refreshHistory(true), HISTORY_REFRESH_MS);
    },
    stopHistoryTimer() {
        if (this._historyTimer) {
            clearInterval(this._historyTimer);
            this._historyTimer = null;
        }
    },
    /** Loads the history (throttled). A call while loading returns the running request. */
    refreshHistory(force = false) {
        if (!this.historyEnabled()) {
            this._history = null;
            return Promise.resolve();
        }
        if (this._historyLoading && this._historyPromise) return this._historyPromise;
        const now = Date.now();
        if (!force && this._historyFetchedAt && now - this._historyFetchedAt < HISTORY_REFRESH_MS) return Promise.resolve();
        this._historyPromise = this.loadHistory(now);
        return this._historyPromise;
    },
    async loadHistory(now) {
        this._historyLoading = true;
        this._historyFetchedAt = now;
        const token = this._historyToken = (this._historyToken || 0) + 1;
        try {
            const hours = this.historyHours();
            const bucketMs = hours <= 48 ? 5 * MINUTE : HOUR;
            const endMs = now;
            const startMs = now - hours * HOUR;
            const series = await this.loadSeries(this.collectHistoryIds(), startMs, endMs, bucketMs);
            if (token !== this._historyToken) return;
            this._history = this.config.rooms.map(room => this.buildRoomHistory(room, series, bucketMs));
            if (typeof this.onHistoryLoaded === 'function') this.onHistoryLoaded();
        } catch (error) {
            console.warn('HA-VPD-CHART: could not load history', error);
            if (token === this._historyToken) this._history = null;
        } finally {
            if (token === this._historyToken) this._historyLoading = false;
        }
    },
    collectHistoryIds() {
        const ids = new Set();
        this.config.rooms.forEach(room => {
            ['temperature', 'humidity', 'leaf_temperature', 'vpd'].forEach(key => {
                if (room[key] && this._hass.states[room[key]]) ids.add(room[key]);
            });
        });
        return [...ids];
    },
    /** @returns {Map<string, Map<number, number>>} entity id -> (bucket start -> value) */
    async loadSeries(ids, startMs, endMs, bucketMs) {
        const result = new Map();
        if (!ids.length) return result;

        const startIso = new Date(startMs).toISOString();
        const endIso = new Date(endMs).toISOString();
        let statistics = {};
        try {
            statistics = await this._hass.callWS({
                type: 'recorder/statistics_during_period',
                start_time: startIso,
                end_time: endIso,
                statistic_ids: ids,
                period: bucketMs === HOUR ? 'hour' : '5minute',
                types: ['mean'],
            }) || {};
        } catch {
            statistics = {};
        }

        const missing = [];
        ids.forEach(id => {
            const grid = this.statisticsToGrid(statistics[id], bucketMs);
            if (grid.size >= 2) {
                result.set(id, grid);
            } else {
                missing.push(id);
            }
        });

        if (missing.length) {
            const states = await this._hass.callWS({
                type: 'history/history_during_period',
                start_time: startIso,
                end_time: endIso,
                entity_ids: missing,
                minimal_response: true,
                no_attributes: true,
                significant_changes_only: false,
                include_start_time_state: true,
            }) || {};
            missing.forEach(id => {
                result.set(id, this.statesToGrid(states[id], startMs, endMs, bucketMs));
            });
        }
        return result;
    },
    statisticsToGrid(rows, bucketMs) {
        const grid = new Map();
        (rows || []).forEach(row => {
            const start = typeof row.start === 'number' ? row.start : Date.parse(row.start);
            const value = Number(row.mean);
            if (Number.isFinite(start) && Number.isFinite(value)) {
                grid.set(Math.floor(start / bucketMs) * bucketMs, value);
            }
        });
        return grid;
    },
    /** Resample state changes: each bucket gets the last known value at its end. */
    statesToGrid(rows, startMs, endMs, bucketMs) {
        const points = (rows || [])
            .map(row => {
                const seconds = row.lu !== undefined ? row.lu : row.lc;
                const t = seconds !== undefined ? seconds * 1000 : Date.parse(row.last_updated || row.last_changed);
                return {t, v: parseFloat(row.s !== undefined ? row.s : row.state)};
            })
            .filter(p => Number.isFinite(p.t))
            .sort((a, b) => a.t - b.t);

        const grid = new Map();
        let index = 0;
        let current = NaN;
        for (let bucket = Math.floor(startMs / bucketMs) * bucketMs; bucket < endMs; bucket += bucketMs) {
            while (index < points.length && points[index].t < bucket + bucketMs) {
                current = points[index].v;
                index++;
            }
            if (Number.isFinite(current)) grid.set(bucket, current);
        }
        return grid;
    },
    buildRoomHistory(room, series, bucketMs) {
        const temperatures = series.get(room.temperature);
        const humidities = series.get(room.humidity);
        if (!temperatures || !humidities) return {points: [], stats: [], bucketMs, mold: null};

        const leaves = room.leaf_temperature ? series.get(room.leaf_temperature) : undefined;
        const vpds = room.vpd ? series.get(room.vpd) : undefined;
        const unit = this.getTemperatureUnit(room);
        const fallbackOffset = this.getLeafTemperatureOffset();

        const points = [];
        [...temperatures.keys()].sort((a, b) => a - b).forEach(t => {
            const temperature = temperatures.get(t);
            const humidity = humidities.get(t);
            if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) return;
            const leafTemperature = leaves && Number.isFinite(leaves.get(t)) ? leaves.get(t) : temperature - fallbackOffset;
            let vpd = vpds ? vpds.get(t) : NaN;
            if (!Number.isFinite(vpd)) vpd = this.computeVPD(leafTemperature, temperature, humidity, unit);
            if (!Number.isFinite(vpd)) return;
            points.push({t, temperature, humidity, leafTemperature, vpd, phase: this.getPhase(vpd)});
        });
        return {points, stats: this.calculatePhaseStats(points), bucketMs, mold: this.calculateMoldExposure(humidities, bucketMs)};
    },
    /**
     * Longest uninterrupted time (and total time) with humidity at or above the
     * mould threshold, based on the humidity series alone.
     */
    calculateMoldExposure(humidities, bucketMs) {
        const threshold = Number(this.config.mold_risk_humidity) || 75;
        let longest = 0;
        let current = 0;
        let total = 0;
        let previous = null;
        [...humidities.keys()].sort((a, b) => a - b).forEach(t => {
            const value = humidities.get(t);
            const contiguous = previous !== null && t - previous === bucketMs;
            if (Number.isFinite(value) && value >= threshold) {
                current = contiguous ? current + bucketMs : bucketMs;
                total += bucketMs;
                longest = Math.max(longest, current);
            } else {
                current = 0;
            }
            previous = t;
        });
        return {longestMs: longest, totalMs: total, threshold};
    },
    /** Mould risk of a room, or null when the feature is off / no history yet. */
    getMoldRisk(index) {
        if (!this.config || !this.config.enable_mold_risk || !this._history || !this._history[index]) return null;
        const mold = this._history[index].mold;
        if (!mold) return null;
        const hours = Number(this.config.mold_risk_hours) || 6;
        return {...mold, hours: mold.longestMs / 3600000, active: mold.longestMs >= hours * 3600000};
    },
    /** Share of time per phase, in phase order. */
    calculatePhaseStats(points) {
        if (!points.length) return [];
        const counts = new Map();
        points.forEach(point => {
            if (point.phase) counts.set(point.phase, (counts.get(point.phase) || 0) + 1);
        });
        return (this.vpd_phases || [])
            .filter(phase => counts.has(phase))
            .map(phase => ({phase, share: counts.get(phase) / points.length}));
    },
};
