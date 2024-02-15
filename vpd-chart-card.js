class VpdTableCard extends HTMLElement {
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
            enable_tooltip: {type: Boolean}
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
        this.min_temperature = 5;
        this.max_temperature = 35;
        this.min_humidity = 10;
        this.max_humidity = 90;
        this.steps_temperature = .5;
        this.steps_humidity = 1;
        this.enable_tooltip = true;
        this.airText = "Air";
        this.rhText = "RH";
    }

    // Whenever the state changes, a new `hass` object is set. Use this to
    // update your content.
    set hass(hass) {
        // Initialize the content if it's not there yet.
        if (!this.content) {
            this.innerHTML = `
        <ha-card>
            <style>
                ha-card, ha-card .vpd-card-container {
                    height: 100%;
                    min-height: 400px;
                    overflow:hidden;
                }
                
                body, html {
                    font-family: "Segoe UI", Arial, sans-serif;
                    font-size: 10px;
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    position: relative;
                }
                
                .danger-zone {
                    background-color: #ce4234;
                }
                
                .early-veg {
                    background-color: #22ab9c;
                }
                
                .late-veg {
                    background-color: #9cc55b;
                }
                
                .mid-late-flower {
                    background-color: #e7c12b;
                }
                
                .under-transpiration {
                    background-color: #1a6c9c;
                }
                
                table {
                    width: 100%;
                    height: 100%;
                }
                
                table, th, td {
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-collapse: collapse;
                }
                
                th, td {
                    text-align: center;
                    min-width: 2px;
                }
                
                .highlight {
                    position: relative;
                    z-index: 2;
                    background-color: white !important; /* oder eine andere Farbe Ihrer Wahl */
                    color: #333333 !important;
                    cursor: pointer;
                }
                .mousePointer {
                    z-index:9999;
                }
                .custom-tooltip {
                    bottom: 150%;
                    
                    margin-bottom: 5px;
                    /*margin-left: -120px;*/
                    margin-left: -5px;
                    padding: 7px;
                    width: 240px;
                    -webkit-border-radius: 3px;
                    -moz-border-radius: 3px;
                    border-radius: 3px;
                    background-color: #000000;
                    background-color: hsla(0, 0%, 20%, 0.9);
                    color: #ffffff;
               
                    text-align: center;
                    font-size: 12px;
                    line-height: 1.2;
                    position: absolute;
                }
                
                .custom-tooltip:after {
                
                    position: absolute;
                    bottom: -15%;
                    left: 2%;
                    
                    width: 0;
                    border-top: 5px solid #000000;
                    border-top: 5px solid hsla(0, 0%, 20%, 0.9);
                    border-right: 5px solid transparent;
                    border-left: 5px solid transparent;
                    content: " ";
                    font-size: 0;
                    line-height: 0;
                }
                
                .vpd-table {
                    display: table;
                    width: 100%;
                    height: 100%;
                }
                
                .row {
                    display: table-row;
                    background-color: #ffffff;
                }
                
                .cell {
                    display: table-cell;
                }
            </style>
            <div class="vpd-card-container"></div>
            <div class="highlight mousePointer" style="opacity:0">
                <div class="custom-tooltip"></div>
            </div> <!-- Tooltip -->
        </ha-card>
      `;
            this.content = this.querySelector("div.vpd-card-container");
        }
        let table;
        if (localStorage.getItem('vpd-table-card')) {
            table = localStorage.getItem('vpd-table-card');
        } else {
            table = this.buildTable();
            localStorage.setItem('vpd-table-card', table);
        }
        this.content.innerHTML = "<div class='vpd-table'>" + table + "</div>";
        this.buildTooltip(this.content, hass);
        if (this.enable_tooltip) {
            this.content.addEventListener('mouseover', (event) => {
                if (event.target.classList.contains('cell')) {
                    this.buildMouseTooltip(event.target, hass);
                }
            });
            this.addEventListener('mouseleave', (event) => {
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
        }  else {
            this.querySelector('.mousePointer').style.display = 'none';
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
        this.config.sensors.forEach((sensor, index) => {
            let humidity = hass.states[sensor.humidity].state;
            let temperature = hass.states[sensor.temperature].state;
            let leafTemperature = temperature - 2;
            if (sensor.leaf_temperature !== undefined) {
                leafTemperature = hass.states[sensor.leaf_temperature].state;
            }
            let vpd = sensor.vpd || this.calculateVPD(parseFloat(leafTemperature), parseFloat(temperature), parseFloat(humidity)).toFixed(2)
            const relativeHumidity = this.max_humidity - humidity; // Umkehren der Berechnung
            const totalHumidityRange = this.max_humidity - this.min_humidity;
            const percentageHumidity = (relativeHumidity / totalHumidityRange) * 100;
            const relativeTemperature = temperature - this.min_temperature;
            const totalTemperatureRange = this.max_temperature - this.min_temperature;
            const percentageTemperature = (relativeTemperature / totalTemperatureRange) * 100;

            const horizontalLine = document.createElement('div');
            horizontalLine.style.position = 'absolute';
            horizontalLine.style.left = 0;
            horizontalLine.style.right = 0;
            horizontalLine.style.top = `calc(${percentageTemperature}% - 5px)`;
            horizontalLine.style.height = '1px';
            horizontalLine.style.backgroundColor = 'rgba(255,255,255,0.4)';
            this.content.appendChild(horizontalLine);

            const verticalLine = document.createElement('div');
            verticalLine.style.position = 'absolute';
            verticalLine.style.top = 0;
            verticalLine.style.bottom = 0;
            verticalLine.style.left = `calc(${percentageHumidity}% - 0.5px)`;
            verticalLine.style.width = '1px';
            verticalLine.style.backgroundColor = 'rgba(255,255,255,0.4)';
            this.content.appendChild(verticalLine);

            const circle = document.createElement('div');
            circle.className = 'highlight';
            circle.style.width = "10px";
            circle.style.height = "10px";
            circle.style.backgroundColor = "white";
            circle.style.borderRadius = "50%";
            circle.style.position = "absolute";
            circle.style.left = `${percentageHumidity}%`;
            circle.style.bottom = `${100 - percentageTemperature}%`;
            circle.style.transform = "translateX(-50%)";

            const tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';

            tooltip.innerHTML = `<strong>${sensor.name}:</strong> kPa: ${vpd} | ${this.rhText}: ${humidity}% | ${this.airText}: ${temperature}°C`;
            circle.appendChild(tooltip);

            fragment.appendChild(circle);
        });

        requestAnimationFrame(() => {
            table.appendChild(fragment);
        });
    }

    buildMouseTooltip(target) {
        const humidity = target.getAttribute('data-rh');
        const temperature = target.getAttribute('data-air');
        const vpd = parseFloat(target.getAttribute('data-vpd')).toFixed(2);
        const percentageHumidity = ((this.max_humidity - humidity) / (this.max_humidity - this.min_humidity)) * 100;
        const percentageTemperature = ((temperature - this.min_temperature) / (this.max_temperature - this.min_temperature)) * 100;

        let circle = this.querySelector('.mousePointer');
        circle.className = 'highlight mousePointer';
        circle.style.cssText = `width: 10px; height: 10px; background-color: white; border-radius: 50%; position: absolute; transform: translateX(-50%); left: ${percentageHumidity}%; bottom: ${100 - percentageTemperature}%;`;
        let tooltip = circle.querySelector('.custom-tooltip') || document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.innerHTML = `<strong>kPa:</strong> ${vpd} | <strong>${this.rhText}:</strong> ${humidity}% | <strong>${this.airText}:</strong> ${temperature}°C`;
        if (!this.content.querySelector('.mousePointer')) {
            circle.appendChild(tooltip);
        }
    }
}

customElements.define('vpd-table-card', VpdTableCard);
window.customCards = window.customCards || [];
window.customCards.push({
    type: "vpd-table-card",
    name: "VPD Table Card",
    preview: false, // Optional - defaults to false
    description: "A custom card to display VPD values in a table",
    documentationURL: "https://github.com/mentalilll/ha-vpd-chart", // Adds a help link in the frontend card editor
});
