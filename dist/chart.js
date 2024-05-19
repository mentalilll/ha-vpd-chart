export const chart = {
    buildChart() {
        if (!this.content) {
            this.innerHTML = `
                <ha-card class="vpd-chart-view">
                    <style>
                        @import '/hacsfiles/ha-vpd-chart/chart.css'
                    </style>
                    <div id="vpd-card-container" class="vpd-card-container"></div>
                    <div id="ghostmap"></div>
                    <div id="sensors"></div>
                    <div class="mouse-custom-tooltip" style="opacity: 0;"></div>
                </ha-card>
            `;
            this.content = this.querySelector("div.vpd-card-container");
            let table = this.buildTable();
            this.content.appendChild(table);
            if (this.min_height > 0) {
                this.content.style.minHeight = `${this.min_height}px`;
                this.querySelector("div.vpd-container").style.minHeight = `${this.min_height}px`;
            }
            if (this.enable_axes) {
                const grid = document.createElement('div');
                grid.className = 'vpd-grid';

                // Create horizontal grid lines and temperature labels
                const temperatureSteps = 7;
                for (let i = 0; i <= temperatureSteps; i++) {
                    const line = document.createElement('div');
                    line.className = 'grid-line horizontal';
                    line.style.top = `${(i / temperatureSteps) * 100}%`;

                    const label = document.createElement('div');
                    label.className = 'temperature-axis-label';
                    const currentValue = this.min_temperature + (i * (this.max_temperature - this.min_temperature) / temperatureSteps);
                    label.innerHTML = `${currentValue.toFixed(0)}°C`;
                    label.style.top = `${(i / temperatureSteps) * 100}%`;
                    grid.appendChild(line);
                    if(label.style.top !== '100%' && label.style.top !== '0%') {
                        grid.appendChild(label);
                    }
                }

                // Create vertical grid lines and humidity labels
                const humiditySteps = 9;
                for (let i = 0; i <= humiditySteps; i++) {
                    const line = document.createElement('div');
                    line.className = 'grid-line vertical';
                    line.style.left = `${(i / humiditySteps) * 100}%`;

                    const label = document.createElement('div');
                    label.className = 'humidity-axis-label';
                    const currentValue = this.max_humidity - (i * (this.max_humidity - this.min_humidity) / humiditySteps);
                    label.innerHTML = `${currentValue.toFixed(0)}%`;
                    label.style.left = `${(i / humiditySteps) * 100}%`;
                    grid.appendChild(line);
                    if(label.style.left !== '100%' && label.style.left !== '0%') {
                        grid.appendChild(label);
                    }
                }
                this.content.appendChild(grid);
            }

            if (this.enable_ghostmap) {
                this.fetchDataForSensors();
                // each hour
                setInterval(() => {
                    this.fetchDataForSensors();
                }, 3600000);
            }

            this.content.addEventListener('mouseover', (event) => {
                // get mouse position on the container
                const rect = this.content.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                const target = event.target;

                const xPercent = (x / rect.width) * 100;
                const yPercent = (y / rect.height) * 100;

                const temperatureRange = this.max_temperature - this.min_temperature;
                const humidityRange = this.max_humidity - this.min_humidity;

                const temperature = this.min_temperature + (temperatureRange * yPercent / 100);
                const humidity = this.max_humidity - (humidityRange * xPercent / 100);
                const leafTemperature = temperature - 2;
                const vpd = this.calculateVPD(leafTemperature, temperature, humidity);
                this.buildMouseTooltip(target, humidity, temperature, vpd);
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

        }

        this.buildTooltip();
    },
    buildTable() {
        const container = document.createElement('div');
        container.className = 'vpd-container';

        for (let Tair = this.min_temperature; Tair <= this.max_temperature; Tair += this.steps_temperature) {
            const row = document.createElement('div');
            row.className = 'vpd-row';
            const Tleaf = Tair - 2;
            let startIndex = this.max_humidity;
            let startClass = this.getPhaseClass(this.calculateVPD(Tleaf, Tair, startIndex).toFixed(2));
            const totalHumidityRange = this.max_humidity; // Change this line

            for (let RH = this.max_humidity; RH >= 0; RH -= this.steps_humidity) { // Change this line
                const vpd = this.calculateVPD(Tleaf, Tair, RH).toFixed(2);
                const currentClass = this.getPhaseClass(vpd);

                if (currentClass !== startClass) {
                    const adjustedRH = RH + this.steps_humidity;
                    const div = document.createElement('div');
                    div.className = `cell ${startClass}`;
                    div.style.width = `${(startIndex - adjustedRH) * 100 / totalHumidityRange}%`; // Change this line
                    row.appendChild(div);
                    startIndex = RH;
                    startClass = currentClass;
                }
            }

            // Handle the remaining segment as "danger-zone"
            if (startIndex >= 0) { // Change this line
                const div = document.createElement('div');
                div.className = `cell ${startClass || 'danger-zone'} danger-zone`;
                div.style.width = `${parseFloat((startIndex * 100) / totalHumidityRange) + 0.5}%`; // Change this line
                row.appendChild(div);
            }

            container.appendChild(row);
        }

        return container;
    },
    buildTooltip() {
        const sensors = this.querySelector('#sensors');
        let vpd = 0;
        this.config.sensors.forEach((sensor, index) => {

            let humidity = this._hass.states[sensor.humidity].state;
            let temperature = this._hass.states[sensor.temperature].state;
            let leafTemperature = (temperature - sensor.leaf_temperature_offset || temperature - 2).toString();
            let indexString = index.toString();
            if (sensor.leaf_temperature !== undefined) {
                leafTemperature = this._hass.states[sensor.leaf_temperature].state;
            }
            if (sensor.vpd !== undefined) {
                vpd = this._hass.states[sensor.vpd].state;
            } else {
                vpd = this.calculateVPD(parseFloat(leafTemperature), parseFloat(temperature), parseFloat(humidity)).toFixed(2);
            }

            const relativeHumidity = this.max_humidity - humidity;
            const totalHumidityRange = this.max_humidity - this.min_humidity;
            const percentageHumidity = (relativeHumidity / totalHumidityRange) * 100;
            const relativeTemperature = temperature - this.min_temperature;
            const totalTemperatureRange = this.max_temperature - this.min_temperature;
            const percentageTemperature = (relativeTemperature / totalTemperatureRange) * 100;


            let pointer = this.querySelector(`.sensor-pointer[data-index="${index}"]`) || document.createElement('div');
            pointer.setAttribute('data-index', indexString);
            pointer.style.left = `${percentageHumidity}%`;
            pointer.style.bottom = `${100 - percentageTemperature}%`;

            if (this.enable_triangle) {
                pointer.className = 'highlight sensor-pointer sensor-triangle sensor-pointer-' + indexString;
            } else {
                pointer.className = 'highlight sensor-pointer sensor-circle sensor-pointer-' + indexString;
            }
            let horizontalLine = this.querySelector(`.horizontal-line[data-index="${index}"]`) || document.createElement('div');
            horizontalLine.className = 'horizontal-line horizontal-line-' + indexString;
            horizontalLine.setAttribute('data-index', indexString);
            horizontalLine.style.top = `calc(${percentageTemperature}% - 5px)`;

            let verticalLine = this.querySelector(`.vertical-line[data-index="${index}"]`) || document.createElement('div');
            verticalLine.className = 'vertical-line vertical-line-' + indexString;
            verticalLine.setAttribute('data-index', indexString);
            verticalLine.style.left = `calc(${percentageHumidity}% - 0.5px)`;
            if (this.enable_tooltip) {
                let tooltip = this.querySelector(`.custom-tooltip[data-index="${index}"]`) || document.createElement('div');
                tooltip.className = 'custom-tooltip custom-tooltip-' + indexString;
                tooltip.setAttribute('data-index', indexString);
                tooltip.innerHTML = `<span><strong>${sensor.name}</strong></span> <span>kPa: ${vpd}</span><span>${this.rh_text ? this.rh_text + ':' : ''} ${humidity}%</span><span>${this.air_text ? this.air_text + ':' : ''} ${temperature}°C</span>`;
                tooltip.style.left = `${percentageHumidity}%`;
                tooltip.style.bottom = `${100 - percentageTemperature}%`;
                if (!pointer.isConnected) {
                    sensors.appendChild(tooltip);
                }
            }

            if (!pointer.isConnected) {
                sensors.appendChild(pointer);
            }
            if (!horizontalLine.isConnected) {
                sensors.appendChild(horizontalLine);
            }
            if (!verticalLine.isConnected) {
                sensors.appendChild(verticalLine);
            }
            if (this.enable_ghostmap) {
                if (!pointer.hasAttribute('data-events-bound')) {
                    pointer.setAttribute('data-events-bound', 'true');
                    pointer.addEventListener('mouseover', () => {
                        this.querySelectorAll('.history-circle-' + index).forEach(circle => {
                            circle.style.display = 'block';
                        });
                        this.querySelectorAll('.custom-tooltip').forEach(tooltip => {
                            if (!tooltip.classList.contains('custom-tooltip-' + index)) {
                                tooltip.style.display = 'none';
                            } else {
                                tooltip.style.opacity = '0.45';
                            }
                        });
                        this.querySelectorAll('.horizontal-line').forEach(line => {
                            if (!line.classList.contains('horizontal-line-' + index)) {
                                line.style.display = 'none';
                            }
                        });
                        this.querySelectorAll('.vertical-line').forEach(line => {
                            if (!line.classList.contains('vertical-line-' + index)) {
                                line.style.display = 'none';
                            }
                        });
                        this.querySelectorAll('.sensor-pointer').forEach(circle => {
                            if (!circle.classList.contains('sensor-pointer-' + index)) {
                                circle.style.display = 'none';
                            }
                        });

                    });
                    pointer.addEventListener('mouseleave', () => {
                        this.querySelectorAll('.history-circle-' + index).forEach(circle => {
                            circle.style.display = 'none';
                        });
                        this.querySelectorAll('.custom-tooltip').forEach(tooltip => {
                            tooltip.style.display = 'block';
                            tooltip.style.opacity = '1';
                        });
                        this.querySelectorAll('.horizontal-line').forEach(line => {
                            line.style.display = 'block';
                        });
                        this.querySelectorAll('.vertical-line').forEach(line => {
                            line.style.display = 'block';
                        });
                        this.querySelectorAll('.sensor-pointer').forEach(circle => {
                            circle.style.display = 'block';
                        });
                    });
                }
            }
        });
    },

    buildMouseTooltip(target, targetHumidity= null, targetTemperature= null, targetVpd = null) {
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
        }
        this.tooltipTimeout = setTimeout(() => {
            // get current %percent offset of container and calculate the actual value


            const humidity = targetHumidity.toFixed(2) || parseFloat(target.getAttribute('data-rh')).toFixed(2);
            const temperature = targetTemperature.toFixed(2) || parseFloat(target.getAttribute('data-air')).toFixed(2);
            const vpd = targetVpd.toFixed(2) || parseFloat(target.getAttribute('data-vpd')).toFixed(2);

            let tooltip = this.querySelector('.mouse-custom-tooltip');
            tooltip.className = 'mouse-custom-tooltip';
            tooltip.innerHTML = `kPa: ${vpd} | ${this.rh_text}: ${humidity}% | ${this.air_text}: ${temperature}°C | ${target.classList[1]}`;
            tooltip.style.opacity = '1';

        }, 1);
    },
}