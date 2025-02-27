const travelService = require("../services/travel.service");
const { DateTime } = require('luxon');
const { Utils } = require("../utils/common");
const path = require('path');

const formatStatsData = (data) => {
    if (!data) return { headers: [], data: [] };

    // Handle single object (travel summary) by converting it to array
    const dataArray = Array.isArray(data) ? data : [data];
    
    if (dataArray.length === 0) return { headers: [], data: [] };

    // Get all possible keys from the data
    const allKeys = new Set();
    dataArray.forEach(item => {
        Object.keys(item).forEach(key => {
            // Skip the stopages array in travel summary
            if (key === 'stopages') return;
            
            if (typeof item[key] === 'object' && item[key] !== null) {
                Object.keys(item[key]).forEach(nestedKey => {
                    allKeys.add(`${key}_${nestedKey}`);
                });
            } else {
                allKeys.add(key);
            }
        });
    });

    // Format headers (convert snake_case/camelCase to Title Case)
    const headers = Array.from(allKeys)
        .map(key => key
            // Split by underscore or camelCase
            .split(/(?=[A-Z])|_/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' '));

    // Format data according to headers
    const formattedData = dataArray.map(item => {
        const formattedItem = {};
        Array.from(allKeys).forEach((key, index) => {
            let value = item[key];

            // Format specific fields
            if (key.includes('Time')) {
                if (typeof value === 'number') {
                    // Convert milliseconds to hours:minutes:seconds
                    const hours = Math.floor(value / 3600000);
                    const minutes = Math.floor((value % 3600000) / 60000);
                    const seconds = Math.floor((value % 60000) / 1000);
                    value = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else if (value && typeof value === 'string') {
                    value = new Date(value).toLocaleString();
                }
            } else if (key.includes('Speed')) {
                value = typeof value === 'number' ? `${value.toFixed(2)} km/h` : value;
            } else if (key.includes('distance')) {
                value = typeof value === 'number' ? `${value.toFixed(2)} km` : value;
            }

            formattedItem[headers[index]] = value || 'N/A';
        });
        return formattedItem;
    });

    return { headers, data: formattedData };
};

module.exports = {
    async getTravelSummary(req, res){
        try{
            const { deviceId, startDate, endDate } = req.params;
            const { export: exportType } = req.query;

            const start = DateTime.fromISO(startDate).startOf('day');
            const end = DateTime.fromISO(endDate).endOf('day');
            const travelSummary = await travelService.getTravelSummary(deviceId, start.toISO(), end.toISO());

            if (exportType) {
                const fileName = `travel_summary_${deviceId}_${startDate}_${endDate}`;
                const { headers, data } = formatStatsData([travelSummary]);

                if (exportType.toLowerCase() === 'csv') {
                    const filePath = path.join(__dirname, '../exports', `${fileName}.csv`);
                    await Utils.convertToCSV(data, filePath, headers);
                    return res.download(filePath);
                }
                
                if (exportType.toLowerCase() === 'pdf') {
                    const filePath = path.join(__dirname, '../exports', `${fileName}.pdf`);
                    await Utils.convertToPDF(data, filePath, {
                        title: 'Travel Summary Report',
                        headers: headers
                    });
                    return res.download(filePath);
                }
            }

            res.status(200).json({ status: true, data: travelSummary });
        }catch(error){
            res.status(500).json({ status: false, message: 'Failed to get the Travel Summary', error: error.message });
        }
    },

    async getTripsSummary(req, res){
        try{
            const { deviceId, startDate, endDate } = req.params;
            const { export: exportType } = req.query;

            const start = DateTime.fromISO(startDate).startOf('day');
            const end = DateTime.fromISO(endDate).endOf('day');
            const trips = await travelService.getTrips(deviceId, start.toISO(), end.toISO());

            if (exportType) {
                const fileName = `trips_summary_${deviceId}_${startDate}_${endDate}`;
                const { headers, data } = formatStatsData(trips);

                if (exportType.toLowerCase() === 'csv') {
                    const filePath = path.join(__dirname, '../exports', `${fileName}.csv`);
                    await Utils.convertToCSV(data, filePath, headers);
                    return res.download(filePath);
                }
                
                if (exportType.toLowerCase() === 'pdf') {
                    const filePath = path.join(__dirname, '../exports', `${fileName}.pdf`);
                    await Utils.convertToPDF(data, filePath, {
                        title: 'Trips Summary Report',
                        headers: headers
                    });
                    return res.download(filePath);
                }
            }

            res.status(200).json({ status: true, data: trips });
        }catch(error){
            res.status(500).json({ status: false, message: 'Failed to get the Trips Summary', error: error.message });
        }
    },
}