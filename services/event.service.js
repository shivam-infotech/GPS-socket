const { models } = require("../database/database");
const { Op } = require('sequelize');
const { Debug } = require("../utils/debug");

const eventService = {
    async saveEvent(type, tracking_id, device_id, date){
        const eventType = await models.EventType.findOne({ where: {name: type} });
        if(!eventType){
            throw new Error("Specified event not found on event types")
        }

        return await models.Event.create({
            event_type_id: eventType.id,
            device_id,
            tracking_id,
            date_from_device: date,
        })
    },

    async getEvents(deviceId, startDate, endDate){
        const events = await models.Event.findAll({
            where: {
                device_id: deviceId,
                date_from_device: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                { model: models.EventType, as: 'eventType' },
                { model: models.Tracking, as : 'tracking' }
            ]
        });

        return events;
    },

    async getIgnitions(deviceId, startDate, endDate){
        const ignitions = await models.Event.findAll({
            where: {
                device_id: deviceId,
                date_from_device: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [
                { 
                    model: models.EventType,
                    as: 'eventType',
                    where: {
                        name: {
                            [Op.or]: ['ignition-on', 'ignition-off']
                        }
                    }
                },
                { model: models.Tracking, as: 'tracking' }
            ]
        });

        return ignitions;
    },

    async getStoppages(deviceId, startDate, endDate){
        const stoppages = await models.Event.findAll({
            where: {
                device_id: deviceId,
                date_from_device: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [{
                model: models.EventType,
                as: 'eventType',
                where: {
                    name: "device-stopped"
                }
            }, { model: models.Tracking, as: 'tracking' }]
        });

        return stoppages;
    },

    async getIdles(deviceId, startDate, endDate){
        const idles = await models.Event.findAll({
            where: {
                device_id: deviceId,
                date_from_device: {
                    [Op.between]: [startDate, endDate]
                }
            },
            include: [{
                model: [models.EventType, models.Tracking],
                where: {
                    name: "device-idle"
                }
            }]
        });

        return idles;
    },
};

module.exports = eventService