const { getEvents, getIgnitions, getIdles, getStoppages } = require("../services/event.service");
const { DateTime } = require('luxon');
const { Utils } = require("../utils/common");
const path = require('path');

const formatEventData = (events) => {
    if (!events || events.length === 0) return { headers: [], data: [] };

    // Get all possible keys from all events
    const allKeys = new Set();
    events.forEach(event => {
        // Get base level keys
        Object.keys(event).forEach(key => {
            if (typeof event[key] === 'object' && event[key] !== null) {
                // For nested objects like eventType and tracking
                Object.keys(event[key]).forEach(nestedKey => {
                    allKeys.add(`${key}_${nestedKey}`);
                });
            } else {
                allKeys.add(key);
            }
        });
    });

    // Format headers (convert snake_case to Title Case)
    const headers = Array.from(allKeys)
        .filter(key => !key.includes('extras')) // Exclude extras field
        .map(key => key.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '));

    // Format data according to headers
    const data = events.map(event => {
        const formattedEvent = {};
        Array.from(allKeys).forEach((key, index) => {
            if (key.includes('_')) {
                const [parentKey, childKey] = key.split('_');
                if (event[parentKey] && event[parentKey][childKey]) {
                    formattedEvent[headers[index]] = event[parentKey][childKey];
                } else {
                    formattedEvent[headers[index]] = 'N/A';
                }
            } else {
                formattedEvent[headers[index]] = event[key] || 'N/A';
            }

            // Format specific fields
            if (key.includes('date')) {
                formattedEvent[headers[index]] = new Date(formattedEvent[headers[index]]).toLocaleString();
            }
            if (typeof formattedEvent[headers[index]] === 'boolean') {
                formattedEvent[headers[index]] = formattedEvent[headers[index]] ? 'Yes' : 'No';
            }
        });
        return formattedEvent;
    });

    return { headers, data };
};

module.exports = {
    async DeviceEvents(req, res){
        try{
            const { deviceId, startDate, endDate } = req.params;
            const { export: exportType } = req.query;

            const start = DateTime.fromISO(startDate).startOf('day');
            const end = DateTime.fromISO(endDate).endOf('day');

            const events = await getEvents(deviceId, start.toISO(), end.toISO());

            if (exportType) {
                const fileName = `device_events_${deviceId}_${startDate}_${endDate}`;
                const { headers, data } = formatEventData(events);

                if (exportType.toLowerCase() === 'csv') {
                    const filePath = path.join(__dirname, '../exports', `${fileName}.csv`);
                    await Utils.convertToCSV(data, filePath, headers);
                    return res.download(filePath);
                } 
                
                if (exportType.toLowerCase() === 'pdf') {
                    const filePath = path.join(__dirname, '../exports', `${fileName}.pdf`);
                    await Utils.convertToPDF(data, filePath, {
                        title: 'Device Events Report',
                        headers: headers
                    });
                    return res.download(filePath);
                }
            }

            res.status(200).json({ status: true, data: events });
        }catch(error){
            res.status(500).json({ status: false, message: 'Failed to fetch the device events', error: error.message });
        }
    },

    async IgnitionLocations(req, res){
        try{
            const { deviceId, startDate, endDate } = req.params;
            const { export: exportType } = req.query;

            const start = DateTime.fromISO(startDate).startOf('day');
            const end = DateTime.fromISO(endDate).endOf('day');
            
            const ignitions = await getIgnitions(deviceId, start.toISO(), end.toISO());

            if (exportType) {
                const fileName = `ignition_events_${deviceId}_${startDate}_${endDate}`;
                const { headers, data } = formatEventData(ignitions);

                if (exportType.toLowerCase() === 'csv') {
                    const filePath = path.join(__dirname, '../exports', `${fileName}.csv`);
                    await Utils.convertToCSV(data, filePath, headers);
                    return res.download(filePath);
                }
                
                if (exportType.toLowerCase() === 'pdf') {
                    const filePath = path.join(__dirname, '../exports', `${fileName}.pdf`);
                    await Utils.convertToPDF(data, filePath, {
                        title: 'Ignition Events Report',
                        headers: headers
                    });
                    return res.download(filePath);
                }
            }

            res.status(200).json({ status: true, data: ignitions });
        }catch(error){
            res.status(500).json({ status: false, message: 'Failed to fetch the device Ignitions', error: error.message });
        }
    },

    async StoppedLocations(req, res){
        try{
            const { deviceId, startDate, endDate } = req.params;
            const { export: exportType } = req.query;

            const start = DateTime.fromISO(startDate).startOf('day');
            const end = DateTime.fromISO(endDate).endOf('day');
            
            const stoppages = await getStoppages(deviceId, start.toISO(), end.toISO());

            if (exportType) {
                const fileName = `stopped_locations_${deviceId}_${startDate}_${endDate}`;
                const { headers, data } = formatEventData(stoppages);

                if (exportType.toLowerCase() === 'csv') {
                    const filePath = path.join(__dirname, '../exports', `${fileName}.csv`);
                    await Utils.convertToCSV(data, filePath, headers);
                    return res.download(filePath);
                }
                
                if (exportType.toLowerCase() === 'pdf') {
                    const filePath = path.join(__dirname, '../exports', `${fileName}.pdf`);
                    await Utils.convertToPDF(data, filePath, {
                        title: 'Stopped Locations Report',
                        headers: headers
                    });
                    return res.download(filePath);
                }
            }

            res.status(200).json({ status: true, data: stoppages });
        }catch(error){
            res.status(500).json({ status: false, message: 'Failed to fetch the device Stoppages', error: error.message });
        }
    },

    async IdlesLocations(req, res){
        try{
            const { deviceId, startDate, endDate } = req.params;
            const { export: exportType } = req.query;

            const start = DateTime.fromISO(startDate).startOf('day');
            const end = DateTime.fromISO(endDate).endOf('day');
            
            const idles = await getIdles(deviceId, start.toISO(), end.toISO());

            if (exportType) {
                const fileName = `idle_locations_${deviceId}_${startDate}_${endDate}`;
                const { headers, data } = formatEventData(idles);

                if (exportType.toLowerCase() === 'csv') {
                    const filePath = path.join(__dirname, '../exports', `${fileName}.csv`);
                    await Utils.convertToCSV(data, filePath, headers);
                    return res.download(filePath);
                }
                
                if (exportType.toLowerCase() === 'pdf') {
                    const filePath = path.join(__dirname, '../exports', `${fileName}.pdf`);
                    await Utils.convertToPDF(data, filePath, {
                        title: 'Idle Locations Report',
                        headers: headers
                    });
                    return res.download(filePath);
                }
            }

            res.status(200).json({ status: true, data: idles });
        }catch(error){
            res.status(500).json({ status: false, message: 'Failed to fetch the device idles', error: error.message });
        }
    },
}