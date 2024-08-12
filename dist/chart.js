export const chart = {
    initializeChart() {
        this.zoomLevel = 1;
        this.minZoom = 1;
        this.maxZoom = 3;
        this.innerHTML = `
        <ha-card>
            <div class="vpd-chart-view">
                <style>
                    @import '/local/community/ha-vpd-chart/chart.css?v=${window.vpdChartVersion}'
                </style>
                <div id="vpd-card-container" class="vpd-card-container"></div>
                <div id="ghostmap"></div>
                <div id="sensors"></div>
                <div class="mouse-custom-tooltip" style="opacity: 0;"></div>
                <div id="mouse-tooltip">
                    <div class="horizontal-line mouse-horizontal-line" style="opacity: 0;"></div>
                    <div class="vertical-line mouse-vertical-line" style="opacity: 0;"></div>
                </div>
                <div class="vpd-legend"></div>
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
            // custom-tooltip fontsize
            this.querySelectorAll('.custom-tooltip').forEach(tooltip => {
                tooltip.style.fontSize = `${12 / this.zoomLevel}px`;
                tooltip.style.padding = `${7 / this.zoomLevel}px`;
            });
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
        const leafTemperature = temperature - this.getLeafTemperatureOffset();

        const vpd = this.calculateVPD(leafTemperature, temperature, humidity);

        this.buildMouseTooltip(event, humidity, temperature, vpd);
        if (!this.isPanning) return;
        // pan the chart with mouse drag
        this.content.style.cursor = 'grabbing';
        let offsetX = event.movementX / this.zoomLevel;
        let offsetY = event.movementY / this.zoomLevel;
        this.content.scrollLeft -= offsetX;
        this.content.scrollTop -= offsetY;


        /*
        const offsetX = (event.clientX - rect.left) / this.zoomLevel;
        const offsetY = (event.clientY - rect.top) / this.zoomLevel;
        this.content.style.transformOrigin = `${offsetX}px ${offsetY}px`;
        this.sensordom.style.transformOrigin = `${offsetX}px ${offsetY}px`;
        this.ghostmapDom.style.transformOrigin = `${offsetX}px ${offsetY}px`;
        this.mouseTooltip.style.transformOrigin = `${offsetX}px ${offsetY}px`;*/
    },
    positionTooltip(tooltip, percentageHumidity) {
        const containerWidth = this.content.offsetWidth;
        const tooltipCenter = tooltip.offsetLeft + (tooltip.offsetWidth / 2);

        if (tooltipCenter > containerWidth) {
            const overflowWidth = tooltipCenter - containerWidth + 5;
            tooltip.style.left = `calc(${percentageHumidity}% - ${overflowWidth}px)`;
        } else if ((tooltip.offsetLeft - (tooltip.offsetWidth / 2)) < 0) {
            const overflowWidth = (tooltip.offsetWidth / 2) - tooltip.offsetLeft + 5;
            tooltip.style.left = `calc(${percentageHumidity}% + ${overflowWidth}px)`;
        } else {
            tooltip.style.left = `${percentageHumidity}%`;
        }
        tooltip.style.visibility = 'visible';
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
        let sensors = this.querySelector('#sensors');
        let vpd = 0;
        this.config.sensors.forEach((sensor, index) => {
            if (this._hass.states[sensor.humidity] && this._hass.states[sensor.temperature]) {
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

                const relativeTemperature = temperature - this.min_temperature;
                const totalTemperatureRange = this.max_temperature - this.min_temperature;
                const percentageTemperature = (relativeTemperature / totalTemperatureRange) * 100;
                const relativeHumidity = this.max_humidity - humidity;
                const totalHumidityRange = this.max_humidity - this.min_humidity;
                let percentageHumidity = ((relativeHumidity / totalHumidityRange) * 100).toFixed(1);

                let showHumidity = humidity;
                let calculatedHumidity = (this.max_humidity - (percentageVpd * totalHumidityRange / 100)).toFixed(1);
                if (sensor.show_calculated_rh === true) {
                    showHumidity = calculatedHumidity;
                    percentageHumidity = percentageVpd;
                }


                if (sensors.querySelector(`.sensor_${index}`) === null) {
                    let name = sensor.name;
                    if (name === undefined) {
                        name = `<svg fill="#ffffff" width="13" height="13" viewBox="-1.7 0 20.4 20.4" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="0.32639999999999997"></g><g id="SVGRepo_iconCarrier"><path d="M16.476 10.283A7.917 7.917 0 1 1 8.56 2.366a7.916 7.916 0 0 1 7.916 7.917zm-5.034-2.687a2.845 2.845 0 0 0-.223-1.13A2.877 2.877 0 0 0 9.692 4.92a2.747 2.747 0 0 0-1.116-.227 2.79 2.79 0 0 0-1.129.227 2.903 2.903 0 0 0-1.543 1.546 2.803 2.803 0 0 0-.227 1.128v.02a.792.792 0 0 0 1.583 0v-.02a1.23 1.23 0 0 1 .099-.503 1.32 1.32 0 0 1 .715-.717 1.223 1.223 0 0 1 .502-.098 1.18 1.18 0 0 1 .485.096 1.294 1.294 0 0 1 .418.283 1.307 1.307 0 0 1 .281.427 1.273 1.273 0 0 1 .099.513 1.706 1.706 0 0 1-.05.45 1.546 1.546 0 0 1-.132.335 2.11 2.11 0 0 1-.219.318c-.126.15-.25.293-.365.424-.135.142-.26.28-.374.412a4.113 4.113 0 0 0-.451.639 3.525 3.525 0 0 0-.342.842 3.904 3.904 0 0 0-.12.995v.035a.792.792 0 0 0 1.583 0v-.035a2.324 2.324 0 0 1 .068-.59 1.944 1.944 0 0 1 .187-.463 2.49 2.49 0 0 1 .276-.39c.098-.115.209-.237.329-.363l.018-.02c.129-.144.264-.301.403-.466a3.712 3.712 0 0 0 .384-.556 3.083 3.083 0 0 0 .28-.692 3.275 3.275 0 0 0 .108-.875zM9.58 14.895a.982.982 0 0 0-.294-.707 1.059 1.059 0 0 0-.32-.212l-.004-.001a.968.968 0 0 0-.382-.079 1.017 1.017 0 0 0-.397.08 1.053 1.053 0 0 0-.326.212 1.002 1.002 0 0 0-.215 1.098 1.028 1.028 0 0 0 .216.32 1.027 1.027 0 0 0 .722.295.968.968 0 0 0 .382-.078l.005-.002a1.01 1.01 0 0 0 .534-.534.98.98 0 0 0 .08-.392z"></path></g></svg>`;
                    }
                    let htmlTemplate = `
                    <div class="sensor_${index}">
                        <div class="sensor-pointer-${index} sensor-pointer sensor-circle" data-index="${index}"></div>
                        <div class="horizontal-line horizontal-line-${index}" data-index="${index}"></div>
                        <div class="vertical-line vertical-line-${index}" data-index="${index}"></div>
                        <div class="custom-tooltip custom-tooltip-${index}" data-index="${index}">
                            <span class="sensor-name">${name}</span>
                            <div class="tooltipAdditionalInformations">
                                <span class="kpaText_${index}" class="kpaText_${index}">${this.kpa_text ? this.kpa_text + ': ' : ''}${vpd}</span>
                                <span class="sensorHumidity_${index}" class="sensorHumidity_${index}">${this.rh_text ? this.rh_text + ': ' : ''}${showHumidity}</span>
                                <span class="sensorAir_${index}" class="sensorAir_${index}">${this.air_text ? this.air_text + ': ' : ''}${temperature}</span>
                                <span class="sensorVPD_${index}" class="sensorVPD_${index}">${this.getPhaseClass(vpd)}</span>
                            </div>
                        </div>
                    </div>
                `;
                    sensors.innerHTML += htmlTemplate;
                } else {
                    this.updatePointer(index, percentageHumidity, percentageTemperature, sensor.name, vpd, showHumidity, temperature);
                }
            }
        });
    },
    updatePointer(index, percentageHumidity, percentageTemperature, sensorName = "", vpd, humidity, temperature) {
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

        if (this.enable_legend) {
            const legend = this.querySelector('.vpd-legend');
            if (!legend) {
                return;
            }
            let legendElement = legend.querySelector(`.sensor-legend-${index}`) || document.createElement('div');
            legendElement.className = `sensor-legend sensor-legend-${index}`;
            legendElement.innerHTML = sensorName || `Sensor ${index + 1}`;
            if (!legendElement.isConnected) {
                legendElement.addEventListener('mouseover', (event) => {
                    event.stopImmediatePropagation();
                    this.showSensorDetails(index);
                });
                legendElement.addEventListener('mouseleave', (event) => {
                    event.stopImmediatePropagation();
                    this.hideSensorDetails(index);
                });
                legendElement.addEventListener('click', (event) => {
                    event.stopImmediatePropagation();
                    this.toggleSensorDetails(index);
                });
                legend.appendChild(legendElement);
            }
        }

        let tooltip = null;

        if (this.enable_tooltip) {
            tooltip = this.querySelector(`.custom-tooltip[data-index="${index}"]`) || document.createElement('div');
            tooltip.style.bottom = `${100 - percentageTemperature}%`;
            tooltip.style.left = `${percentageHumidity}%`;
            this.positionTooltip(tooltip, percentageHumidity);

            tooltip.setAttribute('data-index', index.toString());

            if (this.enable_show_always_informations) {
                tooltip.querySelector('.tooltipAdditionalInformations').style.display = 'inline';
            }
            let kpaText = tooltip.querySelector('.kpaText_' + index);
            let rhText = tooltip.querySelector('.sensorHumidity_' + index);
            let temperatureText = tooltip.querySelector('.sensorAir_' + index);
            let phaseClass = tooltip.querySelector('.sensorVPD_' + index);

            kpaText.innerHTML = `${this.kpa_text ? this.kpa_text + ': ' : ''}${vpd}`;
            rhText.innerHTML = `${this.rh_text ? this.rh_text + ': ' : ''}${humidity}%`;
            temperatureText.innerHTML = `${this.air_text ? this.air_text + ': ' : ''}${temperature}${this.unit_temperature}`;
            phaseClass.innerHTML = `${this.getPhaseClass(vpd)}`;

            tooltip.addEventListener('mouseover', (event) => {
                event.stopImmediatePropagation();
                this.showSensorDetails(index);
            });
            pointer.addEventListener('mouseover', (event) => {
                event.stopImmediatePropagation();
                this.showSensorDetails(index);
            });

            tooltip.addEventListener('mouseleave', (event) => {
                event.stopImmediatePropagation();
                this.hideSensorDetails(index);
            });
            pointer.addEventListener('mouseleave', (event) => {
                event.stopImmediatePropagation();
                this.hideSensorDetails(index);
            });


            if (this.enable_ghostclick) {
                tooltip.addEventListener('click', (event) => {
                    event.stopImmediatePropagation();
                    this.toggleSensorDetails(index);
                });
                pointer.addEventListener('click', (event) => {
                    event.stopImmediatePropagation();
                    this.toggleSensorDetails(index);
                });
            }
        } else {
            tooltip = this.querySelector(`.custom-tooltip[data-index="${index}"]`)
            if (tooltip) {
                tooltip.remove();
            }
        }
        return {pointer, horizontalLine, verticalLine, tooltip};
    },
    toggleSensorDetails(index) {
        this.clickedTooltip = !this.clickedTooltip;
        if (!this.clickedTooltip) {
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
                let classes = `custom-tooltip custom-tooltip-${index}`;
                if (this.clickedTooltip) {
                    classes += ' active';
                }
                tooltip.className = classes;
                tooltip.style.opacity = '0.85';
                tooltip.querySelector('.tooltipAdditionalInformations').style.display = 'inline';

                if (this.enable_legend) {
                    let legend = this.querySelector(`.sensor-legend-${index}`);
                    classes = `sensor-legend sensor-legend-${index}`;
                    if (this.clickedTooltip) {
                        classes += ' active';
                    }
                    legend.className = classes;

                }
            }
            this.positionTooltip(tooltip, parseFloat(tooltip.style.left));
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
            this.querySelectorAll('.custom-tooltip').forEach(tooltip => {
                tooltip.style.opacity = '1';
                tooltip.className = tooltip.className.split(' ').filter(c => c !== 'active').join(' ');
                if (this.enable_show_always_informations) {
                    this.querySelectorAll('.tooltipAdditionalInformations').forEach(tooltip => tooltip.style.display = 'inline');
                } else {
                    this.querySelectorAll('.tooltipAdditionalInformations').forEach(tooltip => tooltip.style.display = 'none');
                }

                this.positionTooltip(tooltip, parseFloat(tooltip.style.left));
            });
            this.querySelectorAll(`.history-circle-${index}`).forEach(circle => circle.style.display = 'none');
            this.querySelectorAll('.custom-tooltip, .horizontal-line, .vertical-line, .sensor-pointer').forEach(el => el.style.display = 'block');
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
