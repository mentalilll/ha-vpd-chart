export const methods = {
    calculateVPD(Tleaf, Tair, RH) {
        const VPleaf = 610.7 * Math.exp(17.27 * Tleaf / (Tleaf + 237.3)) / 1000;
        const VPair = 610.7 * Math.exp(17.27 * Tair / (Tair + 237.3)) / 1000 * RH / 100;
        return VPleaf - VPair;
    },
    getPhaseClass(vpd) {
        for (const phase of this.vpd_phases) {
            if (phase.upper === undefined) {
                if (vpd >= phase.lower) {
                    return phase.className;
                }
            } else if (vpd < phase.upper && (!phase.lower || vpd >= phase.lower)) {
                return phase.className;
            }
        }
        return '';
    },
    async getEntityHistory(entityId) {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
        const isoStartTime = startTime.toISOString();
        const isoEndTime = endTime.toISOString();

        try {
            const history = await this._hass.callApi('GET', `history/period/${isoStartTime}?filter_entity_id=${entityId}&end_time=${isoEndTime}&minimal_response&significant_changes_only&no_attributes`);
            return this.filterEntriesByHour(history[0]); //this.getRandomEntries(history[0], 20);
        } catch (error) {
            return [];
        }
    },
}