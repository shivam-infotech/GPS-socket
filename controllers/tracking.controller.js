const Server = require('../server');
const trackingService = require('../services/tracking.service');
const { Debug } = require('../utils/debug');
const { DateTime } = require('luxon');

module.exports = {
    /**
     * Resync the devices from te backend server to Socket server
     * @param {any} req 
     * @param {any} res 
     */
    async resyncDevices(req, res){
        try{
            if(await Server.resyncDevices()) res.status(200).json({ status: true, message: 'Devices has been resynced successfully' });
            else throw new Error('Failed to resync devices')
        }catch(err){
            res.status(500).json({ status: false, message: 'Fail to resync the devices' });
        }
    },
    /**
     * Returns the last location of the specified device
     * @param {any} req 
     * @param {any} res 
     */
    async deviceLastLocation (req, res) {
        try{
            const lastLocation = await trackingService.getDeviceLastLocation(req.params.deviceId);
            res.status(200).json({ status: true, data: lastLocation });
        }catch(error){
            res.status(500).json({ status: false, message: 'Failed to get last location', error });
        }
    },
    /**
     * Return all the locations of the specified device for particular date
     * @param {any} request 
     * @param {any} response 
     */
    async deviceLocationsOfADay(request, response){
        const { deviceId, date } = request.params;
        try{
            let startDate = DateTime.fromISO(date).startOf('day');
            let endDate = DateTime.fromISO(date).endOf('day');
            const locations = await trackingService.getDeviceLocationsBetweenDates(deviceId, startDate.toISO(), endDate.toISO());
            response.status(200).json({ status: true, data: locations });
        }catch(error){
            response.status(500).json({ status: false, message: 'Failed to get device locations between dates', error });
        }
    },

    /**
     * Return all the locations of the specified device for particular date range
     * @param {any} request 
     * @param {any} response 
     */
    async deviceLocationsBetweenDates(request, response){
        const { deviceId, startDate, endDate } = request.params;
        try{
            let start = DateTime.fromISO(startDate).startOf('day');
            let end = DateTime.fromISO(endDate).endOf('day');
            Debug.log(`Start date: ${start.toISO()}, End date: ${end.toISO()}`);

            const locations = await trackingService.getDeviceLocationsBetweenDates(deviceId, start.toISO(), end.toISO());
            response.status(200).json({ status: true, data: locations });
        }catch(error){
            response.status(500).json({ status: false, message: 'Failed to get device locations between dates', error });
        }
    },

    /**
     * Returns the device IMEI numbers of the devices which have available playbacks.
     * @param {any} request 
     * @param {any} response 
     */
    async availableDevicesForlocation(request, response){
        try{
            const devices = await trackingService.getAvailableDevicesForLocation();
            response.status(200).json({ status: true, data: devices });
        }catch(error){
            response.status(500).json({ status: false, message: 'Failed to get available devices ', error });
        }
    },
    /**
     * Returns the available dates for device locations.
     * @param {any} request 
     * @param {any} response 
     */
    async availableDatesForDeviceLocations(request, response){
        try{
            const { deviceId } = request.params;
            const dates = await trackingService.getAvailableDatesForDeviceLocations(deviceId);
            response.status(200).json({ status: true, data: dates, message: 'Available dates for device locations' });
        }catch(error){
            response.status(500).json({ status: false, message: 'Failed to get available dates for device locations', error: error.message });
        }
    },
}