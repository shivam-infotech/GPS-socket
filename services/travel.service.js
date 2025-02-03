const { Utils } = require("../utils/common");
const { Debug } = require("../utils/debug");
const { getDeviceLocationsBetweenDates } = require("./tracking.service");

module.exports = {
    async _processTrackingData(trackings) {
        const pingDataClone = trackings;
        const runningData = trackings.filter(ping => ping.extras.deviceStatus === 'running');
        const StoppedLocations = [];
        let distanceTravelled = 0;

        // calculate distance travelled
        let lastCord = null;
        for(let data of runningData){
            if(lastCord){
               if(data.extras.deviceStatus === 'running') distanceTravelled += (Utils.getDistance(lastCord.latitude, lastCord.longitude, data.latitude, data.longitude) / 1000);
            }
            lastCord = data;
        }

        // Calculating times
        let stopTime = runningTime = idleTime = timeDiff = 0;
        let speedSeries = [];
        lastCord = null;
        for(let data of pingDataClone){
            if(lastCord){
                // running time
                if(new Date(data.extras.date) > new Date(lastCord.extras.date)){
                    timeDiff = Math.abs(Utils.diffInSeconds(lastCord.extras.date, data.extras.date));

                    if(lastCord.extras.deviceStatus === 'running' && data.extras.deviceStatus === 'running') runningTime += timeDiff;
                    else if(lastCord.extras.deviceStatus === 'running' && data.extras.deviceStatus === 'idle') runningTime += timeDiff;
                    else if(lastCord.extras.deviceStatus === 'running' && data.extras.deviceStatus ==='stopped') runningTime += timeDiff;
                    // Idle time
                    else if(lastCord.extras.deviceStatus === 'idle' && data.extras.deviceStatus === 'idle') idleTime += timeDiff;
                    else if(lastCord.extras.deviceStatus === 'idle' && data.extras.deviceStatus === 'running') idleTime += timeDiff;
                    else if(lastCord.extras.deviceStatus === 'idle' && data.extras.deviceStatus ==='stopped') idleTime += timeDiff;
                    // Stop time
                    else if(lastCord.extras.deviceStatus ==='stopped' && data.extras.deviceStatus ==='stopped') stopTime += timeDiff;
                    else if(lastCord.extras.deviceStatus ==='stopped' && data.extras.deviceStatus === 'running') stopTime += timeDiff;
                    else if(lastCord.extras.deviceStatus ==='stopped' && data.extras.deviceStatus === 'idle') stopTime += timeDiff;
                }

                if(
                    (
                        data.extras.deviceStatus === 'stopped' && 
                        lastCord.extras.deviceStatus === 'stopped' && 
                        Utils.getDistance(data.latitude, data.longitude, lastCord.latitude, lastCord.longitude) > 10
                    ) || (
                        data.extras.deviceStatus === 'stopped' && 
                        lastCord.extras.deviceStatus !== 'stopped'
                    )
                ){
                    StoppedLocations.push(data);
                }
            }
            speedSeries.push(data.extras.speed);
            lastCord = data
        }

        const averageSpeed = parseFloat((Utils.averageSpeed(... speedSeries) || 0).toFixed(2));
        const maxSpeed = Math.max(... speedSeries, 0);
        const minSpeed = Math.min(... speedSeries.filter(s => s > 0));

        return {
            startingLocation: trackings[0]?.extras?.address || 'N/A',
            endingLocation: trackings[trackings.length - 1]?.extras?.address || 'N/A',
            distanceTravelled: parseFloat(distanceTravelled.toFixed(2)),
            runningTime: parseFloat((runningTime ).toFixed(2)),
            stopTime: parseFloat((stopTime).toFixed(2)),
            idleTime: parseFloat((idleTime).toFixed(2)), 
            ignitionTime: parseFloat((runningTime ).toFixed(2)) + parseFloat((idleTime).toFixed(2)),
            averageSpeed,
            maxSpeed,
            minSpeed,
            stopages: StoppedLocations
        }
    },

    async getTravelSummary(deviceId, startDate, endDate){
        const pingData = await getDeviceLocationsBetweenDates(deviceId, startDate, endDate);
        return this._processTrackingData(pingData);
    },

    async getTrips(deviceId, startDate, endDate){
        const trackings = await getDeviceLocationsBetweenDates(deviceId, startDate, endDate);
        const trips = [];
        let currentTrip = [];

        for (let i = 0; i < trackings.length; i++) {
            const current = trackings[i];
            const previous = trackings[i - 1];

            // Check if this is the start of a new trip based on accStatus change
            if (previous && current.extras.accStatus !== previous.extras.accStatus) {
                // If we have a current trip, process it
                if (currentTrip.length > 0) {
                    const tripSummary = await this._processTrackingData(currentTrip);
                    trips.push(tripSummary);
                    currentTrip = [];
                }
            }

            currentTrip.push(current);
        }

        // Process the last trip if it exists
        if (currentTrip.length > 0) {
            const tripSummary = await this._processTrackingData(currentTrip);
            trips.push(tripSummary);
        }

        return trips;
    }
}