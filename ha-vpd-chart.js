class HaVpdChart extends HTMLElement {
    static get properties() {
        return {
            sensors: {type: Array},
            min_temperature: {type: Number},
            max_temperature: {type: Number},
            min_humidity: {type: Number},
            max_humidity: {type: Number},
            steps_temperature: {type: Number},
            steps_humidity: {type: Number},
            vpd_phases: {type: Array},
            air_text: {type: String},
            rh_text: {type: String},
            enable_tooltip: {type: Boolean},
            is_bar_view: {type: Boolean},
            enable_axes: {type: Boolean},
        };
    }

    constructor() {
        super();
        this.vpd_phases = [
            {upper: 0.4, className: 'under-transpiration'},
            {lower: 0.4, upper: 0.8, className: 'early-veg'},
            {lower: 0.8, upper: 1.2, className: 'late-veg'},
            {lower: 1.2, upper: 1.6, className: 'mid-late-flower'},
            {lower: 1.6, className: 'danger-zone'},
        ];
        this.vpdCache = new Map();
        this.sensors = [];
        this.is_bar_view = false;
        this.min_temperature = 5;
        this.max_temperature = 35;
        this.min_humidity = 10;
        this.max_humidity = 90;
        this.steps_temperature = .5;
        this.steps_humidity = 1;
        this.enable_tooltip = true;
        this.airText = "Air";
        this.rhText = "RH";
        this.enable_axes = true;
    }

    // Whenever the state changes, a new `hass` object is set. Use this to
    // update your content.
    set hass(hass) {
        if (this.is_bar_view === false) {
            this.buildChart(hass);
        } else {
            this.buildBarChart(hass);
        }
    }
    setConfig(config) {
        this.config = config;
        if (!config.sensors) {
            throw new Error('You need to define sensors');
        }

        this.vpd_phases = config.vpd_phases || this.vpd_phases;
        this.sensors = config.sensors || this.sensors;
        this.airText = config.air_text || "Air";
        this.rhText = config.rh_text || "RH";
        this.min_temperature = config.min_temperature || this.min_temperature;
        this.max_temperature = config.max_temperature || this.max_temperature;
        this.min_humidity = config.min_humidity || this.min_humidity;
        this.max_humidity = config.max_humidity || this.max_humidity;
        this.steps_temperature = config.steps_temperature || this.steps_temperature;
        this.steps_humidity = config.steps_humidity || this.steps_humidity;
        this.is_bar_view = config.is_bar_view || this.is_bar_view;
        this.enable_axes = config.enable_axes || this.enable_axes;
    }

    buildBarChart(hass) {
        if (!this.content) {
            this.innerHTML = `
                <ha-card header="VPD Informations">
                    <style>
                        @import '/hacsfiles/ha-vpd-chart/assets/bar.css'
                    </style>
                    <div class="vpd-card-container card-content"></div>
                    <div class="highlight mousePointer" style="opacity:0">
                        <div class="custom-tooltip"></div>
                    </div> <!-- Tooltip -->
                     <!-- add Legend for VPD Phases -->
                    <div class="legend">
                        <span class="vpd-state-legend">
                            <span class="under-transpiration"></span>
                            <span class="vpd-title">Under Transpiration</span>
                        </span>
                        <span class="vpd-state-legend">
                            <span class="early-veg"></span>
                            <span class="vpd-title">Early Veg</span>
                        </span>
                        <span class="vpd-state-legend">
                            <span class="late-veg"></span>
                            <span class="vpd-title">Late Veg</span>
                        </span>
                        <span class="vpd-state-legend">
                            <span class="mid-late-flower"></span>
                            <span class="vpd-title">Mid Late Flower</span>
                        </span>
                        <span class="vpd-state-legend">
                            <span class="danger-zone"></span>
                            <span class="vpd-title">Danger Zone</span>
                        </span>
                    </div>
                </ha-card>
            `;
            this.content = this.querySelector("div.vpd-card-container");
        }

        let container = document.createElement('div');

        this.config.sensors.forEach((sensor) => {
            let humidity = hass.states[sensor.humidity].state;
            let temperature = hass.states[sensor.temperature].state;
            let leafTemperature = temperature - sensor.leaf_temperature_offset || 2;
            if (sensor.leaf_temperature !== undefined) {
                leafTemperature = hass.states[sensor.leaf_temperature].state;
            }
            let vpd = hass.states[sensor.vpd].state || this.calculateVPD(parseFloat(leafTemperature), parseFloat(temperature), parseFloat(humidity)).toFixed(2)
            let card = document.createElement('ha-card');
            card.innerHTML += `
                    <div class="bar">
                        <span class="vpd-title">${sensor.name}</span>
                        <span class="vpd-value">${vpd} kPa</span>
                        <span class="vpd-rh">${this.rhText}: ${humidity}%</span>
                        <span class="vpd-temp">${this.airText}: ${temperature}°C</span>
                        <span class="vpd-state ${this.getPhaseClass(vpd)} tooltip"></span>
                    </div>
                `;
            container.appendChild(card);
            if (this.enable_tooltip) {
                this.content.addEventListener('mouseover', (event) => {
                    if (event.target.classList.contains('tooltip')) {
                        this.buildMouseTooltip(event.target, hass);
                    }
                });
                this.addEventListener('mouseleave', () => {
                    let tooltip = this.querySelector('.mousePointer');
                    let fadeOut = setInterval(function () {
                        if (!tooltip.style.opacity) {
                            tooltip.style.opacity = 1;
                        }
                        if (tooltip.style.opacity > 0) {
                            tooltip.style.opacity -= 0.1;
                        } else {
                            clearInterval(fadeOut);
                        }
                    }, 100);
                });
            } else {
                this.querySelector('.mousePointer').style.display = 'none';
            }
        });
        this.content.replaceChildren(container);
    }

    buildChart(hass) {
        // Initialize the content if it's not there yet.
        if (!this.content) {
            this.innerHTML = `
                <ha-card>
                    <style>
                        @import '/hacsfiles/ha-vpd-chart/assets/chart.css'
                    </style>
                    <div id="vpd-card-container" class="vpd-card-container"></div>
                    <div id="sensors"></div>
                    <div class="mouse-custom-tooltip" style="opacity: 0;"></div>
                </ha-card>
            `;
            this.content = this.querySelector("div.vpd-card-container");
            let table = this.buildTable();
            this.content.appendChild(table);
            if(this.enable_axes) {
                let axes = document.createElement('div');
                axes.className = 'axes';
                let temperatureAxis = document.createElement('div');
                temperatureAxis.className = 'temperature-axis';
                let humidityAxis = document.createElement('div');
                humidityAxis.className = 'humidity-axis';

                let range = this.max_temperature - this.min_temperature;
                let stepSize = range / (5 - 1); // Korrekt: Berechnen der Schrittgröße basierend auf der Range

                for (let i = 0; i < 5; i++) {
                    let currentValue = this.min_temperature + (stepSize * i);
                    let temp = document.createElement('div');
                    temp.className = 'temperature-axis-label';
                    // Runden auf eine sinnvolle Anzahl von Dezimalstellen, z.B. 0
                    temp.innerHTML = `${currentValue.toFixed(0)}°`; // Entfernt das Prozentzeichen, da es sich um Temperaturen handelt
                    temperatureAxis.appendChild(temp);
                }


                range = this.max_humidity - this.min_humidity;
                stepSize = range / (10 - 1); // Berechnen der Schrittgröße

                for (let i = 0; i < 10; i++) {
                    let currentValue = this.max_humidity - (stepSize * i);
                    let hum = document.createElement('div');
                    hum.className = 'humidity-axis-label';
                    // Runden auf eine sinnvolle Anzahl von Dezimalstellen, z.B. 1
                    hum.innerHTML = `${currentValue}%`;
                    humidityAxis.appendChild(hum);
                }
                axes.appendChild(temperatureAxis);
                axes.appendChild(humidityAxis);
                this.content.appendChild(axes);
            }
            if (this.enable_tooltip) {
                this.content.addEventListener('mouseover', (event) => {
                    if (event.target.classList.contains('cell')) {
                        this.buildMouseTooltip(event.target, hass);
                    }
                });
                this.addEventListener('mouseleave', () => {
                    let banner = this.querySelector('.mouse-custom-tooltip');
                    let fadeOut = setInterval(function () {
                        if (!banner.style.opacity) {
                            banner.style.opacity = 1;
                        }
                        if (banner.style.opacity > 0) {
                            banner.style.opacity -= 0.1;
                        } else {
                            clearInterval(fadeOut);
                        }
                    }, 100);
                });
            } else {
                this.querySelector('.mousePointer').style.display = 'none';
            }
        }
        this.buildTooltip(this.content, hass);
    }

    getCardSize() {
        return 3;
    }

    calculateVPD(Tleaf, Tair, RH) {
        const VPleaf = 610.7 * Math.exp(17.27 * Tleaf / (Tleaf + 237.3)) / 1000;
        const VPair = 610.7 * Math.exp(17.27 * Tair / (Tair + 237.3)) / 1000 * RH / 100;
        return VPleaf - VPair;
    }

    getPhaseClass(vpd) {
        /* add randomizer for development */
        for (const phase of this.vpd_phases) {
            if (phase.upper === undefined) {
                if (vpd >= phase.lower) {
                    return phase.className;
                }
            } else if (vpd < phase.upper && (!phase.lower || vpd >= phase.lower)) {
                return phase.className;
            }
        }
        return '';
    }

    buildTable() {
        const table = document.createElement('div');
        table.className = 'vpd-table';

        requestAnimationFrame(() => {
            const fragment = document.createDocumentFragment();
            let html = '';
            for (let Tair = this.min_temperature; Tair <= this.max_temperature; Tair += this.steps_temperature) {
                const Tleaf = Tair - 2;
                html += '<div class="row">';

                for (let RH = this.max_humidity; RH >= this.min_humidity; RH -= this.steps_humidity) {
                    const key = `${Tleaf}-${Tair}-${RH}`;
                    let vpd;
                    if (this.vpdCache.has(key)) {
                        vpd = this.vpdCache.get(key);
                    } else {
                        vpd = this.calculateVPD(Tleaf, Tair, RH).toFixed(2);
                        this.vpdCache.set(key, vpd);
                    }
                    const phaseClass = this.getPhaseClass(vpd);
                    html += `<div class="cell ${phaseClass}" data-air="${Tair}" data-leaf="${Tleaf}" data-rh="${RH}" data-vpd="${vpd}"></div>`;
                }

                html += '</div>';
            }
            const tempDiv = document.createElement('div');
            localStorage.setItem('vpd-table-card', html);
            tempDiv.innerHTML = html;
            while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
            }

            table.appendChild(fragment);
        });

        return table;
    }

    buildTooltip(table, hass) {
        const fragment = document.createDocumentFragment();
        const sensors = this.querySelector('#sensors');
        let vpd = 0;
        this.config.sensors.forEach((sensor, index) => {
            let humidity = hass.states[sensor.humidity].state;
            let temperature = hass.states[sensor.temperature].state;
            let leafTemperature = temperature - sensor.leaf_temperature_offset || temperature - 2;
            if (sensor.leaf_temperature !== undefined) {
                leafTemperature = hass.states[sensor.leaf_temperature].state;
            }
            if (sensor.vpd !== undefined) {
                vpd = hass.states[sensor.vpd].state;
            } else {
                vpd = this.calculateVPD(parseFloat(leafTemperature), parseFloat(temperature), parseFloat(humidity)).toFixed(2);
            }
            const relativeHumidity = this.max_humidity - humidity; // Umkehren der Berechnung
            const totalHumidityRange = this.max_humidity - this.min_humidity;
            const percentageHumidity = (relativeHumidity / totalHumidityRange) * 100;
            const relativeTemperature = temperature - this.min_temperature;
            const totalTemperatureRange = this.max_temperature - this.min_temperature;
            const percentageTemperature = (relativeTemperature / totalTemperatureRange) * 100;

            let circle = document.getElementsByClassName('sensor-circle-' + index)[0] || document.createElement('div');
            circle.className = 'highlight sensor-circle-' + index;
            circle.style.left = `${percentageHumidity}%`;
            circle.style.bottom = `${100 - percentageTemperature}%`;

            let horizontalLine = document.getElementsByClassName('horizontal-line-' + index)[0] || document.createElement('div');
            horizontalLine.className = 'horizontal-line horizontal-line-' + index;
            horizontalLine.style.top = `calc(${percentageTemperature}% - 5px)`;

            fragment.appendChild(horizontalLine);

            let verticalLine = document.getElementsByClassName('vertical-line-' + index)[0] || document.createElement('div');
            verticalLine.className = 'vertical-line vertical-line-' + index;
            verticalLine.style.left = `calc(${percentageHumidity}% - 0.5px)`;

            fragment.appendChild(verticalLine);

            let tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';
            tooltip.innerHTML = `<strong>${sensor.name}:</strong> kPa: ${vpd} | ${this.rhText}: ${humidity}% | ${this.airText}: ${temperature}°C`;
            circle.appendChild(tooltip);
            fragment.appendChild(circle);
        });

        requestAnimationFrame(() => {
            sensors.replaceChildren(fragment);
            this.adjustTooltipPositions();
        });
    }

    adjustTooltipPositions() {
        const containerRect = this.querySelector('#vpd-card-container').getBoundingClientRect();
        const tooltips = this.querySelectorAll('.custom-tooltip');
        tooltips.forEach(tooltip => {
            const tooltipRect = tooltip.getBoundingClientRect();
            if (tooltipRect.right > containerRect.right) {
                // Berechnen, wie weit das Tooltip nach links verschoben werden muss
                const overflow = tooltipRect.right - containerRect.right;
                tooltip.style.transform = `translateX(-${overflow}px)`;
            }
        });
    }
    buildMouseTooltip(target) {
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
        }
        this.tooltipTimeout = setTimeout(() => {

            const humidity = target.getAttribute('data-rh');
            const temperature = target.getAttribute('data-air');
            const vpd = parseFloat(target.getAttribute('data-vpd')).toFixed(2);

            let tooltip = this.querySelector('.mouse-custom-tooltip');
            tooltip.className = 'mouse-custom-tooltip';
            tooltip.innerHTML = `kPa: ${vpd} | ${this.rhText}: ${humidity}% | ${this.airText}: ${temperature}°C`;
            tooltip.style.opacity = 1;

        }, 1);
    }
}

customElements.define('ha-vpd-chart', HaVpdChart);
window.customCards = window.customCards || [];
window.customCards.push({
    type: "ha-vpd-chart",
    name: "Home Assistant VPD Chart",
    preview: false, // Optional - defaults to false
    description: "A custom card to display VPD values in a table",
    documentationURL: "https://github.com/mentalilll/ha-vpd-chart", // Adds a help link in the frontend card editor
});
