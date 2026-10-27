/**
 * Slider for the VPD phase borders. One handle per border between two phases,
 * works with mouse, pen and touch (pointer events). Emits `change` with
 * {index, value} when a handle is released.
 */
export class PhaseSlider {
    constructor(container, {phases, min = 0, max = 2.5, step = 0.05, onChange}) {
        this.container = container;
        this.min = min;
        this.max = max;
        this.step = step;
        this.onChange = onChange;
        this.container.classList.add('phase-slider');
        this.container.innerHTML = '<div class="phase-slider-track"></div><div class="phase-slider-handles"></div><div class="phase-slider-scale"></div>';
        this.track = this.container.querySelector('.phase-slider-track');
        this.handles = this.container.querySelector('.phase-slider-handles');
        this.scale = this.container.querySelector('.phase-slider-scale');
        this.update(phases);
    }

    percent(value) {
        return (value - this.min) / (this.max - this.min) * 100;
    }

    borders() {
        return this.phases.slice(0, -1).map(phase => Number(phase.upper));
    }

    update(phases) {
        this.phases = phases.map(phase => ({...phase}));
        const borders = this.borders();
        this.track.replaceChildren(...this.phases.map((phase, index) => {
            const start = index === 0 ? this.min : borders[index - 1];
            const end = index === this.phases.length - 1 ? this.max : borders[index];
            const segment = document.createElement('div');
            segment.className = 'phase-slider-segment';
            segment.style.left = `${this.percent(Math.max(start, this.min))}%`;
            segment.style.width = `${Math.max(0, this.percent(Math.min(end, this.max)) - this.percent(Math.max(start, this.min)))}%`;
            segment.style.background = phase.color;
            segment.title = phase.label || phase.className;
            return segment;
        }));

        this.handles.replaceChildren(...borders.map((value, index) => {
            const handle = document.createElement('div');
            handle.className = 'phase-slider-handle';
            handle.tabIndex = 0;
            handle.dataset.index = String(index);
            handle.style.left = `${this.percent(value)}%`;
            handle.innerHTML = `<span class="value">${value.toFixed(2)}</span>`;
            handle.addEventListener('pointerdown', (event) => this.startDrag(event, handle, index));
            handle.addEventListener('keydown', (event) => this.onKey(event, index));
            return handle;
        }));

        const ticks = [];
        for (let value = Math.ceil(this.min * 2) / 2; value <= this.max + 1e-9; value += 0.5) {
            const tick = document.createElement('span');
            tick.style.left = `${this.percent(value)}%`;
            tick.textContent = value.toFixed(1);
            ticks.push(tick);
        }
        this.scale.replaceChildren(...ticks);
    }

    limits(index) {
        const borders = this.borders();
        const lower = index > 0 ? borders[index - 1] + this.step : this.min;
        const upper = index < borders.length - 1 ? borders[index + 1] - this.step : this.max;
        return [lower, upper];
    }

    snap(value, index) {
        const [lower, upper] = this.limits(index);
        const snapped = Math.round(value / this.step) * this.step;
        return Math.round(Math.min(Math.max(snapped, lower), upper) * 100) / 100;
    }

    startDrag(event, handle, index) {
        event.preventDefault();
        handle.setPointerCapture(event.pointerId);
        handle.classList.add('grabbed');
        const rect = this.container.getBoundingClientRect();
        let value = this.borders()[index];
        const move = (moveEvent) => {
            const ratio = (moveEvent.clientX - rect.left) / rect.width;
            value = this.snap(this.min + ratio * (this.max - this.min), index);
            handle.style.left = `${this.percent(value)}%`;
            handle.querySelector('.value').textContent = value.toFixed(2);
        };
        const end = () => {
            handle.classList.remove('grabbed');
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', end);
            handle.removeEventListener('pointercancel', end);
            this.emit(index, value);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
    }

    onKey(event, index) {
        const delta = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? this.step
            : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -this.step : 0;
        if (!delta) return;
        event.preventDefault();
        this.emit(index, this.snap(this.borders()[index] + delta, index));
    }

    emit(index, value) {
        if (typeof this.onChange === 'function') this.onChange({index, value});
    }
}
