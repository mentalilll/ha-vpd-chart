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
            vpd_phases: {type: Array}
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
        this.intervalId = null;
        this.sensors = [];
        this.min_temperature = 5;
        this.max_temperature = 40;
        this.min_humidity = 10;
        this.max_humidity = 90;
        this.steps_temperature = .5;
        this.steps_humidity = 1;
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
                height:100%;
                min-height:400px;
            }
            body,html {
                font-family: "Segoe UI", Arial, sans-serif;
                font-size: 10px;
                margin:0;
                padding:0;
                height:100%;
                position:relative;
            }
            .danger-zone { background-color: #ce4234; }
            .early-veg { background-color: #22ab9c; }
            .late-veg { background-color: #9cc55b; }
            .mid-late-flower { background-color: #e7c12b; }
            .under-transpiration { background-color: #1a6c9c; }
            table, th, td { border: 1px solid rgba(255,255,255,0.05); border-collapse: collapse; }
            th, td { text-align: center; min-width:2px;}
            .highlight {
                background-color: white !important; /* oder eine andere Farbe Ihrer Wahl */
                color:#333333 !important;
            }
            table {
                width:100%;
                height:100%;
            }
            .highlight {
                position: relative;
                z-index: 2;
            }
            .custom-tooltip {
                width: 240px;
                background-color: rgba(0, 0, 0, 0.5);
                color: #fff;
                text-align: left;
                border-radius: 6px;
                padding: 5px;
                position: absolute;
                z-index: 3;
                bottom: 100%;
                left: 50%;
                margin-left: 10px; 
                transition: opacity 0.3s;
                font-size: 12px; 
            }
            .custom-tooltip:focus {
                z-index:9999999;
            }

            .highlight:hover .custom-tooltip {
                visibility: visible;
                opacity: 1;
            }

            .highlight {
                cursor: pointer; 
            }
            </style>
            <div class="vpd-card-container"></div>
        </ha-card>
      `;
            this.content = this.querySelector("div.vpd-card-container");
        }
        this.content.innerHTML = "";
        this.initTable(hass);
    }

    setConfig(config) {
        this.config = config;

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

    initTable(hass) {
        const container = this.content;
        container.innerHTML = '';

        const table = document.createElement('table');
        table.className = 'vpd-table';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        container.appendChild(table);
        table.appendChild(thead);
        table.appendChild(tbody);
        this.buildTable(tbody);
        this.buildTooltip(table, hass);
        console.log('finished');

    }

    buildTable(tbody) {
        for (let Tair = this.min_temperature; Tair <= this.max_temperature; Tair += this.steps_temperature) {
            const Tleaf = Tair - 2;
            const row = document.createElement('tr');
            tbody.appendChild(row);

            for (let RH = this.max_humidity; RH >= this.min_humidity; RH -= this.steps_humidity) {
                const vpd = this.calculateVPD(Tleaf, Tair, RH);
                const phaseClass = this.getPhaseClass(vpd);
                const cell = document.createElement('td');
                row.appendChild(cell);
                cell.className = `${phaseClass}`;

            }
        }
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

    buildTooltip(table, hass) {
        this.config.sensors.forEach((sensor, index)=> {
            let humidity = hass.states[sensor.humidity].state;
            let temperature = hass.states[sensor.temperature].state;
            let name = sensor.name || `Tent ${index + 1}`;
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

            let vpa = this.calculateVPD(parseFloat(temperature-2), parseFloat(temperature), parseFloat(humidity)).toFixed(2);

            tooltip.innerHTML = `<strong>${name}:</strong> kPa: ${vpa} | ${this.rhText}: ${humidity}% | ${this.airText}: ${temperature}°C`;

            circle.appendChild(tooltip);
            table.appendChild(circle);
        })


    }
}
customElements.define('vpd-table-card', VpdTableCard);