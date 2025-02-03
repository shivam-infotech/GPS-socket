const { getEvents, getIgnitions, getIdles } = require("../services/event.service");
const { DateTime } = require('luxon');

module.exports = {
    async DeviceEvents(req, res){
        try{
            const { deviceId, startDate, endDate } = req.params;

            const start = DateTime.fromISO(startDate).startOf('day');
            const end = DateTime.fromISO(endDate).endOf('day');

            const events = await getEvents(deviceId, start.toISO(), end.toISO());
            res.status(200).json({ status: true, data: events });
        }catch(error){
            res.status(500).json({ status: false, message: 'Fail to fetch the device events', error: error.message });
        }
    },

    async IgnitionLocations(req, res){
        try{
            const { deviceId, startDate, endDate } = req.params;

            const start = DateTime.fromISO(startDate).startOf('day');
            const end = DateTime.fromISO(endDate).endOf('day');
            
            const ignitions = await getIgnitions(deviceId, start.toISO(), end.toISO());
            res.status(200).json({ status: true, data: ignitions });
        }catch(error){
            res.status(500).json({ status: false, message: 'Fail to fetch the device Ignitions', error: error.message });
        }
    },

    async StoppedLocations(req, res){
        try{
            const { deviceId, startDate, endDate } = req.params;

            const start = DateTime.fromISO(startDate).startOf('day');
            const end = DateTime.fromISO(endDate).endOf('day');
            
            const ignitions = await getStoppages(deviceId, start.toISO(), end.toISO());
            res.status(200).json({ status: true, data: ignitions });
        }catch(error){
            res.status(500).json({ status: false, message: 'Fail to fetch the device Stoppages', error: error.message });
        }
    },

    async IdlesLocations(req, res){
        try{
            const { deviceId, startDate, endDate } = req.params;

            const start = DateTime.fromISO(startDate).startOf('day');
            const end = DateTime.fromISO(endDate).endOf('day');
            
            const ignitions = await getIdles(deviceId, start.toISO(), end.toISO());
            res.status(200).json({ status: true, data: ignitions });
        }catch(error){
            res.status(500).json({ status: false, message: 'Fail to fetch the device idles', error: error.message });
        }
    },
}