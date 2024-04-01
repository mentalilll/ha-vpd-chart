export const bar = {
    buildBarChart() {
        if (!this.content) {
            this.innerHTML = `
                <ha-card class="vpd-bar-view">
                    <style>
                         @import '/hacsfiles/ha-vpd-chart/bar.css'
                    </style>
                    <div class="vpd-card-container card-content"></div>
                    <div class="highlight mousePointer" style="opacity:0">
                        <div class="custom-tooltip"></div>
                    </div> <!-- Tooltip -->
                     <!-- add Legend for VPD Phases -->
                    <div class="legend">
                        <span class="vpd-state-legend">
                            <span class="grey-danger-zone"></span>
                            <span class="vpd-title">Danger Zone</span>
                        </span>
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

            this.config.sensors.forEach((sensor) => {
                let humidity = this._hass.states[sensor.humidity].state;
                let temperature = this._hass.states[sensor.temperature].state;
                let leafTemperature = temperature - (sensor.leaf_temperature_offset || 2);
                if (sensor.leaf_temperature !== undefined) {
                    leafTemperature = this._hass.states[sensor.leaf_temperature].state;
                }
                let vpd;
                if (sensor.vpd !== undefined) {
                    vpd = this._hass.states[sensor.vpd].state;
                } else {
                    vpd = this.calculateVPD(parseFloat(leafTemperature), parseFloat(temperature), parseFloat(humidity)).toFixed(2);
                }
                // check if already exist
                let card = this.content.querySelector(`ha-card[data-sensor="${sensor.name}"]`);
                if (!card) {
                    card = document.createElement('ha-card');
                    card.dataset.sensor = sensor.name;
                    card.className = 'vpd-card';
                }
                card.innerHTML = `
                    <div class="bar" >
                        <span class="vpd-title">${sensor.name}</span>
                        <span class="vpd-value">${vpd} kPa</span>
                        <span class="vpd-rh">${this.rh_text}: ${humidity}%</span>
                        <span class="vpd-temp">${this.air_text}: ${temperature}°C</span>
                        <span class="vpd-state ${this.getPhaseClass(vpd)} tooltip"></span>
                        <span class="vpd-history" style="float:right;"><canvas></canvas></span>
                    </div>
                `;
                this.content.appendChild(card);
            });
        }

        this.updateBars();

    },
    updateBars() {
        this.config.sensors.forEach((sensor, index) => {
            let humidity = this._hass.states[sensor.humidity].state;
            let temperature = this._hass.states[sensor.temperature].state;
            let leafTemperature = temperature - (sensor.leaf_temperature_offset || 2);
            if (sensor.leaf_temperature !== undefined) {
                leafTemperature = this._hass.states[sensor.leaf_temperature].state;
            }
            let vpd;
            if (sensor.vpd !== undefined) {
                vpd = this._hass.states[sensor.vpd].state;
            } else {
                vpd = this.calculateVPD(parseFloat(leafTemperature), parseFloat(temperature), parseFloat(humidity)).toFixed(2);
            }
            let card = this.content.querySelector(`ha-card[data-sensor="${sensor.name}"]`);
            // get the bar from card
            let bar = card.querySelector('.bar');
            bar.querySelector('.vpd-title').innerText = sensor.name;
            bar.querySelector('.vpd-value').innerText = `${vpd} kPa`;
            bar.querySelector('.vpd-rh').innerText = `${this.rh_text}: ${humidity}%`;
            bar.querySelector('.vpd-temp').innerText = `${this.air_text}: ${temperature}°C`;

            if (this.enable_ghostmap) {
                if(!this.updateRunning) {

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
                        const maxY = Math.max(...sensorData.map(data => parseFloat(data.vpd)));
                        const minY = Math.min(...sensorData.map(data => parseFloat(data.vpd)));
                        const scaleX = width / (sensorData.length - 1);
                        const scaleY = height / (maxY - minY);

                        var previousX;
                        var previousY;

                        sensorData.forEach((data, index) => {
                            const x = index * scaleX + padding;
                            const y = padding + height - (parseFloat(data.vpd) - minY) * scaleY;
                            var color = this.getColorForVpd(parseFloat(data.vpd));

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
        const colorMap = {
            'gray-danger-zone': '#999999',
            'under-transpiration': '#1a6c9c',
            'early-veg': '#22ab9c',
            'late-veg': '#9cc55b',
            'mid-late-flower': '#e7c12b',
            'danger-zone': '#ce4234',
        };


        return colorMap[this.getPhaseClass(vpd)];
    },
    async renderMiniHistory(sensor) {

            const data = [];
            for (const [index, sensor] of this.config.sensors.entries()) {
                data['sensor-'+index] = [];
                const temperaturesPromise = this.getEntityHistory(sensor.temperature);
                const humiditiesPromise = this.getEntityHistory(sensor.humidity);

                const [temperatures, humidities] = await Promise.all([temperaturesPromise, humiditiesPromise]);
                temperatures.forEach((temperature, tempIndex) => {
                    data['sensor-'+index].push({
                        time: temperature.last_changed,
                        vpd: this.calculateVPD(parseFloat(temperature.state) - 2, parseFloat(temperature.state), parseFloat(humidities[tempIndex].state)).toFixed(2),
                    });
                });
            }

            return data;

    }
}