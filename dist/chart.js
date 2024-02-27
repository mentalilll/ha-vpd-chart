
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
            if(this.enable_axes) {
                let axes = document.createElement('div');
                axes.className = 'axes';
                let temperatureAxis = document.createElement('div');
                temperatureAxis.className = 'temperature-axis';
                let humidityAxis = document.createElement('div');
                humidityAxis.className = 'humidity-axis';

                let range = this.max_temperature - this.min_temperature;
                let stepSize = range / (5 - 1);
                for (let i = 0; i < 5; i++) {
                    let currentValue = this.min_temperature + (stepSize * i);
                    let temp = document.createElement('div');
                    temp.className = 'temperature-axis-label';
                    temp.innerHTML = `${currentValue.toFixed(0)}°`;
                    temperatureAxis.appendChild(temp);
                }


                range = this.max_humidity - this.min_humidity;
                stepSize = range / (10 - 1);

                for (let i = 0; i < 10; i++) {
                    let currentValue = this.max_humidity - (stepSize * i);
                    let hum = document.createElement('div');
                    hum.className = 'humidity-axis-label';

                    hum.innerHTML = `${currentValue.toFixed(0)}%`;
                    humidityAxis.appendChild(hum);
                }
                axes.appendChild(temperatureAxis);
                axes.appendChild(humidityAxis);
                this.content.appendChild(axes);
            }
            if(this.enable_ghostmap) {
                this.fetchDataForSensors()
                // each hour
                setInterval(() => {
                    this.fetchDataForSensors();
                }, 3600000);
            }
            if (this.enable_tooltip) {
                this.content.addEventListener('mouseover', (event) => {
                    if (event.target.classList.contains('cell')) {
                        this.buildMouseTooltip(event.target);
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
            }
        }

        this.buildTooltip();

    },
    buildTable() {
        const table = document.createElement('div');
        table.className = 'vpd-table';

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


        return table;
    },
    buildTooltip() {
        const fragment = document.createDocumentFragment();
        const sensors = this.querySelector('#sensors');
        let vpd = 0;
        this.config.sensors.forEach((sensor, index) => {
            let humidity = this._hass.states[sensor.humidity].state;
            let temperature = this._hass.states[sensor.temperature].state;
            let leafTemperature = temperature - sensor.leaf_temperature_offset || temperature - 2;
            if (sensor.leaf_temperature !== undefined) {
                leafTemperature = this._hass.states[sensor.leaf_temperature].state;
            }
            if (sensor.vpd !== undefined) {
                vpd = this._hass.states[sensor.vpd].state;
            } else {
                vpd = this.calculateVPD(parseFloat(leafTemperature), parseFloat(temperature), parseFloat(humidity)).toFixed(2);
            }
            const relativeHumidity = this.max_humidity - humidity; // Umkehren der Berechnung
            const totalHumidityRange = this.max_humidity - this.min_humidity;
            const percentageHumidity = (relativeHumidity / totalHumidityRange) * 100;
            const relativeTemperature = temperature - this.min_temperature;
            const totalTemperatureRange = this.max_temperature - this.min_temperature;
            const percentageTemperature = (relativeTemperature / totalTemperatureRange) * 100;

            let circle = this.querySelectorAll('sensor-circle-' + index)[0] || document.createElement('div');
            circle.className = 'highlight sensor-circle sensor-circle-' + index;
            circle.dataset.index = index;
            circle.style.left = `${percentageHumidity}%`;
            circle.style.bottom = `${100 - percentageTemperature}%`;
            let horizontalLine = this.querySelectorAll('horizontal-line-' + index)[0] || document.createElement('div');
            horizontalLine.className = 'horizontal-line horizontal-line-' + index;
            horizontalLine.style.top = `calc(${percentageTemperature}% - 5px)`;

            fragment.appendChild(horizontalLine);

            let verticalLine = this.querySelectorAll('vertical-line-' + index)[0] || document.createElement('div');
            verticalLine.className = 'vertical-line vertical-line-' + index;
            verticalLine.style.left = `calc(${percentageHumidity}% - 0.5px)`;

            fragment.appendChild(verticalLine);

            let tooltip = this.querySelectorAll('.custom-tooltip-' + index)[0] || document.createElement('div');
            tooltip.className = 'custom-tooltip custom-tooltip-' + index;
            tooltip.innerHTML = `<strong>${sensor.name}:</strong> kPa: ${vpd} | ${this.rh_text}: ${humidity}% | ${this.air_text}: ${temperature}°C`;
            circle.replaceChildren(tooltip);
            if(this.enable_ghostmap) {
                circle.addEventListener('mouseover', (event) => {
                    this.querySelectorAll('.history-circle-' + index).forEach(circle => {
                        circle.style.display = 'block';
                    });
                    this.querySelectorAll('.custom-tooltip').forEach(tooltip => {
                        if(!tooltip.classList.contains('custom-tooltip-' + index)) {
                            tooltip.style.display = 'none';
                        } else {
                            tooltip.style.opacity = 0.75;
                        }
                    });
                    this.querySelectorAll('.horizontal-line').forEach(line => {
                        if(!line.classList.contains('horizontal-line-' + index)) {
                            line.style.display = 'none';
                        }
                    });
                    this.querySelectorAll('.vertical-line').forEach(line => {
                        if(!line.classList.contains('vertical-line-' + index)) {
                            line.style.display = 'none';
                        }
                    });
                    this.querySelectorAll('.sensor-circle').forEach(circle => {
                        if(!circle.classList.contains('sensor-circle-' + index)) {
                            circle.style.display = 'none';
                        }
                    });

                });
                circle.addEventListener('mouseleave', () => {
                    this.querySelectorAll('.history-circle-' + index).forEach(circle => {
                        circle.style.display = 'none';
                    });
                    this.querySelectorAll('.custom-tooltip').forEach(tooltip => {
                        tooltip.style.display = 'block';
                        tooltip.style.opacity = 1;
                    });
                    this.querySelectorAll('.horizontal-line').forEach(line => {
                        line.style.display = 'block';
                    });
                    this.querySelectorAll('.vertical-line').forEach(line => {
                        line.style.display = 'block';
                    });
                    this.querySelectorAll('.sensor-circle').forEach(circle => {
                        circle.style.display = 'block';
                    });
                });
            }

            fragment.appendChild(circle);
        });

        sensors.replaceChildren(fragment);
        this.adjustTooltipPositions();
    },
    adjustTooltipPositions() {
        const containerRect = this.querySelector('#vpd-card-container').getBoundingClientRect();
        const tooltips = this.querySelectorAll('.custom-tooltip');
        tooltips.forEach(tooltip => {
            const tooltipRect = tooltip.getBoundingClientRect();
            if (tooltipRect.right > containerRect.right) {
                const overflow = tooltipRect.right - containerRect.right;
                tooltip.style.transform = `translateX(-${overflow}px)`;
            }
        });
    },
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
            tooltip.innerHTML = `kPa: ${vpd} | ${this.rh_text}: ${humidity}% | ${this.air_text}: ${temperature}°C | ${target.classList[1]}`;
            tooltip.style.opacity = 1;

        }, 1);
    },
}