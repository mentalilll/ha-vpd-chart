import barCss from './styles/bar.css?raw';

export const bar = {
    initializeBar() {
        this.root.innerHTML = `
            <style>${barCss}</style>
            <ha-card>
                <div class="card-content"></div>
                <div class="legend"></div>
            </ha-card>
        `;
        this.content = this.root.querySelector('.card-content');
        this.legendBar = this.root.querySelector('.legend');
    },
    buildBarChart() {
        if (!this.config || !Array.isArray(this.config.rooms) || this.config.rooms.length === 0) return;
        if (this._initialized !== 'bar') {
            this.initializeBar();
            this._initialized = 'bar';
        }
        this.roomData = this.config.rooms.map(room => this.getRoomData(room));
        this.updateBars();
        this.updateVPDLegend();
        if (this.historyEnabled()) this.refreshHistory();
    },
    createBarCard(index) {
        const card = document.createElement('div');
        card.className = 'bar-room';
        card.dataset.index = String(index);
        card.innerHTML = `
            <div class="bar-row">
                <span class="vpd-title"></span>
                <span class="vpd-value"></span>
                <span class="vpd-rh"></span>
                <span class="vpd-temp"></span>
                <span class="vpd-state"><span class="label"></span><span class="swatch"></span></span>
            </div>
            <div class="bar-warn"></div>
            <div class="bar-stats"></div>
        `;
        card.addEventListener('click', () => {
            const action = typeof this.tap_action === 'object' && this.tap_action ? this.tap_action.action : this.tap_action;
            if (action !== 'more-info') return;
            const room = this.config.rooms[index];
            const entityId = room && (room.vpd || room.temperature);
            if (entityId) this.fireEvent(this, 'hass-more-info', {entityId});
        });
        this.content.appendChild(card);
        return card;
    },
    updateVPDLegend() {
        if (!this.legendBar) return;
        this.legendBar.replaceChildren(...this.vpd_phases.map(phase => {
            const item = document.createElement('span');
            const swatch = document.createElement('span');
            swatch.className = 'swatch';
            swatch.style.background = phase.color;
            item.append(swatch, this.getPhaseLabel(phase));
            return item;
        }));
    },
    updateBars() {
        if (!this.content || !this.roomData) return;
        this.roomData = this.config.rooms.map(room => this.getRoomData(room));
        const action = typeof this.tap_action === 'object' && this.tap_action ? this.tap_action.action : this.tap_action;
        this.config.rooms.forEach((room, index) => {
            const data = this.roomData[index];
            const card = this.content.querySelector(`.bar-room[data-index="${index}"]`) || this.createBarCard(index);
            card.style.setProperty('--room-color', room.color || 'transparent');
            card.classList.toggle('vpd-unavailable', !data.valid);
            const warnings = this.getRoomWarnings(index, data);
            card.classList.toggle('off-target', warnings.length > 0);
            card.classList.toggle('clickable', action === 'more-info');

            const hasTitle = room.name !== '';
            const title = card.querySelector('.vpd-title');
            title.textContent = this.getRoomName(room, index);
            title.style.display = hasTitle ? '' : 'none';

            card.querySelector('.vpd-value').textContent = `${this.formatVPD(data.vpd)} ${this.label('kpa')}`.trim();
            card.querySelector('.vpd-rh').textContent = this.formatWithUnit(data.humidity, '%');
            card.querySelector('.vpd-temp').textContent = this.formatWithUnit(data.temperature, data.unit);
            card.querySelector('.vpd-state .label').textContent = data.valid ? this.getPhaseLabel(data.phase) : this.t('card.unavailable');
            card.querySelector('.vpd-state .swatch').style.background = this.getColorForVpd(data.vpd);

            const mold = this.moldWarningText(index);
            card.querySelector('.bar-warn').replaceChildren(...this.getRoomWarnings(index, data, {mold: false}).map(text => {
                const line = document.createElement('div');
                line.textContent = `⚠ ${text}`;
                return line;
            }), ...(mold ? [Object.assign(document.createElement('div'), {className: 'mold', textContent: `${this.t('card.mold_risk')} · ${mold}`})] : []));

            const statsEl = card.querySelector('.bar-stats');
            if (this.showHistory() && this.enable_phase_stats) {
                const roomHistory = this._history ? this._history[index] : null;
                statsEl.replaceChildren(this.createPhaseStatsElement(roomHistory, '', data));
            } else {
                statsEl.replaceChildren();
            }
        });

        this.content.querySelectorAll('.bar-room').forEach(card => {
            if (Number(card.dataset.index) >= this.config.rooms.length) card.remove();
        });
    },
};
