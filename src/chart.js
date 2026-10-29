import chartCss from './styles/chart.css?raw';
import {CYCLE_INTERVAL_MS, MAX_ZOOM} from './const.js';
import {methods} from './methods.js';

const ROOM_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>';
const SVG_NS = 'http://www.w3.org/2000/svg';
const PAN_THRESHOLD = 5;
const TOOLTIP_GAP = 6;
const EDGE_PADDING = 4;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const chart = {
    // ------------------------------------------------------------------ setup
    initializeChart() {
        this.zoom = {scale: 1, x: 0, y: 0};
        this._pointers = new Map();
        this.root.innerHTML = `
            <style>${chartCss}</style>
            <ha-card>
                <div class="vpd-chart-view">
                    <div class="vpd-viewport">
                        <div class="vpd-stage">
                            <canvas class="vpd-background"></canvas>
                            <div class="vpd-grid"></div>
                            <svg class="vpd-history" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
                            <div class="vpd-rooms"></div>
                        </div>
                        <div class="crosshair crosshair-h"></div>
                        <div class="crosshair crosshair-v"></div>
                        <div class="mouse-tooltip"></div>
                        <div class="zoom-hint"></div>
                        <button class="zoom-reset" type="button" hidden>⟲</button>
                        <div class="vpd-legend"></div>
                        <div class="cycle-progress"></div>
                    </div>
                    <div class="phase-stats" hidden></div>
                </div>
            </ha-card>
        `;
        const $ = (selector) => this.root.querySelector(selector);
        this.view = $('.vpd-chart-view');
        this.viewport = $('.vpd-viewport');
        this.stage = $('.vpd-stage');
        this.canvas = $('.vpd-background');
        this.gridEl = $('.vpd-grid');
        this.historySvg = $('.vpd-history');
        this.roomsEl = $('.vpd-rooms');
        this.legendEl = $('.vpd-legend');
        this.mouseTooltip = $('.mouse-tooltip');
        this.crossH = $('.crosshair-h');
        this.crossV = $('.crosshair-v');
        this.zoomHint = $('.zoom-hint');
        this.zoomReset = $('.zoom-reset');
        this.progressEl = $('.cycle-progress');
        this.statsEl = $('.phase-stats');

        this.viewport.style.setProperty('--vpd-min-height', `${Math.max(Number(this.min_height) || 0, 120)}px`);
        this.zoomReset.title = this.t('card.reset_zoom');
        this.zoomReset.addEventListener('click', (event) => {
            event.stopPropagation();
            this.resetZoom();
        });

        this._bgKey = null;
        this._gridKey = null;
        this.setupChartEvents();
        this.observeResize();
    },
    buildChart() {
        if (!this.config || !Array.isArray(this.config.rooms) || this.config.rooms.length === 0) return;

        if (this._initialized !== 'chart') {
            this.applyUnitDefaults();
            this.initializeChart();
            this._initialized = 'chart';
        }

        this.roomData = this.config.rooms.map(room => this.getRoomData(room));
        this.view.classList.toggle('always-details', !!this.enable_show_always_information);
        this.view.classList.toggle('no-tooltips', !this.enable_tooltip);

        this.renderGrid();
        this.renderRooms();
        this.renderLegend();
        this.applyActive();
        this.updateCycling();
        if (this.historyEnabled()) this.refreshHistory();
    },
    /** Axis unit follows the first room's sensor; sensible °F range when none is configured. */
    applyUnitDefaults() {
        const unit = this.getTemperatureUnit(this.config.rooms[0]);
        this.unit_temperature = unit;
        if (this.isFahrenheit(unit)) {
            if (this.config.min_temperature === undefined) this.min_temperature = 41;
            if (this.config.max_temperature === undefined) this.max_temperature = 95;
        }
    },
    observeResize() {
        this.disconnectResizeObserver();
        if (typeof ResizeObserver === 'undefined' || !this.viewport) return;
        this._resizeObserver = new ResizeObserver(() => {
            cancelAnimationFrame(this._resizeFrame);
            this._resizeFrame = requestAnimationFrame(() => {
                this.clampZoom();
                this.applyZoom(false);
                this.renderBackground();
            });
        });
        this._resizeObserver.observe(this.viewport);
    },
    disconnectResizeObserver() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    },

    // ------------------------------------------------------------ coordinates
    humidityToPercent(humidity) {
        return (this.max_humidity - humidity) / (this.max_humidity - this.min_humidity) * 100;
    },
    temperatureToPercent(temperature) {
        return (temperature - this.min_temperature) / (this.max_temperature - this.min_temperature) * 100;
    },

    // ------------------------------------------------------------- background
    /**
     * Paints the VPD phases of the active room onto a canvas. Repainted only when
     * the leaf offset (0.1 steps), unit, size, zoom quality or phases change.
     */
    renderBackground() {
        if (!this.canvas || !this.viewport) return;
        const width = this.viewport.clientWidth;
        const height = this.viewport.clientHeight;
        if (!width || !height) return;

        const index = this.getActiveIndex();
        const data = this.roomData && this.roomData[index];
        const rawOffset = data && Number.isFinite(data.leafOffset) ? data.leafOffset : this.getLeafTemperatureOffset();
        const offset = Math.round(rawOffset * 10) / 10;
        const unit = data ? data.unit : this.unit_temperature;
        const quality = Math.min(3, (window.devicePixelRatio || 1) * Math.min(this.zoom.scale, 2));
        const key = [offset, unit, width, height, quality.toFixed(2), JSON.stringify(this.vpd_phases),
            this.min_temperature, this.max_temperature, this.min_humidity, this.max_humidity, this.calculateVPD === methods.calculateVPD].join('|');
        if (key === this._bgKey) return;
        this._bgKey = key;

        const canvas = this.canvas;
        canvas.width = Math.round(width * quality);
        canvas.height = Math.round(height * quality);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const fast = this.calculateVPD === methods.calculateVPD;
        const resolution = fast ? quality : Math.min(quality, 1);
        const cols = Math.max(2, Math.round(width * resolution));
        const rows = Math.max(2, Math.round(height * resolution));
        const cellW = canvas.width / cols;
        const cellH = canvas.height / rows;
        const tRange = this.max_temperature - this.min_temperature;
        const hRange = this.max_humidity - this.min_humidity;
        const fahrenheit = this.isFahrenheit(unit);
        const svp = (celsius) => 0.6107 * Math.exp(17.27 * celsius / (celsius + 237.3));

        for (let r = 0; r < rows; r++) {
            const tAir = this.min_temperature + (r + 0.5) / rows * tRange;
            const tLeaf = tAir - offset;
            const vpLeaf = fast ? svp(fahrenheit ? (tLeaf - 32) * 5 / 9 : tLeaf) : 0;
            const vpAir = fast ? svp(fahrenheit ? (tAir - 32) * 5 / 9 : tAir) : 0;
            let runStart = 0;
            let runColor = null;
            for (let c = 0; c <= cols; c++) {
                let color = null;
                if (c < cols) {
                    const rh = this.max_humidity - (c + 0.5) / cols * hRange;
                    const vpd = fast ? Math.round((vpLeaf - vpAir * rh / 100) * 100) / 100 : this.computeVPD(tLeaf, tAir, rh, unit);
                    color = this.getColorForVpd(vpd);
                }
                if (color !== runColor) {
                    if (runColor !== null) {
                        ctx.fillStyle = runColor;
                        const x = Math.floor(runStart * cellW);
                        ctx.fillRect(x, Math.floor(r * cellH), Math.ceil(c * cellW) - x, Math.ceil((r + 1) * cellH) - Math.floor(r * cellH));
                    }
                    runColor = color;
                    runStart = c;
                }
            }
        }
    },

    // ------------------------------------------------------------------- grid
    renderGrid() {
        const key = [this.enable_axes, this.unit_temperature, this.min_temperature, this.max_temperature, this.min_humidity, this.max_humidity].join('|');
        if (key === this._gridKey) return;
        this._gridKey = key;
        this.gridEl.replaceChildren();
        if (!this.enable_axes) return;

        const fragment = document.createDocumentFragment();
        const add = (className, style, text) => {
            const el = document.createElement('div');
            el.className = className;
            Object.assign(el.style, style);
            if (text !== undefined) el.textContent = text;
            fragment.appendChild(el);
        };
        const temperatureSteps = 7;
        for (let i = 1; i < temperatureSteps; i++) {
            const top = `${i / temperatureSteps * 100}%`;
            const value = this.min_temperature + i * (this.max_temperature - this.min_temperature) / temperatureSteps;
            add('grid-line horizontal', {top});
            add('axis-label temperature', {top}, `${value.toFixed(0)}${this.unit_temperature}`);
        }
        const humiditySteps = 9;
        for (let i = 1; i < humiditySteps; i++) {
            const left = `${i / humiditySteps * 100}%`;
            const value = this.max_humidity - i * (this.max_humidity - this.min_humidity) / humiditySteps;
            add('grid-line vertical', {left});
            add('axis-label humidity', {left}, `${value.toFixed(0)}%`);
        }
        this.gridEl.appendChild(fragment);
    },

    // ------------------------------------------------------------------ rooms
    createRoomElement(index) {
        const el = document.createElement('div');
        el.className = 'room';
        el.dataset.index = String(index);
        el.innerHTML = `
            <div class="room-line horizontal"></div>
            <div class="room-line vertical"></div>
            <div class="room-pointer"><svg viewBox="0 0 20 16" aria-hidden="true"><path d="M2.5 2H17.5L10 14.5Z"/></svg></div>
            <div class="room-tooltip">
                <div class="tt-head">
                    <span class="tt-dot"></span>
                    <span class="tt-name"></span>
                    <span class="tt-alert" hidden>⚠</span>
                    <span class="tt-vpd"><b></b><small></small></span>
                </div>
                <div class="tt-mold" hidden></div>
                <div class="tt-body">
                    <div class="tt-phase"></div>
                    <div class="tt-details"></div>
                    <div class="tt-warn"></div>
                </div>
            </div>
        `;
        const enter = () => this.setHover(index);
        const leave = () => this.setHover(null);
        const tap = (event) => {
            event.stopPropagation();
            this.handleRoomTap(index);
        };
        [el.querySelector('.room-pointer'), el.querySelector('.room-tooltip')].forEach(target => {
            target.addEventListener('mouseenter', enter);
            target.addEventListener('mouseleave', leave);
            target.addEventListener('click', tap);
        });
        this.roomsEl.appendChild(el);
        return el;
    },
    renderRooms() {
        this.config.rooms.forEach((room, index) => {
            const data = this.roomData[index];
            const el = this.roomsEl.querySelector(`.room[data-index="${index}"]`) || this.createRoomElement(index);
            el.classList.toggle('vpd-unavailable', !data.valid);
            if (!data.valid) return;

            const rawX = this.humidityToPercent(data.humidity);
            const rawY = this.temperatureToPercent(data.temperature);
            const x = clamp(rawX, 0, 100);
            const y = clamp(rawY, 0, 100);
            el.dataset.x = String(x);
            el.dataset.y = String(y);
            el.style.setProperty('--room-color', this.getRoomColor(room, index));
            el.classList.toggle('out-of-range', x !== rawX || y !== rawY);
            el.classList.toggle('off-target', data.offTarget);
            el.classList.toggle('condensation', !!(this.enable_dewpoint && data.condensation));

            const pointer = el.querySelector('.room-pointer');
            pointer.classList.toggle('triangle', !!this.enable_triangle);
            pointer.style.left = `${x}%`;
            pointer.style.top = `${y}%`;
            el.querySelector('.room-line.horizontal').style.top = `${y}%`;
            el.querySelector('.room-line.vertical').style.left = `${x}%`;

            this.fillTooltip(el, room, index, data);
        });

        this.roomsEl.querySelectorAll('.room').forEach(el => {
            if (Number(el.dataset.index) >= this.config.rooms.length) el.remove();
        });
    },
    fillTooltip(el, room, index, data) {
        const name = el.querySelector('.tt-name');
        if (room.name) {
            name.textContent = room.name;
        } else {
            name.innerHTML = ROOM_ICON;
        }
        el.querySelector('.tt-vpd b').textContent = this.formatVPD(data.vpd);
        el.querySelector('.tt-vpd small').textContent = this.label('kpa');

        const phase = el.querySelector('.tt-phase');
        phase.textContent = this.getPhaseLabel(data.phase);
        phase.style.background = data.phase ? data.phase.color : 'grey';
        phase.style.color = this.readableTextColor(data.phase ? data.phase.color : '#808080');

        const rows = [
            [this.label('rh'), this.formatWithUnit(data.humidity, '%')],
            [this.label('air'), this.formatWithUnit(data.temperature, data.unit)],
        ];
        if (room.leaf_temperature || data.hasLeafSensor) {
            rows.push([this.label('leaf'), this.formatWithUnit(data.leafTemperature, data.unit)]);
        }
        if (this.enable_dewpoint) {
            rows.push([this.t('card.dewpoint'), this.formatWithUnit(data.dewPoint, data.unit)]);
        }
        el.querySelector('.tt-details').replaceChildren(...rows.flatMap(([label, value]) => {
            const term = document.createElement('span');
            term.className = 'tt-label';
            term.textContent = label || '';
            const val = document.createElement('span');
            val.className = 'tt-value';
            val.textContent = value;
            return [term, val];
        }));

        const warnings = this.getRoomWarnings(index, data, {mold: false});
        const mold = this.moldWarningText(index);
        const moldText = mold ? `${this.t('card.mold_risk')} · ${mold}` : '';
        const moldEl = el.querySelector('.tt-mold');
        moldEl.hidden = !mold;
        moldEl.textContent = moldText;
        const lines = warnings.map(text => {
            const line = document.createElement('div');
            line.textContent = `⚠ ${text}`;
            return line;
        });
        if (mold) {
            const line = document.createElement('div');
            line.className = 'mold';
            line.textContent = moldText;
            lines.push(line);
        }
        el.querySelector('.tt-warn').replaceChildren(...lines);
        // yellow triangle: target phase / condensation, red "!": mould risk
        el.querySelector('.tt-alert').hidden = warnings.length === 0;
        el.classList.toggle('has-warning', warnings.length > 0);
        el.classList.toggle('has-mold', !!mold);
    },
    /** Human readable warnings of a room: target phase, condensation, mould risk. */
    getRoomWarnings(index, data, {mold: includeMold = true} = {}) {
        const warnings = [];
        if (!data.valid) return warnings;
        if (data.offTarget) warnings.push(`${this.t('card.target')}: ${this.getPhaseLabel(data.targetPhase)}`);
        if (this.enable_dewpoint && data.condensation) warnings.push(this.t('card.condensation'));
        const mold = includeMold ? this.moldWarningText(index) : null;
        if (mold) warnings.push(`${this.t('card.mold_risk')}: ${mold}`);
        return warnings;
    },
    /** Short mould risk text ("7,3 h ≥ 75 % rF") or null. */
    moldWarningText(index) {
        const mold = this.getMoldRisk(index);
        if (!mold || !mold.active) return null;
        return this.t('card.mold_detail', {
            hours: this.formatNumber(mold.hours, 1),
            humidity: this.formatNumber(mold.threshold, 0),
        });
    },
    /** Black or white text, whichever reads better on the given background colour. */
    readableTextColor(color) {
        const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(color || '').trim());
        if (!match) return '#ffffff';
        const [r, g, b] = match.slice(1).map(hex => parseInt(hex, 16) / 255)
            .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#111111' : '#ffffff';
    },
    label(key) {
        const configured = this[`${key}_text`];
        return configured !== undefined && configured !== null ? String(configured) : this.t(`card.${key}`);
    },
    withLabel(key, value) {
        const label = this.label(key);
        return label ? `${label}: ${value}` : value;
    },
    /**
     * Places a room tooltip above (or below) its marker, kept inside the visible area.
     * Returns the occupied rectangle in stage coordinates.
     */
    layoutTooltip(el, {below = false, compact = false, keep = false, side: forcedSide = null} = {}) {
        const tooltip = el.querySelector('.room-tooltip');
        el.classList.toggle('compact', compact);
        const width = this.stage.offsetWidth;
        const height = this.stage.offsetHeight;
        const x = parseFloat(el.dataset.x);
        const y = parseFloat(el.dataset.y);
        const {scale, x: panX, y: panY} = this.zoom;
        const inv = 1 / scale;
        tooltip.style.left = `${x}%`;
        tooltip.style.top = `${y}%`;

        const visualWidth = tooltip.offsetWidth * inv;
        const visualHeight = tooltip.offsetHeight * inv;
        // extent of the marker above / below its point (triangle: tip is the point)
        const markerAbove = (this.enable_triangle ? 19 : 9) * inv;
        const markerBelow = (this.enable_triangle ? 0 : 9) * inv;
        const gap = TOOLTIP_GAP * inv;
        const visibleLeft = -panX / scale + EDGE_PADDING * inv;
        const visibleRight = (width - panX) / scale - EDGE_PADDING * inv;
        const visibleTop = -panY / scale + EDGE_PADDING * inv;
        const visibleBottom = (height - panY) / scale - EDGE_PADDING * inv;
        const centerX = width * x / 100;
        const pointY = height * y / 100;

        const markerSide = (this.enable_triangle ? 12 : 9) * inv;
        const clampTop = (top) => Math.min(Math.max(top, visibleTop), Math.max(visibleTop, visibleBottom - visualHeight));
        const finish = (side, left, top, floating) => {
            const dx = left - centerX;
            const dy = top - pointY;
            tooltip.style.transform = `translate(${dx}px, ${dy}px) scale(${inv})`;
            tooltip.dataset.side = side;
            tooltip.dataset.placement = floating ? 'floating' : side;
            return {left, right: left + visualWidth, top, bottom: top + visualHeight};
        };

        // horizontal position for above/below: centred on the marker, kept inside the view
        let left = centerX - visualWidth / 2;
        left = Math.min(Math.max(left, visibleLeft), Math.max(visibleLeft, visibleRight - visualWidth));

        const fitsAbove = pointY - markerAbove - gap - visualHeight >= visibleTop;
        const fitsBelow = pointY + markerBelow + gap + visualHeight <= visibleBottom;
        const sideTop = clampTop(pointY - visualHeight / 2);
        const rightLeft = centerX + markerSide + gap;
        const leftLeft = centerX - markerSide - gap - visualWidth;
        const fitsRight = rightLeft + visualWidth <= visibleRight;
        const fitsLeft = leftLeft >= visibleLeft;

        let side;
        if (forcedSide) {
            side = forcedSide;
        } else if (keep) {
            side = tooltip.dataset.side || 'above';
        } else if (fitsAbove || fitsBelow) {
            side = below ? (fitsBelow ? 'below' : 'above') : (fitsAbove ? 'above' : 'below');
        } else if (fitsRight || fitsLeft) {
            // too little height: put it next to the marker
            side = fitsRight ? 'right' : 'left';
        } else {
            side = pointY - visibleTop >= visibleBottom - pointY ? 'above' : 'below';
        }

        if (side === 'right' || side === 'left') {
            const sideLeft = side === 'right' ? rightLeft : leftLeft;
            const fits = side === 'right' ? fitsRight : fitsLeft;
            const clampedLeft = Math.min(Math.max(sideLeft, visibleLeft), Math.max(visibleLeft, visibleRight - visualWidth));
            return finish(side, clampedLeft, sideTop, !fits || sideTop !== pointY - visualHeight / 2);
        }
        const wantedTop = side === 'above' ? pointY - markerAbove - gap - visualHeight : pointY + markerBelow + gap;
        const top = clampTop(wantedTop);
        return finish(side, left, top, top !== wantedTop);
    },
    /**
     * Lays out all tooltips. The base layout depends only on the measured values,
     * never on the selection: every tooltip is placed in its compact size, in room
     * order, avoiding other tooltips, foreign markers and the legend. Afterwards the
     * selected / hovered room expands in place, on top, without moving the others.
     */
    repositionTooltips() {
        if (!this.roomsEl || !this.stage || !this.stage.offsetWidth || !this.enable_tooltip) return;
        const width = this.stage.offsetWidth;
        const height = this.stage.offsetHeight;
        const inv = 1 / this.zoom.scale;
        const always = !!this.enable_show_always_information;
        const rooms = [...this.roomsEl.querySelectorAll('.room:not(.vpd-unavailable)')]
            .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index));
        const markers = rooms.map(el => {
            const cx = width * parseFloat(el.dataset.x) / 100;
            const cy = height * parseFloat(el.dataset.y) / 100;
            return this.enable_triangle
                ? {index: Number(el.dataset.index), left: cx - 12 * inv, right: cx + 12 * inv, top: cy - 20 * inv, bottom: cy + 2 * inv}
                : {index: Number(el.dataset.index), left: cx - 10 * inv, right: cx + 10 * inv, top: cy - 10 * inv, bottom: cy + 10 * inv};
        });
        const obstacles = [];
        if (this.enable_legend && this.legendEl) {
            const vp = this.viewport.getBoundingClientRect();
            const {x: panX, y: panY, scale} = this.zoom;
            [...this.legendEl.children].forEach(chip => {
                const r = chip.getBoundingClientRect();
                if (!r.width) return;
                obstacles.push({
                    left: (r.left - vp.left - panX) / scale, right: (r.right - vp.left - panX) / scale,
                    top: (r.top - vp.top - panY) / scale, bottom: (r.bottom - vp.top - panY) / scale,
                });
            });
        }

        let placed = [];
        const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const overlaps = (rect, index) => placed.some(other => hit(rect, other))
            || obstacles.some(other => hit(rect, other))
            || markers.some(m => m.index !== index && hit(rect, m));

        // past points of the active room: tooltips prefer the side that hides fewer of them
        const trail = [];
        if (this.showHistory() && this._history) {
            const roomHistory = this._history[this.getActiveIndex()];
            const r = 4 * inv;
            (roomHistory ? roomHistory.points : []).forEach(point => {
                const cx = width * clamp(this.humidityToPercent(point.humidity), 0, 100) / 100;
                const cy = height * clamp(this.temperatureToPercent(point.temperature), 0, 100) / 100;
                trail.push({left: cx - r, right: cx + r, top: cy - r, bottom: cy + r});
            });
        }
        const trailHits = (rect) => trail.reduce((count, dot) => count + (hit(rect, dot) ? 1 : 0), 0);

        const overlapArea = (rect, index) => {
            const area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
                * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            return placed.reduce((sum, other) => sum + area(rect, other), 0)
                + obstacles.reduce((sum, other) => sum + area(rect, other), 0)
                + markers.reduce((sum, m) => sum + (m.index !== index ? area(rect, m) * 10 : 0), 0);
        };

        // place every room in the given size (neutral styling, independent of the selection)
        const tryLayout = (compact) => {
            placed = [];
            let fits = true;
            rooms.forEach(el => {
                const index = Number(el.dataset.index);
                el.classList.add('measuring');
                const attempts = [{compact}, {compact, below: true}, {compact, side: 'right'}, {compact, side: 'left'}];
                let best = null;
                let fallback = null;
                let last = null;
                for (const attempt of attempts) {
                    const rect = this.layoutTooltip(el, attempt);
                    last = attempt;
                    if (overlaps(rect, index)) {
                        const area = overlapArea(rect, index);
                        if (!fallback || area < fallback.area) fallback = {attempt, rect, area};
                        continue;
                    }
                    const score = trailHits(rect);
                    if (!best || score < best.score) best = {attempt, rect, score};
                    if (score === 0) break;
                }
                const chosen = best || fallback;
                if (!best) fits = false;
                const rect = chosen.attempt === last ? chosen.rect : this.layoutTooltip(el, chosen.attempt);
                el.classList.remove('measuring');
                placed.push(rect);
            });
            return fits;
        };
        // all expanded when they fit, otherwise all compact (the selection expands on top)
        if (!always || !tryLayout(false)) tryLayout(true);

        // selected and hovered rooms expand in place (keeping their side)
        const expand = new Set([this.getSelectedIndex(), this.hoverIndex].filter(index => index !== null && index !== undefined));
        const basePlaced = placed;
        expand.forEach(index => {
            const el = this.roomsEl.querySelector(`.room[data-index="${index}"]`);
            if (!el || el.classList.contains('vpd-unavailable')) return;
            const compact = el.classList.contains('compact');
            const own = rooms.indexOf(el);
            placed = basePlaced.filter((rect, i) => i !== own);
            const keepRect = this.layoutTooltip(el, {keep: true, compact});
            // a hovered tooltip must not move away from the cursor; a pinned or cycled one may
            // switch sides when the expanded box would cover other markers or tooltips
            const movable = index !== this.hoverIndex || index === this.pinnedIndex;
            if (!movable || overlapArea(keepRect, index) === 0) return;
            let best = {attempt: {keep: true, compact}, area: overlapArea(keepRect, index)};
            for (const attempt of [{compact}, {compact, below: true}, {compact, side: 'right'}, {compact, side: 'left'}]) {
                const area = overlapArea(this.layoutTooltip(el, attempt), index);
                if (area < best.area) best = {attempt, area};
                if (area === 0) break;
            }
            this.layoutTooltip(el, best.attempt);
        });
        placed = basePlaced;
    },
    // ----------------------------------------------------------------- legend
    renderLegend() {
        this.legendEl.style.display = this.enable_legend ? '' : 'none';
        if (!this.enable_legend) return;
        this.config.rooms.forEach((room, index) => {
            let chip = this.legendEl.querySelector(`.legend-chip[data-index="${index}"]`);
            if (!chip) {
                chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'legend-chip';
                chip.dataset.index = String(index);
                chip.innerHTML = '<span class="dot"></span><span class="label"></span>';
                chip.addEventListener('mouseenter', () => this.setHover(index));
                chip.addEventListener('mouseleave', () => this.setHover(null));
                chip.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.togglePin(index);
                });
                this.legendEl.appendChild(chip);
            }
            const data = this.roomData[index];
            chip.style.setProperty('--room-color', this.getRoomColor(room, index));
            chip.querySelector('.label').textContent = this.getRoomName(room, index);
            chip.classList.toggle('unavailable', !data.valid);
            chip.classList.toggle('off-target', data.valid && this.getRoomWarnings(index, data).length > 0);
            chip.title = data.valid ? `${this.formatVPD(data.vpd)} kPa · ${this.getPhaseLabel(data.phase)}` : this.t('card.unavailable');
        });
        this.legendEl.querySelectorAll('.legend-chip').forEach(chip => {
            if (Number(chip.dataset.index) >= this.config.rooms.length) chip.remove();
        });
    },

    // ---------------------------------------------------------- active room
    firstValidIndex() {
        const index = (this.roomData || []).findIndex(data => data.valid);
        return index === -1 ? 0 : index;
    },
    isValidIndex(index) {
        return index !== null && index !== undefined && this.roomData && this.roomData[index] && this.roomData[index].valid;
    },
    /** Explicitly selected room (hover, pin, cycling) or null. Only this one is expanded. */
    getSelectedIndex() {
        const cycling = this.enable_cycle_rooms ? this.cycleIndex : null;
        for (const candidate of [this.hoverIndex, this.pinnedIndex, cycling]) {
            if (this.isValidIndex(candidate)) return candidate;
        }
        return null;
    },
    /** Room used for background, trail and statistics: the selection, else the first valid room. */
    getActiveIndex() {
        for (const candidate of [this.hoverIndex, this.pinnedIndex, this.cycleIndex]) {
            if (this.isValidIndex(candidate)) return candidate;
        }
        return this.firstValidIndex();
    },
    setHover(index) {
        if (this.hoverIndex === index) return;
        this.hoverIndex = index;
        this.applyActive();
    },
    togglePin(index) {
        this.pinnedIndex = this.pinnedIndex === index ? null : index;
        this.applyActive();
    },
    handleRoomTap(index) {
        const action = typeof this.tap_action === 'object' && this.tap_action ? this.tap_action.action : this.tap_action;
        if (action === 'more-info') {
            const room = this.config.rooms[index];
            const entityId = room.vpd || room.temperature;
            if (entityId) this.fireEvent(this, 'hass-more-info', {entityId});
            return;
        }
        this.togglePin(index);
    },
    /** Highlights the active room and switches background, trail and statistics to it. */
    applyActive({relayout = true} = {}) {
        if (!this.roomsEl) return;
        const active = this.getActiveIndex();
        const selected = this.getSelectedIndex();
        this.roomsEl.querySelectorAll('.room').forEach(el => {
            const index = Number(el.dataset.index);
            el.classList.toggle('active', index === selected);
            el.classList.toggle('pinned', index === this.pinnedIndex);
            el.classList.toggle('hovered', index === this.hoverIndex);
        });
        this.legendEl.querySelectorAll('.legend-chip').forEach(chip => {
            const index = Number(chip.dataset.index);
            chip.classList.toggle('active', index === selected);
            chip.classList.toggle('pinned', index === this.pinnedIndex);
        });
        if (this.roomData && this.roomData[active]) {
            this.updateTemperatureUnit(this.roomData[active].unit);
        }
        if (relayout) this.repositionTooltips();
        this.renderBackground();
        this.renderHistory();
        this.renderPhaseStats();
    },
    updateTemperatureUnit(unit) {
        if (!unit || unit === this.unit_temperature) return;
        this.unit_temperature = unit;
        this.renderGrid();
    },

    // ---------------------------------------------------------------- cycling
    updateCycling() {
        const validRooms = (this.roomData || []).filter(data => data.valid).length;
        if (this.enable_cycle_rooms && validRooms > 1 && this.isConnected) {
            this.startCycling();
        } else {
            this.stopRoomCycling();
        }
    },
    startCycling() {
        if (this.roomCycleInterval) return;
        if (!this.isValidIndex(this.cycleIndex)) this.cycleIndex = this.firstValidIndex();
        this.animateProgress();
        this.roomCycleInterval = setInterval(() => {
            const total = this.config.rooms.length;
            for (let step = 1; step <= total; step++) {
                const next = (this.cycleIndex + step) % total;
                if (this.isValidIndex(next)) {
                    this.cycleIndex = next;
                    break;
                }
            }
            this.applyActive();
            this.animateProgress();
        }, CYCLE_INTERVAL_MS);
    },
    animateProgress() {
        if (!this.progressEl) return;
        const bar = this.progressEl;
        bar.style.transition = 'none';
        bar.style.width = '0';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            bar.style.transition = `width ${CYCLE_INTERVAL_MS}ms linear`;
            bar.style.width = '100%';
        }));
    },
    stopRoomCycling() {
        if (this.roomCycleInterval) {
            clearInterval(this.roomCycleInterval);
            this.roomCycleInterval = null;
        }
        if (this.progressEl) {
            this.progressEl.style.transition = 'none';
            this.progressEl.style.width = '0';
        }
    },

    // ------------------------------------------------------- zoom, pan, pinch
    setupChartEvents() {
        const vp = this.viewport;
        vp.addEventListener('wheel', (event) => this.onWheel(event), {passive: false});
        vp.addEventListener('pointerdown', (event) => this.onPointerDown(event));
        vp.addEventListener('pointermove', (event) => this.onPointerMove(event));
        vp.addEventListener('pointerup', (event) => this.onPointerUp(event));
        vp.addEventListener('pointercancel', (event) => this.onPointerUp(event));
        vp.addEventListener('pointerleave', (event) => {
            if (event.pointerType === 'mouse') this.hideMouseInfo();
        });
        vp.addEventListener('dblclick', () => {
            if (this.enable_zoom) this.resetZoom();
        });
        vp.addEventListener('auxclick', (event) => {
            if (event.button === 1 && this.enable_zoom) this.resetZoom();
        });
        // no context menu after panning with the right mouse button
        vp.addEventListener('contextmenu', (event) => {
            if (this._suppressContextMenu) event.preventDefault();
            this._suppressContextMenu = false;
        });
    },
    /** Ctrl / Cmd + wheel always zooms, the wheel alone only with enable_wheel_zoom. */
    isZoomWheel(event) {
        return !!(this.enable_wheel_zoom || event.ctrlKey || event.metaKey);
    },
    onWheel(event) {
        if (!this.enable_zoom) return;
        if (!this.isZoomWheel(event)) {
            this.showZoomHint();
            return;
        }
        event.preventDefault();
        const factor = Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.002));
        this.zoomAt(event.clientX, event.clientY, this.zoom.scale * factor);
    },
    showZoomHint() {
        if (!this.zoomHint || this.zoom.scale > 1) return;
        this.zoomHint.textContent = this.t('card.zoom_hint');
        this.zoomHint.classList.add('visible');
        clearTimeout(this._hintTimer);
        this._hintTimer = setTimeout(() => this.zoomHint.classList.remove('visible'), 1200);
    },
    zoomAt(clientX, clientY, targetScale, base = this.zoom) {
        const rect = this.viewport.getBoundingClientRect();
        const scale = clamp(targetScale, 1, MAX_ZOOM);
        const cx = clientX - rect.left;
        const cy = clientY - rect.top;
        const stageX = (cx - base.x) / base.scale;
        const stageY = (cy - base.y) / base.scale;
        this.zoom = {scale, x: cx - stageX * scale, y: cy - stageY * scale};
        this.clampZoom();
        this.applyZoom();
    },
    clampZoom() {
        if (!this.viewport || !this.zoom) return;
        const width = this.viewport.clientWidth;
        const height = this.viewport.clientHeight;
        const {scale} = this.zoom;
        this.zoom.x = clamp(this.zoom.x, width - width * scale, 0);
        this.zoom.y = clamp(this.zoom.y, height - height * scale, 0);
        if (scale <= 1) this.zoom = {scale: 1, x: 0, y: 0};
    },
    applyZoom(rerender = true) {
        if (!this.stage) return;
        const {scale, x, y} = this.zoom;
        this.stage.style.transform = scale === 1 ? '' : `translate(${x}px, ${y}px) scale(${scale})`;
        this.stage.style.setProperty('--inv', String(1 / scale));
        this.viewport.classList.toggle('zoomed', scale > 1);
        this.zoomReset.hidden = scale <= 1;
        this.repositionTooltips();
        if (rerender) {
            clearTimeout(this._zoomRenderTimer);
            this._zoomRenderTimer = setTimeout(() => this.renderBackground(), 150);
        }
    },
    resetZoom() {
        this.zoom = {scale: 1, x: 0, y: 0};
        this.applyZoom();
    },
    onPointerDown(event) {
        if (!this.enable_zoom) return;
        this._pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
        if (this._pointers.size === 2) {
            const [a, b] = [...this._pointers.values()];
            this._pinch = {
                distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
                centerX: (a.x + b.x) / 2,
                centerY: (a.y + b.y) / 2,
                base: {...this.zoom},
            };
            this._pan = null;
        } else if (this._pointers.size === 1 && this.zoom.scale > 1 && (event.button === 0 || event.button === 2)) {
            // pan with the left or (like 2.x) the right mouse button
            this._pan = {id: event.pointerId, button: event.button, startX: event.clientX, startY: event.clientY, base: {...this.zoom}, active: false};
        }
    },
    onPointerMove(event) {
        if (this._pointers.has(event.pointerId)) {
            this._pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
        }
        if (this._pinch && this._pointers.size >= 2) {
            const [a, b] = [...this._pointers.values()];
            const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
            const {base, centerX, centerY} = this._pinch;
            this.zoomAt(centerX, centerY, base.scale * distance / this._pinch.distance, base);
            event.preventDefault();
            return;
        }
        if (this._pan && this._pan.id === event.pointerId) {
            const dx = event.clientX - this._pan.startX;
            const dy = event.clientY - this._pan.startY;
            if (!this._pan.active && Math.hypot(dx, dy) > PAN_THRESHOLD) {
                this._pan.active = true;
                this.viewport.classList.add('panning');
                try {
                    this.viewport.setPointerCapture(event.pointerId);
                } catch {
                    // pointer may already be released
                }
            }
            if (this._pan.active) {
                this.zoom = {...this._pan.base, x: this._pan.base.x + dx, y: this._pan.base.y + dy};
                this.clampZoom();
                this.applyZoom(false);
                return;
            }
        }
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
            this.updateMouseInfo(event);
        }
    },
    onPointerUp(event) {
        this._pointers.delete(event.pointerId);
        if (this._pointers.size < 2 && this._pinch) {
            this._pinch = null;
            this.applyZoom();
        }
        if (this._pan && this._pan.id === event.pointerId) {
            if (this._pan.active) {
                if (this._pan.button === 2) this._suppressContextMenu = true;
                this.viewport.classList.remove('panning');
                this.applyZoom();
            }
            this._pan = null;
        }
    },
    updateMouseInfo(event) {
        if (this.hoverIndex != null) {
            this.hideMouseInfo();
            return;
        }
        const rect = this.viewport.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const vx = event.clientX - rect.left;
        const vy = event.clientY - rect.top;
        const sx = (vx - this.zoom.x) / this.zoom.scale / rect.width;
        const sy = (vy - this.zoom.y) / this.zoom.scale / rect.height;
        if (sx < 0 || sx > 1 || sy < 0 || sy > 1) return;

        const temperature = this.min_temperature + sy * (this.max_temperature - this.min_temperature);
        const humidity = this.max_humidity - sx * (this.max_humidity - this.min_humidity);
        const data = this.roomData && this.roomData[this.getActiveIndex()];
        const offset = data && Number.isFinite(data.leafOffset) ? data.leafOffset : this.getLeafTemperatureOffset();
        const unit = data ? data.unit : this.unit_temperature;
        const vpd = this.computeVPD(temperature - offset, temperature, humidity, unit);

        this.mouseTooltip.textContent = [
            `${this.formatVPD(vpd)} ${this.label('kpa')}`.trim(),
            this.withLabel('rh', this.formatWithUnit(humidity, '%')),
            this.withLabel('air', this.formatWithUnit(temperature, unit)),
            this.getPhaseLabel(vpd),
        ].join('  ·  ');
        this.mouseTooltip.style.opacity = '1';

        const showCross = !!this.enable_crosshair;
        this.crossH.style.opacity = showCross ? '1' : '0';
        this.crossV.style.opacity = showCross ? '1' : '0';
        this.crossH.style.top = `${vy}px`;
        this.crossV.style.left = `${vx}px`;
    },
    hideMouseInfo() {
        if (!this.mouseTooltip) return;
        this.mouseTooltip.style.opacity = '0';
        this.crossH.style.opacity = '0';
        this.crossV.style.opacity = '0';
    },

    // ---------------------------------------------------------------- history
    onHistoryLoaded() {
        if (this._initialized === 'chart') {
            if (this.roomData) {
                this.renderRooms();
                this.renderLegend();
                this.repositionTooltips();
            }
            this.renderHistory();
            this.renderPhaseStats();
        } else if (this._initialized === 'bar') {
            this.updateBars();
        }
    },
    /** Trail of the active room: older points fade out, dots carry a native tooltip. */
    renderHistory() {
        const svg = this.historySvg;
        if (!svg) return;
        svg.replaceChildren();
        if (!this.showHistory() || !this._history) return;
        const index = this.getActiveIndex();
        const roomHistory = this._history[index];
        if (!roomHistory || roomHistory.points.length < 2) return;

        const room = this.config.rooms[index];
        const color = this.getRoomColor(room, index);
        const unit = this.roomData[index] ? this.roomData[index].unit : this.unit_temperature;
        const points = roomHistory.points.map(point => ({
            ...point,
            x: clamp(this.humidityToPercent(point.humidity), 0, 100),
            y: clamp(this.temperatureToPercent(point.temperature), 0, 100),
        }));
        const count = points.length;
        const fragment = document.createDocumentFragment();
        const line = (x1, y1, x2, y2, attrs) => {
            const el = document.createElementNS(SVG_NS, 'line');
            el.setAttribute('x1', x1);
            el.setAttribute('y1', y1);
            el.setAttribute('x2', x2);
            el.setAttribute('y2', y2);
            el.setAttribute('vector-effect', 'non-scaling-stroke');
            Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
            return el;
        };

        for (let i = 1; i < count; i++) {
            const age = i / (count - 1);
            fragment.appendChild(line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y, {
                stroke: color,
                'stroke-width': '2',
                'stroke-opacity': (0.25 + 0.65 * age).toFixed(2),
                'stroke-linecap': 'round',
            }));
        }

        const dotEvery = Math.max(1, Math.ceil(count / 48));
        // the marker already shows the current value: no trail dots underneath it
        const current = this.roomData[index];
        const currentX = current && current.valid ? clamp(this.humidityToPercent(current.humidity), 0, 100) : NaN;
        const currentY = current && current.valid ? clamp(this.temperatureToPercent(current.temperature), 0, 100) : NaN;
        const underMarker = (point) => Math.abs(point.x - currentX) < 1.5 && Math.abs(point.y - currentY) < 2.5;
        const timeFormat = new Intl.DateTimeFormat(this._hass && this._hass.language ? this._hass.language : undefined, {
            weekday: 'short', hour: '2-digit', minute: '2-digit',
        });
        for (let i = 0; i < count; i++) {
            if (i % dotEvery !== 0 && i !== count - 1) continue;
            const point = points[i];
            if (underMarker(point)) continue;
            const age = i / (count - 1);
            const opacity = (0.45 + 0.55 * age).toFixed(2);
            fragment.appendChild(line(point.x, point.y, point.x, point.y, {
                stroke: 'rgba(0, 0, 0, 0.65)',
                'stroke-width': '9',
                'stroke-linecap': 'round',
                'stroke-opacity': opacity,
            }));
            const dot = line(point.x, point.y, point.x, point.y, {
                class: 'history-dot',
                stroke: point.phase ? point.phase.color : color,
                'stroke-width': '6',
                'stroke-linecap': 'round',
                'stroke-opacity': opacity,
            });
            const title = document.createElementNS(SVG_NS, 'title');
            title.textContent = `${timeFormat.format(new Date(point.t))} · ${this.formatWithUnit(point.temperature, unit)} · ${this.formatWithUnit(point.humidity, '%')} · ${this.formatVPD(point.vpd)} kPa · ${this.getPhaseLabel(point.phase)}`;
            dot.appendChild(title);
            fragment.appendChild(dot);
        }
        svg.appendChild(fragment);
    },
    renderPhaseStats() {
        if (!this.statsEl) return;
        const visible = this.showHistory() && this.enable_phase_stats;
        this.statsEl.hidden = !visible;
        if (!visible) return;
        const index = this.getActiveIndex();
        const room = this.config.rooms[index];
        const roomHistory = this._history ? this._history[index] : null;
        this.statsEl.replaceChildren(this.createPhaseStatsElement(roomHistory, room ? this.getRoomName(room, index) : '', this.roomData[index]));
    },
    /** Shared by chart and bar view: stacked bar + legend of the time spent per phase. */
    createPhaseStatsElement(roomHistory, title, data) {
        const wrapper = document.createElement('div');
        const heading = document.createElement('div');
        heading.className = 'phase-stats-title';
        heading.textContent = `${this.t('card.last_hours', {hours: this.historyHours()})}${title ? ` · ${title}` : ''}`;
        wrapper.appendChild(heading);

        const stats = roomHistory ? roomHistory.stats : [];
        if (!stats.length) {
            const empty = document.createElement('div');
            empty.className = 'phase-stats-legend';
            empty.textContent = this.t('card.no_history');
            wrapper.appendChild(empty);
            return wrapper;
        }
        const bar = document.createElement('div');
        bar.className = 'phase-stats-bar';
        const legend = document.createElement('div');
        legend.className = 'phase-stats-legend';
        stats.forEach(({phase, share}) => {
            const percent = share > 0 && share < 0.005 ? '<1' : this.formatNumber(share * 100, 0);
            const segment = document.createElement('span');
            segment.style.width = `${share * 100}%`;
            segment.style.background = phase.color;
            segment.title = `${this.getPhaseLabel(phase)}: ${percent}\u202f%`;
            bar.appendChild(segment);

            const item = document.createElement('span');
            if (data && data.targetPhase === phase) item.className = 'target';
            const swatch = document.createElement('span');
            swatch.className = 'swatch';
            swatch.style.background = phase.color;
            item.append(swatch, `${this.getPhaseLabel(phase)} ${percent}\u202f%`);
            legend.appendChild(item);
        });
        wrapper.append(bar, legend);
        return wrapper;
    },
};
