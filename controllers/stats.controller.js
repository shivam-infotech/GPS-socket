const travelService = require("../services/travel.service");
const { DateTime } = require('luxon');

module.exports = {
    async getTravelSummary(req, res){
        try{
            const { deviceId, startDate, endDate } = req.params;
            const start = DateTime.fromISO(startDate).startOf('day');
            const end = DateTime.fromISO(endDate).endOf('day');
            const travelSummary = await travelService.getTravelSummary(deviceId, start.toISO(), end.toISO());

            res.status(200).json({ status: true, data: travelSummary });
        }catch(error){
            res.status(500).json({ status: false, message: 'Fail to get the Travel Summary', error: error.message });
        }
    },

    async getTripsSummary(req, res){
        try{
            const { deviceId, startDate, endDate } = req.params;
            const start = DateTime.fromISO(startDate).startOf('day');
            const end = DateTime.fromISO(endDate).endOf('day');
            const travelSummary = await travelService.getTrips(deviceId, start.toISO(), end.toISO());

            res.status(200).json({ status: true, data: travelSummary });
        }catch(error){
            res.status(500).json({ status: false, message: 'Fail to get the Travel Summary', error: error.message });
        }
    },
}