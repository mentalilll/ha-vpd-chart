export const bar = {
    async initializeBar() {
        this.htmlTemplate = `
            <ha-card class="vpd-bar-view" style="display:none;">
                    <style>
                        @import '##url##?v=${window.vpdChartVersion}'                    
                    </style>
                    <div class="card-content"></div>
                    <div class="highlight mousePointer" style="opacity:0">
                        <div class="custom-tooltip"></div>
                    </div> <!-- Tooltip -->
                     <!-- add Legend for VPD Phases -->
                    <div class="legend">
                        <div class="clearfix"></div>
                    </div>
                </ha-card>
        `;
        await fetch(`/hacsfiles/ha-vpd-chart/bar.css?v=${window.vpdChartVersion}`)
            .then(response => {
                if (response.ok) {
                    this.innerHTML = this.htmlTemplate.replace('##url##', `/hacsfiles/ha-vpd-chart/bar.css?v=${window.vpdChartVersion}`);
                    this.content = this.querySelector("div.card-content");
                    return;
                }
                throw new Error('fallback to local/community');
            })
            .catch(error => {
                this.innerHTML = this.htmlTemplate.replace('##url##', `/local/community/ha-vpd-chart/bar.css?v=${window.vpdChartVersion}`);
                this.content = this.querySelector("div.card-content");
            });

    },
    async buildBarChart() {
        if (!this.content) {
            await this.initializeBar();
            if (this._hass) {
                let vpd = 0;

                this.config.sensors.forEach((sensor) => {
                    const humidity = parseFloat(this._hass.states[sensor.humidity].state);
                    const temperature = parseFloat(this._hass.states[sensor.temperature].state);
                    let leafTemperature = temperature - this.getLeafTemperatureOffset();
                    if (sensor.leaf_temperature !== undefined) {
                        if (this._hass.states[sensor.leaf_temperature] !== undefined) {
                            leafTemperature = parseFloat(this._hass.states[sensor.leaf_temperature].state);
                        }
                    }
                    if (sensor.vpd !== undefined) {
                        vpd = parseFloat(this._hass.states[sensor.vpd].state);
                    } else {
                        vpd = this.calculateVPD(leafTemperature, temperature, humidity).toFixed(2);
                    }
                    const min_vpd = this.calculateVPD(temperature - 2, temperature, this.max_humidity);
                    const max_vpd = this.calculateVPD(temperature - 2, temperature, this.min_humidity);
                    const relativeVpd = vpd - min_vpd;

                    const totalVpdRange = max_vpd - min_vpd;
                    const percentageVpd = (relativeVpd / totalVpdRange) * 100;

                    const totalHumidityRange = this.max_humidity - this.min_humidity;

                    let showHumidity = humidity;
                    let calculatedHumidity = (this.max_humidity - (percentageVpd * totalHumidityRange / 100)).toFixed(1);
                    if (sensor.show_calculated_rh === true) {
                        showHumidity = calculatedHumidity;
                    }

                    let card = this.content.querySelector(`ha-card[data-sensor="${sensor.name}"]`);
                    if (!card) {
                        card = document.createElement('ha-card');
                        card.dataset.sensor = sensor.name;
                        card.className = 'vpd-card';
                    }
                    // if sensor.name is not empty than show in the card
                    let html = `<div class="bar">`;
                    if (sensor.name !== "") {
                        html += `<span class="vpd-title">${sensor.name}</span>`;
                    }
                    html += `<span class="vpd-value">${vpd} ${this.kpa_text || ''}</span>`;
                    html += `<span class="vpd-rh">${showHumidity}%</span>`;
                    html += `<span class="vpd-temp">${temperature} ${this.unit_temperature}</span>`;
                    html += `<span style="background: ${this.getColorForVpd(vpd)}" class="vpd-state ${this.getPhaseClass(vpd)}"><span>${this.getPhaseClass(vpd)}</span></span>`;
                    html += `<span class="vpd-history" style="float:right;"><canvas></canvas></span>`;
                    html += `</div>`;
                    card.innerHTML = html;
                    this.content.appendChild(card);
                });
            }
        }
        this.updateBars();
        this.updateVPDLegend();

    },
    updateVPDLegend() {
        const legend = this.querySelector('.legend');
        this.vpd_phases.forEach((phase) => {
            const div = this.querySelector(`.vpd-${phase.className}`) || document.createElement('div');

            div.className = `vpd-state-legend vpd-${phase.className}`;

            if (!div.isConnected) {
                div.innerHTML = `
                    <span class="${phase.className}" style="background: ${phase.color};"></span>
                    <span class="vpd-title">${phase.className}</span>
                `;
                legend.appendChild(div);
            }
        });
        const clearfix = this.querySelector('.clearfix') || document.createElement('div');
        clearfix.className = 'clearfix';
        if (!clearfix.isConnected) {
            legend.appendChild(clearfix);
        }
    },
    updateBars() {
        let vpd = 0;
        this.config.sensors.forEach((sensor, index) => {
            const humidity = this.toFixedNumber(this._hass.states[sensor.humidity].state, 1);
            const temperature = this.toFixedNumber(this._hass.states[sensor.temperature].state, 1);
            let leafTemperature = this.toFixedNumber(temperature - this.getLeafTemperatureOffset());
            if (sensor.leaf_temperature !== undefined) {
                if (this._hass.states[sensor.leaf_temperature] !== undefined) {
                    leafTemperature = this.toFixedNumber(this._hass.states[sensor.leaf_temperature].state);
                }
            }
            if (sensor.vpd !== undefined) {
                vpd = this.toFixedNumber(this._hass.states[sensor.vpd].state);
            } else {
                vpd = this.calculateVPD(leafTemperature, temperature, humidity).toFixed(2);
            }

            let showHumidity = humidity;
            if (sensor.show_calculated_rh === true) {
                showHumidity = this.calculateRH(leafTemperature, temperature, vpd).toFixed(1);
            }
            let sensorName = sensor.name;
            if (sensorName === undefined) {
                sensorName = 'Sensor ' + (index + 1);
            }
            let card = this.content.querySelector(`ha-card[data-sensor="${sensor.name}"]`);
            // get the bar from card
            let bar = card.querySelector('.bar');
            bar.querySelector('.vpd-title').innerText = sensorName;
            bar.querySelector('.vpd-value').innerText = `${vpd} ${this.kpa_text}`;
            bar.querySelector('.vpd-rh').innerText = `${showHumidity}%`;
            bar.querySelector('.vpd-temp').innerText = `${temperature}${this.unit_temperature}`;
            bar.querySelector('.vpd-state span').innerText = this.getPhaseClass(vpd);
            bar.querySelector('.vpd-state').style.background = this.getColorForVpd(vpd);
            if (this.enable_ghostmap) {
                if (!this.updateRunning) {

                    this.renderMiniHistory(sensor).then((data) => {
                        this.updateRunning = true;
                        const canvas = bar.querySelector('canvas');
                        const ctx = canvas.getContext('2d');
                        ctx.reset();
                        canvas.width = 80;
                        canvas.height = 20;

                        const padding = 0;
                        const pointRadius = 1;
                        const width = canvas.width - 2 * padding;
                        const height = canvas.height - 2 * padding;
                        const sensorData = data['sensor-' + index];
                        const maxY = Math.max(...sensorData.map(data => this.toFixedNumber(data.vpd)));
                        const minY = Math.min(...sensorData.map(data => this.toFixedNumber(data.vpd)));
                        const scaleX = width / (sensorData.length - 1);
                        const scaleY = height / (maxY - minY);

                        let previousX;
                        let previousY;

                        sensorData.forEach((data, index) => {
                            const x = index * scaleX + padding;
                            const y = padding + height - (this.toFixedNumber(data.vpd) - minY) * scaleY;
                            const color = this.getColorForVpd(this.toFixedNumber(data.vpd));

                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineTo(previousX, previousY);
                            ctx.strokeStyle = color;
                            ctx.stroke();

                            ctx.beginPath();
                            ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
                            ctx.fillStyle = color;
                            ctx.fill();

                            previousX = x;
                            previousY = y;
                        });
                        setTimeout(() => {
                            this.updateRunning = false;
                        }, 15000);
                    });
                }
            }
            let vpdState = bar.querySelector('.vpd-state');
            vpdState.className = `vpd-state ${this.getPhaseClass(vpd)} tooltip`;
        });
    },
    getColorForVpd(vpd) {
        for (const phase of this.vpd_phases) {
            if (phase.upper === undefined) {
                if (vpd >= phase.lower) {
                    return phase.color;
                }
            } else if (vpd <= phase.upper && (!phase.lower || vpd >= phase.lower)) {
                return phase.color;
            }
        }
        return '';
    },
    async renderMiniHistory() {

        const data = [];
        for (const [index, sensor] of this.config.sensors.entries()) {
            data['sensor-' + index] = [];
            const temperaturesPromise = this.getEntityHistory(sensor.temperature);
            const humiditiesPromise = this.getEntityHistory(sensor.humidity);

            const [temperatures, humidities] = await Promise.all([temperaturesPromise, humiditiesPromise]);
            temperatures.forEach((temperature, tempIndex) => {
                if (humidities[tempIndex]) {
                    data['sensor-' + index].push({
                        time: temperature.last_changed,
                        vpd: this.calculateVPD(this.toFixedNumber(temperature.state) - this.getLeafTemperatureOffset(), this.toFixedNumber(temperature.state), this.toFixedNumber(humidities[tempIndex].state)).toFixed(2),
                    });
                }
            });
        }

        return data;

    }
}