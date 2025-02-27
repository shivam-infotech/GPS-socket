const { Op, fn, col, literal } = require("sequelize");
const { models } = require("../database/database")
const { Debug } = require("../utils/debug")
const InvalidDataFilter = require('../filters/invalid-data.filter');
const TemporalFilter = require('../filters/temporal.filter');
const MovementFilter = require("../filters/movement.filter");
const { Utils } = require("../utils/common");

module.exports = {
    __applicableFilters: [
        InvalidDataFilter,
        TemporalFilter,
        MovementFilter
    ], // Hold the list of filters that can be applied to the device data

    checkFilters(data, prev) {
        let checks = {};
        let isCompatible = true;
        for(let filter of this.__applicableFilters){
            var instance = filter.init(data, [prev]);
            checks = {...checks, ...instance.detect()};
            isCompatible = isCompatible && instance.check(checks);
        }

        data.distance = Utils.getDistance(data.latitude, data.longitude, prev.latitude, prev.longitude);
        data.checks = checks;
        data.isCompatible = isCompatible;
        return data;
    },
    async saveTrackingData(pingObject){
        return await models.Tracking.create({
            protocol_id: pingObject.protocolId,
            device_id: pingObject.deviceId,
            // sequential_count: pingObject.sequencialPacketCount,
            date_from_device: pingObject.date,
            longitude: pingObject.longitude,
            latitude: pingObject.latitude,
            // location_type: pingObject.locationType,
            // longitude_appox: pingObject.longitudeApprox || pingObject.longitude,
            // latitude_appox: pingObject.latitudeAppox || pingObject.latitude,
            speed: pingObject.speed,
            orientation: pingObject.orientation,
            address: pingObject.address, 
            alert: pingObject.alert,
            device_status: pingObject.deviceStatus,
            extras: pingObject
        })
    },
    async getDeviceLastLocation(deviceId){
        return await models.Tracking.findOne({where: {device_id: deviceId}, order: [['date_from_device', 'DESC']]});
    },
    async getDeviceLocationsBetweenDates(deviceId, startDate, endDate){
        const locations = await models.Tracking.findAll({
            where: {
                device_id: deviceId,
                date_from_device: {
                    [Op.between]: [startDate, endDate]
                }
            }
        });

        const FilterLocations = locations.filter((loc, index) => {
            if(index <= 0) return true;
            const checks = this.checkFilters(loc.extras, locations[index - 1]);
            return checks?.isCompatible
        });

        return FilterLocations;
    },
    async getAvailableDevicesForLocation(){
        const devices = await models.Tracking.findAll({ attributes: ['device_id'], group: 'device_id' });
        return devices.map(device => device.device_id);
    },
    async getAvailableDatesForDeviceLocations(deviceId){
        const dates = await models.Tracking.findAll({
            attributes: [
                [literal(`DISTINCT TO_CHAR("date_from_device", 'YYYY-MM-DD')`), 'date_from_device']
            ],
            where: { device_id: deviceId },
        });
        return dates.map(date => date.date_from_device);
    },
}