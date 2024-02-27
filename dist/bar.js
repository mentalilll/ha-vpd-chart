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
                    </div>
                `;
                this.content.appendChild(card);
            });
        }
        this.updateBars();

    },
    updateBars() {
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
            let card = this.content.querySelector(`ha-card[data-sensor="${sensor.name}"]`);
            // get the bar from card
            let bar = card.querySelector('.bar');
            bar.querySelector('.vpd-title').innerText = sensor.name;
            bar.querySelector('.vpd-value').innerText = `${vpd} kPa`;
            bar.querySelector('.vpd-rh').innerText = `${this.rh_text}: ${humidity}%`;
            bar.querySelector('.vpd-temp').innerText = `${this.air_text}: ${temperature}°C`;

            let vpdState = bar.querySelector('.vpd-state');
            vpdState.className = `vpd-state ${this.getPhaseClass(vpd)} tooltip`;
        });
    }
}