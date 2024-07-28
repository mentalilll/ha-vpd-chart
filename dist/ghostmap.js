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

    async fetchDataForSensors() {
        const fragment = document.createDocumentFragment();
        const ghostmap = this.querySelector('#ghostmap');

        const sensorPromises = this.config.sensors.map(async (sensor, index) => {
            const [temperatures, humidities] = await Promise.all([
                this.getEntityHistory(sensor.temperature, this.config.ghostmap_hours),
                this.getEntityHistory(sensor.humidity, this.config.ghostmap_hours)
            ]);

            this.processSensorData(fragment, temperatures, humidities, index);
        });

        await Promise.all(sensorPromises);

        ghostmap.replaceChildren(fragment);
    },

    processSensorData(fragment, temperatures, humidities, index) {
        let opacityFade = 1;
        temperatures.forEach((temperature, tempIndex) => {
            if (humidities[tempIndex]) {
                opacityFade -= 0.05;
                const circle = this.createCircle(index, tempIndex, temperature, humidities[tempIndex].state, opacityFade);
                fragment.appendChild(circle);
            }
        });
    },

    createCircle(index, tempIndex, temperature, humidity, opacityFade) {
        const relativeHumidity = this.max_humidity - humidity;
        const totalHumidityRange = this.max_humidity - this.min_humidity;
        const percentageHumidity = (relativeHumidity / totalHumidityRange) * 100;

        const relativeTemperature = temperature.state - this.min_temperature;
        const totalTemperatureRange = this.max_temperature - this.min_temperature;
        const percentageTemperature = (relativeTemperature / totalTemperatureRange) * 100;

        const circle = document.createElement('div');
        circle.className = `highlight history-circle history-circle-${index}`;
        circle.style.left = `${percentageHumidity}%`;
        circle.style.bottom = `${100 - percentageTemperature}%`;
        circle.style.opacity = opacityFade;
        circle.style.boxShadow = `0 0 25px 5px rgba(255, 255, 255, ${opacityFade})`;

        return circle;
    }
};
