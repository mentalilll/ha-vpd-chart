export class MultiRange {
    constructor(placeholderElm, settings) {
        settings = typeof settings == 'object' ? settings : {}; 

        this.settings = {
            minRange: typeof settings.minRange == 'number' ? settings.minRange : 1,
            tickStep: settings.tickStep || .1,
            step: typeof settings.step == 'number' ? settings.step : 1,
            scale: 100,
            min: settings.min || 0,
            max: settings.max || 100,
        }
        this.EventDispatcher();
        this.delta = this.settings.max - this.settings.min;

        if (settings.ticks)
            this.settings.tickStep = this.delta / settings.ticks;

        this.ranges = settings.ranges || [
            this.settings.min + this.settings.tickStep,
            this.settings.max - this.settings.tickStep
        ]

        this.id = Math.random().toString(36).substring(2, 9);
        this.DOM = {};
        if(placeholderElm !== null) {
            this.build(placeholderElm);
            this.events.binding.call(this);
        }
    }

    build(placeholderElm) {
        let that = this,
            scopeClasses = placeholderElm.className.indexOf('multiRange') === -1 ?
                'multiRange ' + placeholderElm.className :
                placeholderElm.className;

        this.DOM.scope = document.createElement('div');
        this.DOM.scope.className = scopeClasses;

        this.DOM.rangeWrap = document.createElement('div');
        this.DOM.rangeWrap.className = 'multiRange__rangeWrap';
        this.DOM.rangeWrap.innerHTML = this.getRangesHTML();

        this.DOM.ticks = document.createElement('div');
        this.DOM.ticks.className = 'multiRange__ticks';
        this.DOM.ticks.innerHTML = this.generateTicks();

        this.DOM.scope.appendChild(this.DOM.rangeWrap);
        this.DOM.scope.appendChild(this.DOM.ticks);

        placeholderElm.parentNode.replaceChild(this.DOM.scope, placeholderElm);
    }
    update(ranges) {
        this.ranges = ranges;
        this.DOM.rangeWrap.innerHTML = '';
        this.DOM.rangeWrap.innerHTML = this.getRangesHTML();
        this.DOM.ticks.innerHTML = this.generateTicks();

    }

    generateTicks() {
        let steps = (this.delta) / this.settings.tickStep,
            HTML = '',
            value,
            i;

        for (i = 0; i <= steps; i++) {
            value = (+this.settings.min) + this.settings.tickStep * i;
            value = value.toFixed(2);
            HTML += '<div data-value="' + value + '"></div>';
        }

        return HTML;
    }

    getRangesHTML() {
        let that = this,
            rangesHTML = '',
            ranges;


        ranges = this.ranges;

        ranges.forEach(function (range, i) {
            if (i === ranges.length - 1) return;

            let leftPos = (range.value - that.settings.min) / (that.delta) * 100;
            if (leftPos < 0)
                leftPos = 0;
            rangesHTML += '<div data-idx="' + i + '" class="multiRange__range" \
                style="left:' + leftPos + '%; color: '+range.color+';">\
                <div class="multiRange__handle">\
                    <div class="multiRange__handle__value">' + parseFloat(range.value).toFixed(2) + '</div>\
                </div>\
            </div>';
        })

        return rangesHTML;
    }

    EventDispatcher() {
        let target = document.createTextNode('');
        this.off = target.removeEventListener.bind(target);
        this.on = target.addEventListener.bind(target);
        this.trigger = function (eventName, data) {
            if (!eventName) return;
            let e = new CustomEvent(eventName, {"detail": data});
            target.dispatchEvent(e);
        }
    }

    events = {
        binding: function () {
            this.DOM.rangeWrap.addEventListener('mousedown', this.events.callbacks.onMouseDown.bind(this))
            this.DOM.scope.addEventListener("dragstart", function (e) { return false });
        },
        callbacks: {
            onMouseDown: function (e) {
                let target = e.target?.className === 'multiRange__handle__value' ? e.target.parentNode : e.target;

                if (!target || target.className !== 'multiRange__handle') return;

                let _BCR = this.DOM.scope.getBoundingClientRect();
                this.offsetLeft = _BCR.left;
                this.scopeWidth = _BCR.width;
                this.DOM.currentSlice = target.parentNode;

                this.DOM.currentSlice.classList.add('grabbed');
                this.DOM.currentSliceValue = this.DOM.currentSlice.querySelector('.multiRange__handle__value');

                document.body.classList.add('multiRange-grabbing');

                this.events.onMouseUpFunc = this.events.callbacks.onMouseUp.bind(this);
                this.events.mousemoveFunc = this.events.callbacks.onMouseMove.bind(this);

                window.addEventListener('mouseup', this.events.onMouseUpFunc);
                window.addEventListener('mousemove', this.events.mousemoveFunc);
            },

            onMouseUp: function (e) {
                if (this.DOM.currentSlice) {
                    this.DOM.currentSlice.classList.remove('grabbed');
                }
                ['mousemove', 'mouseup'].forEach(event => window.removeEventListener(event, this.events[event + 'Func']));
                document.body.classList.remove('multiRange-grabbing');

                if (this.DOM.currentSlice) {
                    let value = this.settings.min + (this.delta / 100 * parseInt(this.DOM.currentSlice.style.left));
                    value = this.settings.step ? Math.round(value / this.settings.step) * this.settings.step : value;
                    value = parseFloat(value).toFixed(2);

                    this.trigger('changed', { idx: +this.DOM.currentSlice.dataset.idx, value: value, ranges: this.ranges});
                    this.DOM.currentSlice = null;
                }
            },

            onMouseMove: function (e) {
                if (!this.DOM.currentSlice || e.clientX < this.offsetLeft || e.clientX > (this.offsetLeft + this.scopeWidth)) {
                    window.removeEventListener('mouseup', this.events.onMouseUpFunc);
                    return;
                }

                const xPosScopeLeft = e.clientX - this.offsetLeft;
                const leftPrecentage = xPosScopeLeft / this.scopeWidth * 100;

                const currentIndex = +this.DOM.currentSlice.dataset.idx;
                const prevSliceValue = this.ranges[currentIndex - 1]?.value || this.settings.min;
                const nextSliceValue = this.ranges[currentIndex + 1]?.value;

                let value = parseFloat(this.settings.min) + (this.delta / 100 * leftPrecentage);
                if (this.settings.step) {
                    value = Math.round((value) / this.settings.step) * this.settings.step;
                }

                if (value < prevSliceValue || value > nextSliceValue) {
                    return;
                }

                window.requestAnimationFrame(() => {
                    if (this.DOM.currentSlice) {
                        this.DOM.currentSlice.style.left = `${leftPrecentage}%`;
                        this.DOM.currentSliceValue.innerHTML = parseFloat(value).toFixed(2);
                    }
                });

                this.ranges[this.DOM.currentSlice.dataset.idx].value = +parseFloat(value).toFixed(2);
            }
        }
    }
}