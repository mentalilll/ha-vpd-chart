export const ghostmap = {
    filterEntriesByHour(entries) {
        const filteredEntries = [];
        const seenHours = new Set();

        entries.forEach(entry => {
            const date = new Date(entry.last_changed);
            const hourKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;

            if (!seenHours.has(hourKey)) {
                seenHours.add(hourKey);
                filteredEntries.push(entry);
            }
        });

        return filteredEntries;
    },

    async fetchDataForRooms() {
        const fragment = document.createDocumentFragment();
        const ghostmap = this.querySelector('#ghostmap');

        const sensorPromises = this.config.rooms.map(async (room, index) => {
            if (this._hass.states[room.humidity] && this._hass.states[room.temperature]) {
                const [temperatures, humidities] = await Promise.all([
                    this.getEntityHistory(room.temperature, this.config.ghostmap_hours),
                    this.getEntityHistory(room.humidity, this.config.ghostmap_hours)
                ]);

                this.processSensorData(fragment, temperatures, humidities, index);
            }
        });

        await Promise.all(sensorPromises);

        ghostmap.replaceChildren(fragment);
    },

    processSensorData(fragment, temperatures, humidities, index) {
        let opacityFade = 1;
        let fadeStep = (1 / (temperatures.length - 1)).toFixed(2);
        temperatures.forEach((temperature, tempIndex) => {
            if (humidities[tempIndex]) {
                opacityFade -= fadeStep;
                let humidity = (humidities[tempIndex].state);
                const circle = this.createCircle(index, tempIndex, temperature, humidity, opacityFade);
                fragment.appendChild(circle);
            }
        });
    },

    createCircle(index, tempIndex, temperature, humidity, opacityFade) {
        const relativeHumidity = this.max_humidity - (humidity * this.zoomLevel);
        const totalHumidityRange = this.max_humidity - this.min_humidity;
        const percentageHumidity = (relativeHumidity / totalHumidityRange) * 100;

        const relativeTemperature = (temperature.state * this.zoomLevel) - this.min_temperature;
        const totalTemperatureRange = this.max_temperature - this.min_temperature;
        const percentageTemperature = (relativeTemperature / totalTemperatureRange) * 100;

        const circle = document.createElement('div');
        circle.className = `highlight history-circle history-circle-${index}`;
        circle.style.left = `${percentageHumidity}%`;
        circle.style.bottom = `${100 - percentageTemperature}%`;
        circle.style.opacity = opacityFade;

        circle.dataset.humidity = humidity;
        circle.dataset.temperature = temperature.state;

        return circle;
    }
};
