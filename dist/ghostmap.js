export const ghostmap = {
    getRandomEntries(array, num) {
        const length = array.length;
        const step = length / num;
        const result = [];
        for (let i = 0; i < num; i++) {
            result.push(array[Math.floor(i * step)]);
        }
        return result;
    },

    async getEntityHistory(entityId) {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
        const isoStartTime = startTime.toISOString();
        const isoEndTime = endTime.toISOString();

        try {
            const history = await this._hass.callApi('GET', `history/period/${isoStartTime}?filter_entity_id=${entityId}&end_time=${isoEndTime}`);
            return this.getRandomEntries(history[0], 20);
        } catch (error) {
            return [];
        }
    },
    async fetchDataForSensors() {
        const fragment = document.createDocumentFragment();
        const ghostmap = this.querySelector('#ghostmap');

        for (const [index, sensor] of this.config.sensors.entries()) {
            const temperaturesPromise = this.getEntityHistory(sensor.temperature);
            const humiditiesPromise = this.getEntityHistory(sensor.humidity);

            const [temperatures, humidities] = await Promise.all([temperaturesPromise, humiditiesPromise]);
            let opacityFade = 1;
            temperatures.forEach((temperature, tempIndex) => {
                opacityFade -= 0.05;
                const relativeHumidity = this.max_humidity - humidities[tempIndex].state;
                const totalHumidityRange = this.max_humidity - this.min_humidity;
                const percentageHumidity = (relativeHumidity / totalHumidityRange) * 100;
                const relativeTemperature = temperature.state - this.min_temperature;
                const totalTemperatureRange = this.max_temperature - this.min_temperature;
                const percentageTemperature = (relativeTemperature / totalTemperatureRange) * 100;

                let circle = this.querySelectorAll('history-circle-' + tempIndex)[0] || document.createElement('div');
                circle.className = 'highlight history-circle history-circle-' + index;
                circle.style.left = `${percentageHumidity}%`;
                circle.style.bottom = `${100 - percentageTemperature}%`;
                circle.style.opacity = opacityFade;
                circle.style.boxShadow = `0 0 25px 5px rgba(255, 255, 255, ${opacityFade})`;

                fragment.appendChild(circle);
            });
        }
        ghostmap.replaceChildren(fragment);
    }

}