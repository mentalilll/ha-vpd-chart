export const chart = {
    initializeChart() {
        this.zoomLevel = 1;
        this.minZoom = 1;
        this.maxZoom = 2;
        this.innerHTML = `
        <ha-card class="vpd-chart-view">
            <style>
                @import '/hacsfiles/ha-vpd-chart/chart.css?v=${window.vpdChartVersion}'
            </style>
            <div id="vpd-card-container" class="vpd-card-container"></div>
            <div id="ghostmap"></div>
            <div id="sensors"></div>
            <div class="mouse-custom-tooltip" style="opacity: 0;"></div>
            <div id="mouse-tooltip">
                <div class="horizontal-line mouse-horizontal-line" style="opacity: 0;"></div>
                <div class="vertical-line mouse-vertical-line" style="opacity: 0;"></div>
            </div>
        </ha-card>
    `;
        this.content = this.querySelector("div.vpd-card-container");
        this.sensordom = this.querySelector("div#sensors");
        this.ghostmapDom = this.querySelector("div#ghostmap");
        this.mouseTooltip = this.querySelector("div#mouse-tooltip");
    },
    buildChart() {
        if (!this.content) {
            this.initializeChart.call(this);
            const table = this.buildTable();
            if (!table.isConnected) {
                this.content.appendChild(table);
                this.setupEventListeners.call(this);
            }
            this.updateGhostMapPeriodically.call(this);
        } else {
            this.refreshTable.call(this);
        }

        if (this.enable_axes) {
            this.addGridLines();
        } else {
            this.removeGridLines();
        }

        if (this.min_height > 0) {
            this.content.style.minHeight = `${this.min_height}px`;
            this.querySelector("div.vpd-container").style.minHeight = `${this.min_height}px`;
        }

        this.buildTooltip();
    },
    handleZoom(event) {
        event.preventDefault();
        const zoomDirection = event.deltaY > 0 ? -0.1 : 0.1;
        const rect = this.content.getBoundingClientRect();
        const offsetX = (event.clientX - rect.left) / this.zoomLevel;
        const offsetY = (event.clientY - rect.top) / this.zoomLevel;
        let newZoomLevel = this.zoomLevel + zoomDirection;
        newZoomLevel = Math.min(Math.max(newZoomLevel, this.minZoom), this.maxZoom);
        newZoomLevel = Math.round(newZoomLevel * 100) / 100;  // Rundung auf 2 Dezimalstellen
        if (newZoomLevel !== this.zoomLevel) {
            this.zoomLevel = newZoomLevel;
            if (zoomDirection > 0) {
                this.content.style.transformOrigin = `${offsetX}px ${offsetY}px`;
                this.sensordom.style.transformOrigin = `${offsetX}px ${offsetY}px`;
                this.ghostmapDom.style.transformOrigin = `${offsetX}px ${offsetY}px`;
                this.mouseTooltip.style.transformOrigin = `${offsetX}px ${offsetY}px`;
            }

            this.content.style.transform = `scale(${this.zoomLevel})`;
            this.sensordom.style.transform = `scale(${this.zoomLevel})`;
            this.ghostmapDom.style.transform = `scale(${this.zoomLevel})`;
            this.mouseTooltip.style.transform = `scale(${this.zoomLevel})`;
        }
    },

    setupEventListeners() {
        this.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.addEventListener('mousemove', this.handleMouseMove.bind(this));
        if (this.enable_zoom) {
            this.addEventListener('wheel', this.handleZoom.bind(this));
            this.addEventListener('mousedown', this.handleMouseDown.bind(this));
            this.addEventListener('mouseup', this.handleMouseUp.bind(this));
        }
    },
    updateGhostMapPeriodically() {
        if (this.enable_ghostmap) {
            this.updateGhostMap();
            setInterval(() => this.updateGhostMap(), 3600000); // Update every hour
        }
    },

    handleMouseDown() {
        this.isPanning = true;
    },
    handleMouseUp() {
        this.isPanning = false;
    },
    handleMouseMove(event) {
        event.preventDefault();
        const rect = this.content.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        const temperatureRange = this.max_temperature - this.min_temperature;
        const humidityRange = this.max_humidity - this.min_humidity;

        const temperature = this.min_temperature + (temperatureRange * yPercent / 100);
        const humidity = this.max_humidity - (humidityRange * xPercent / 100);
        const leafTemperature = temperature - (this.config.leaf_temperature_offset || 2);

        const vpd = this.calculateVPD(leafTemperature, temperature, humidity);

        this.buildMouseTooltip(event, humidity, temperature, vpd);
        if (!this.isPanning) return;

        const offsetX = (event.clientX - rect.left) / this.zoomLevel;
        const offsetY = (event.clientY - rect.top) / this.zoomLevel;
        this.content.style.transformOrigin = `${offsetX}px ${offsetY}px`;
        this.sensordom.style.transformOrigin = `${offsetX}px ${offsetY}px`;
        this.ghostmapDom.style.transformOrigin = `${offsetX}px ${offsetY}px`;
        this.mouseTooltip.style.transformOrigin = `${offsetX}px ${offsetY}px`;
    },
    buildTable() {
        const container = document.createElement('div');
        container.className = 'vpd-container';
        let vpdMatrix = this.createVPDMatrix(this.min_temperature, this.max_temperature, this.steps_temperature, this.max_humidity, this.min_humidity, this.steps_humidity);
        const maxHumidity = this.max_humidity;
        const stepsHumidity = this.steps_humidity;

        const fragment = document.createDocumentFragment();
        vpdMatrix.forEach(row => {
            const rowElement = document.createElement('div');
            rowElement.className = 'vpd-row';

            let segments = [];
            let currentClass = null;
            let startIndex = 0;
            row.forEach((cell, index) => {
                if (currentClass === null) {
                    currentClass = cell.className;
                    startIndex = index;
                } else if (cell.className !== currentClass) {
                    const segmentWidth = (index - startIndex) * stepsHumidity * 100 / maxHumidity;
                    let customColor = this.getColorByClassName(currentClass);
                    segments.push({className: currentClass, width: segmentWidth, color: customColor});

                    currentClass = cell.className;
                    startIndex = index;
                }
            });
            if (startIndex < row.length) {
                const segmentWidth = (row.length - startIndex) * stepsHumidity * 100 / maxHumidity;
                let customColor = this.getColorByClassName(currentClass);
                segments.push({className: currentClass, width: segmentWidth, color: customColor});
            }

            const totalWidth = segments.reduce((sum, segment) => sum + segment.width, 0);
            const widthAdjustmentFactor = 100 / totalWidth;

            let accumulatedWidth = 0;
            segments.forEach((segment, index) => {
                let adjustedWidth;
                if (index === segments.length - 1) {
                    adjustedWidth = (100 - accumulatedWidth).toFixed(2); // Ensure the last segment fills the remaining width
                } else {
                    adjustedWidth = (segment.width * widthAdjustmentFactor).toFixed(2);
                    accumulatedWidth += parseFloat(adjustedWidth);
                }
                const div = document.createElement('div');
                div.className = `cell ${segment.className}`;
                div.style.backgroundColor = segment.color;
                div.style.width = `${adjustedWidth}%`;

                rowElement.appendChild(div);
            });

            fragment.appendChild(rowElement);
        });

        container.appendChild(fragment);

        return container;
    }, refreshTable() {
        if (this.shouldUpdate()) {
            const table = this.buildTable();
            this.content.replaceChildren(table);
        }
    }, addGridLines() {
        const grid = this.querySelector('.vpd-grid') || document.createElement('div');
        grid.className = 'vpd-grid';

        if (!grid.isConnected) {
            this.addHorizontalGridLines(grid);
            this.addVerticalGridLines(grid);
            this.content.appendChild(grid);
        }
    }, removeGridLines() {
        const grid = this.querySelector('.vpd-grid');
        if (grid) {
            grid.remove();
        }
    }, addHorizontalGridLines(grid) {
        const temperatureSteps = 7;
        for (let i = 0; i <= temperatureSteps; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line horizontal';
            line.style.top = `${(i / temperatureSteps) * 100}%`;

            const label = document.createElement('div');
            label.className = 'temperature-axis-label';
            const currentValue = this.min_temperature + (i * (this.max_temperature - this.min_temperature) / temperatureSteps);
            label.innerHTML = `${currentValue.toFixed(0)}${this.unit_temperature}`;
            label.style.top = `${(i / temperatureSteps) * 100}%`;

            grid.appendChild(line);
            if (label.style.top !== '100%' && label.style.top !== '0%') {
                grid.appendChild(label);
            }
        }
    },

    addVerticalGridLines(grid) {
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
            if (label.style.left !== '100%' && label.style.left !== '0%') {
                grid.appendChild(label);
            }
        }
    },

    updateGhostMap() {
        this.fetchDataForSensors();
    },


    handleMouseLeave() {
        const banner = this.querySelector('.mouse-custom-tooltip');
        const verticalLine = this.querySelector('.mouse-vertical-line');
        const horizontalLine = this.querySelector('.mouse-horizontal-line');
        const fadeOut = setInterval(() => {
            if (!banner.style.opacity) {
                banner.style.opacity = 1;
                verticalLine.style.opacity = 1;
                horizontalLine.style.opacity = 1;
            }
            if (banner.style.opacity > 0) {
                banner.style.opacity -= 0.1;
                verticalLine.style.opacity -= 0.1;
                horizontalLine.style.opacity -= 0.1;
            } else {
                clearInterval(fadeOut);
            }
        }, 100);
    },

    buildTooltip() {
        const sensors = this.querySelector('#sensors');
        let vpd = 0;

        this.config.sensors.forEach((sensor, index) => {
            if (this._hass.states[sensor.humidity] && this._hass.states[sensor.temperature]) {
                const humidity = parseFloat(this._hass.states[sensor.humidity].state);
                const temperature = parseFloat(this._hass.states[sensor.temperature].state);
                let leafTemperature = temperature - (this.config.leaf_temperature_offset || 2);
                if (sensor.leaf_temperature !== undefined) {
                    leafTemperature = parseFloat(this._hass.states[sensor.leaf_temperature].state);
                }
                if (sensor.vpd !== undefined) {
                    vpd = parseFloat(this._hass.states[sensor.vpd].state);
                } else {
                    vpd = this.calculateVPD(leafTemperature, temperature, humidity).toFixed(2);
                }
                const min_vpd = this.calculateVPD(temperature - (this.config.leaf_temperature_offset || 2), temperature, this.max_humidity);
                const max_vpd = this.calculateVPD(temperature - (this.config.leaf_temperature_offset || 2), temperature, this.min_humidity);
                const relativeVpd = vpd - min_vpd;
                const totalVpdRange = max_vpd - min_vpd;
                const percentageVpd = (relativeVpd / totalVpdRange) * 100;

                const relativeTemperature = temperature - this.min_temperature;
                const totalTemperatureRange = this.max_temperature - this.min_temperature;
                const percentageTemperature = (relativeTemperature / totalTemperatureRange) * 100;

                const totalHumidityRange = this.max_humidity - this.min_humidity;

                const currentHumidity = (this.max_humidity - (percentageVpd * totalHumidityRange / 100)).toFixed(1);
                const pointerElements = this.createPointer(index, percentageVpd, percentageTemperature, sensor.name, vpd, currentHumidity, temperature);

                // Check and append only if elements are Nodes
                if (pointerElements.pointer instanceof Node) {
                    sensors.appendChild(pointerElements.pointer);
                }
                if (pointerElements.horizontalLine instanceof Node) {
                    sensors.appendChild(pointerElements.horizontalLine);
                }
                if (pointerElements.verticalLine instanceof Node) {
                    sensors.appendChild(pointerElements.verticalLine);
                }
                if (pointerElements.tooltip instanceof Node) {
                    sensors.appendChild(pointerElements.tooltip);
                }
            }
        });
    },
    createPointer(index, percentageHumidity, percentageTemperature, sensorName, vpd, humidity, temperature) {
        const pointer = this.querySelector(`.sensor-pointer[data-index="${index}"]`) || document.createElement('div');
        pointer.setAttribute('data-index', index.toString());
        pointer.style.left = `${percentageHumidity}%`;
        pointer.style.bottom = `${100 - percentageTemperature}%`;
        pointer.className = this.enable_triangle ? 'highlight sensor-pointer sensor-triangle' : 'highlight sensor-pointer sensor-circle';
        pointer.classList.add(`sensor-pointer-${index}`);

        const horizontalLine = this.querySelector(`.horizontal-line[data-index="${index}"]`) || document.createElement('div');
        horizontalLine.className = `horizontal-line horizontal-line-${index}`;
        horizontalLine.setAttribute('data-index', index.toString());
        horizontalLine.style.top = `calc(${percentageTemperature}%)`;

        const verticalLine = this.querySelector(`.vertical-line[data-index="${index}"]`) || document.createElement('div');
        verticalLine.className = `vertical-line vertical-line-${index}`;
        verticalLine.setAttribute('data-index', index.toString());
        verticalLine.style.left = `calc(${percentageHumidity}% - 0.5px)`;

        let tooltip = null;
        if (this.enable_tooltip) {
            tooltip = this.querySelector(`.custom-tooltip[data-index="${index}"]`) || document.createElement('div');
            tooltip.className = `custom-tooltip custom-tooltip-${index}`;
            tooltip.setAttribute('data-index', index.toString());
            tooltip.innerHTML = `<span><strong>${sensorName}</strong></span> <span>${this.kpa_text ? this.kpa_text + ':' : ''} ${vpd}</span><span>${this.rh_text ? this.rh_text + ':' : ''} ${humidity}%</span><span>${this.air_text ? this.air_text + ':' : ''} ${temperature}${this.unit_temperature}</span>`;
            tooltip.style.bottom = `${100 - percentageTemperature}%`;
            tooltip.style.left = `${percentageHumidity}%`;
            if ((tooltip.offsetLeft + (tooltip.offsetWidth / 2)) > this.content.offsetWidth) {
                const containerWidth = this.content.offsetWidth;
                const overflowWidth = (tooltip.offsetLeft + (tooltip.offsetWidth / 2)) - containerWidth;
                tooltip.style.left = `calc(${percentageHumidity}% - ${overflowWidth}px)`;
            }
        }

        if (!pointer.isConnected) {
            pointer.addEventListener('mouseover', this.showSensorDetails.bind(this, index));
            pointer.addEventListener('mouseleave', this.hideSensorDetails.bind(this, index));
            pointer.addEventListener('click', this.toggleSensorDetails.bind(this, index));
        }
        return {pointer, horizontalLine, verticalLine, tooltip};
    },
    toggleSensorDetails(index) {
        this.clickedTooltip = !this.clickedTooltip;
        if (this.clickedTooltip) {
            this.hideSensorDetails(index);
        } else {
            this.showSensorDetails(index);
        }
    },
    showSensorDetails(index) {
        this.querySelectorAll(`.history-circle-${index}`).forEach(circle => circle.style.display = 'block');
        this.querySelectorAll('.custom-tooltip').forEach(tooltip => {
            tooltip.style.display = tooltip.classList.contains(`custom-tooltip-${index}`) ? 'block' : 'none';
            if (tooltip.classList.contains(`custom-tooltip-${index}`)) {
                tooltip.style.opacity = '0.45';
            }
        });
        this.querySelectorAll('.horizontal-line, .vertical-line, .sensor-pointer').forEach(el => {
            if (!el.classList.contains(`horizontal-line-${index}`) && !el.classList.contains(`vertical-line-${index}`) && !el.classList.contains(`sensor-pointer-${index}`)) {
                el.style.display = 'none';
            } else {
                el.style.display = 'block';
            }
        });
    },
    hideSensorDetails(index) {
        if (!this.clickedTooltip) {
            this.querySelectorAll(`.history-circle-${index}`).forEach(circle => circle.style.display = 'none');
            this.querySelectorAll('.custom-tooltip, .horizontal-line, .vertical-line, .sensor-pointer').forEach(el => el.style.display = 'block');
            this.querySelectorAll('.custom-tooltip').forEach(tooltip => tooltip.style.opacity = '1');
        }
    },
    buildMouseTooltip(target, targetHumidity = null, targetTemperature = null, targetVpd = null) {
        const humidity = targetHumidity?.toFixed(1) || parseFloat(target.getAttribute('data-rh')).toFixed(1);
        const temperature = targetTemperature?.toFixed(1) || parseFloat(target.getAttribute('data-air')).toFixed(1);
        const vpd = targetVpd?.toFixed(2) || parseFloat(target.getAttribute('data-vpd')).toFixed(2);

        const tooltip = this.querySelector('.mouse-custom-tooltip');
        tooltip.innerHTML = `${this.kpa_text ? this.kpa_text + ':' : ''} ${vpd} | ${this.rh_text ? this.rh_text + ':' : ''} ${humidity}% | ${this.air_text ? this.air_text + ':' : ''} ${temperature}${this.unit_temperature} | ${this.getPhaseClass(vpd)}`;
        tooltip.style.opacity = '1';
        if (this.enable_crosshair) {
            let mouseHorizontalLine = this.querySelector(`.mouse-horizontal-line`) || document.createElement('div');
            mouseHorizontalLine.className = `horizontal-line mouse-horizontal-line`;

            let mouseVerticalLine = this.querySelector(`.mouse-vertical-line`) || document.createElement('div');
            mouseVerticalLine.className = `vertical-line mouse-vertical-line`;

            let container = this.querySelector('.vpd-card-container');

            const {clientX, clientY} = target;
            // offset from vpd card container
            const rect = container.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            // calculate x and y with this.zoomlevel
            // relation

            mouseHorizontalLine.style.top = `${y / this.zoomLevel}px`;
            mouseVerticalLine.style.left = `${x / this.zoomLevel}px`;
            mouseVerticalLine.style.opacity = `1`;
            mouseHorizontalLine.style.opacity = `1`;

        }
    },
};
