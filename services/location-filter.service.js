const { Debug } = require('../utils/debug');
const common = require('./common.service');

/**
 * Location Filter Service
 * @purpose Filter out the jitters and smooth out the location data
 * 
 * @step 1. Jitter Detection
 * -- JItter can be of two types:
 * ---- Jitter in the running device - while device is running we need to check every coordinate does it have any jitter or not.
 *       To check the jitter, we need to calculate the distance between the two coordinates,
 *       then we need to check the speed in both coordinates and get the higest one.
 *       And calculate the possible coverable distance based on the speed and the time difference.
 *       If the possible coverable distance is greater thsn the distance between the two coordinates, then there is jitter.
 * ---- Jitter in the stopped device - If the device is stopped, then if the coordinates change frequently, then there is jitter.
 * 
 * @step 2. Fixing out the jitters.
 * -- In case of jitter in running device. we will apply the kalman filter to smooth out the location data.
 * -- In case of jitter in stopped device. we will send the previous location data, as we don't need to move the device. 
 * 
 */

class LocationFilter {
    locations = new Map(); // Contains the locations of the devices differentiated by the device id
    locationStackSize = 10;
    possibleStoopedDistance = 0; // Possible distance covered by the device in stopped state

    getLocations(deviceId) { return this.locations.get(deviceId); }
    setLocations(deviceId, locations) { this.locations.set(deviceId, locations); return this; }
    removeLocations(deviceId) { this.locations.delete(deviceId); return this; }
    clearLocations() { this.locations.clear(); return this; }
    hasLocations(deviceId) { return this.locations.has(deviceId); }
    updateLocation(deviceId, location) {
        const locations = this.getLocations(deviceId) || [];
        if (locations.length >= this.locationStackSize) locations.shift();
        locations.push(location);
        this.setLocations(deviceId, locations);
        return this;
    }

    processLocation(pingData) {
        // check if there are enough locations for the device to process further
        if(!this.hasLocations(pingData.deviceId) || this.getLocations(pingData.deviceId).length < 1){
            this.updateLocation(pingData.deviceId, pingData);
            return pingData;
        }

        let processedLocation = pingData;
        // calculate the distance between the current and previous ping
        const currentPing = pingData;
        const previousPing = this.getLocations(currentPing.deviceId)[this.getLocations(currentPing.deviceId).length - 1];
        const distance = common.getDistance(currentPing.latitude, currentPing.longitude, previousPing.latitude, previousPing.longitude);
        pingData.distanceFromLast = distance;

        // check for jitter
        pingData.jitter = this.detectJitter(currentPing, previousPing);

        // if the device is running and there is jitter, then apply the kalman filter to smooth out the location data
        if(pingData.deviceStatus === 'running' && pingData.jitter) {
            const locations = this.getLocations(pingData.deviceId);
            processedLocation = {...pingData, ...this.kalmanFilter(locations, pingData)};
            this.updateLocation(pingData.deviceId, processedLocation);
        }else if(pingData.deviceStatus ==='stopped' && previousPing.deviceStatus === 'stopped' && pingData.jitter){
            // If the device is stopped and there is jitter, then send the previous location data, as we don't need to move the device.
            processedLocation = this.getLocations(pingData.deviceId)[this.getLocations(pingData.deviceId).length - 1];
            // processedLocation = pingData;
            this.updateLocation(pingData.deviceId, processedLocation);
        }

        return processedLocation;
    }

    detectJitter(currentPing, previousPing) {
        // check if the device is running or stopped
        if(currentPing.deviceStatus === 'running'){
            // Get the time difference in seconds between the current and previous ping
            const currentPingTime = (new Date(currentPing.date).getTime()) / 1000;
            const previousPingTime = (new Date(previousPing.date).getTime()) / 1000;
            const timeDifference = Math.abs(previousPingTime - currentPingTime);

            // converting the speed into meters per second
            const currentSpeed = common.speedInSecond(currentPing.speed);
            const previousSpeed = common.speedInSecond(previousPing.speed);

            // Calculate the average speed of the device
            const avgSpeed = common.averageSpeed(currentSpeed, previousSpeed);

            // Calculate the possible distance made by the d`evice
            const possibleDistance = avgSpeed * timeDifference;

            
            // Calculate the covered distance between the two coordinates
            const coveredDistance = common.getDistance(currentPing.latitude, currentPing.longitude, previousPing.latitude, previousPing.longitude);
            
            // Check if the possible coverable distance is greater than the covered distance
            if(possibleDistance < coveredDistance) return true;
        }else if(currentPing.deviceStatus ==='stopped'){
            // Check if the device is stopped and the speed is greater than zero, then there is jitter
            if(currentPing.speed > 0) return true;
            
            // Calculate the distance between the current and previous ping
            const distance = common.getDistance(currentPing.latitude, currentPing.longitude, previousPing.latitude, previousPing.longitude);
            
            // If the distance is greater then the possible distance covered by the device in stopped state, then there is jitter
            if(distance > this.possibleStoopedDistance) return true;
        }else if(currentPing.deviceStatus === 'idle'){
            // @todo: Research about the Idle state and implement the jitter detection for idle state.
        }

        return false;
    }
    kalmanFilter(coordinates, pingData) {
        if (coordinates.length < 1) return pingData; // Not enough data for smoothing

        if (coordinates.length === 1) {
            const lastPoint = coordinates[0];
            return {
                ...pingData,
                latitude: (pingData.latitude + lastPoint.latitude) / 2,
                longitude: (pingData.longitude + lastPoint.longitude) / 2,
            };
        }

        const weights = coordinates.map((point) => {
            const timeDiff = Math.abs(new Date(pingData.date) - new Date(point.date));
            const accuracyWeight = 1 / (point.accuracy || 1); // Higher accuracy = higher weight
            return Math.exp(-timeDiff / (1000 * 60)) * accuracyWeight;
        });

        const sumWeights = weights.reduce((a, b) => a + b, 0);
        const smoothedLat = coordinates.reduce((acc, point, i) => acc + point.latitude * weights[i], 0) / sumWeights;
        const smoothedLng = coordinates.reduce((acc, point, i) => acc + point.longitude * weights[i], 0) / sumWeights;

        return {
            latitude: parseFloat(smoothedLat.toFixed(6)),
            longitude: parseFloat(smoothedLng.toFixed(6)),
        };
    }
}

// const LocationFilter = {
//     maxDistanceInSeconds: 33,
//     locations: new Map(),
//     maxLocationsStore: 10,

//     hasLocations(deviceId){ return this.locations.has(deviceId); },
//     getLocations(deviceId){ return this.locations.get(deviceId); },
//     setLocations(deviceId, locations){ this.locations.set(deviceId, locations); return this; },
//     removeLocations(deviceId){ this.locations.delete(deviceId); return this; },
//     clearLocations(){ this.locations.clear(); return this; },
//     updateLocation(deviceId, location){
//         const locations = this.getLocations(deviceId) || [];
//         if(locations.length >= this.maxLocationsStore) locations.shift();
//         locations.push(location);
//         this.setLocations(deviceId, locations);
//         return this;
//     },
//     detectJitter(currentPing, previousPing){
//         /**
//          * First case
//          * Get the time difference between the current and previous ping
//          * Get the distance between the current and previous ping
//          * A vehicle can travel 33 meters in a second
//          * Multiply the distance by the time difference to get the possible coverable distance
//          * If the possible coverable distance is less than the distance between the two pings, then there is not jitter
//          */

//         const timeDifference = (new Date(previousPing.date).getTime() - new Date(currentPing.date).getTime()) / 1000;
//         const distance = common.getDistance(currentPing.latitude, currentPing.longitude, previousPing.latitude, previousPing.longitude);

//         if(distance >= (this.maxDistanceInSeconds * timeDifference)) return true;

//         /**
//          * Second case
//          * If the speed is greater than zero and the vehicle is stopped. then its a jitter
//          */

//         if(currentPing.speed > 0 && currentPing.deviceStatus === 'stopped') return true;

//         return false;
//     },
//     kalmanFilter(coordinates, pingData){
//         if (coordinates.length < 1) return pingData; // Not enough data for smoothing

//         if (coordinates.length === 1) {
//             const lastPoint = coordinates[0];
//             return {
//                 ...pingData,
//                 latitude: (pingData.latitude + lastPoint.latitude) / 2,
//                 longitude: (pingData.longitude + lastPoint.longitude) / 2,
//             };
//         }

//         const weights = coordinates.map((point) => {
//             const timeDiff = Math.abs(new Date(pingData.date) - new Date(point.date));
//             const accuracyWeight = 1 / (point.accuracy || 1); // Higher accuracy = higher weight
//             return Math.exp(-timeDiff / (1000 * 60)) * accuracyWeight;
//         });

//         const sumWeights = weights.reduce((a, b) => a + b, 0);
//         const smoothedLat = coordinates.reduce((acc, point, i) => acc + point.latitude * weights[i], 0) / sumWeights;
//         const smoothedLng = coordinates.reduce((acc, point, i) => acc + point.longitude * weights[i], 0) / sumWeights;

//         return {
//             latitude: parseFloat(smoothedLat.toFixed(6)),
//             longitude: parseFloat(smoothedLng.toFixed(6)),
//         };
//     },

//     /**
//      * Process the location data, detect jitters and smooth out the location data.
//      * 
//      * @param {object} pingData - Socket Data from model class
//      * @returns {object} - Returns the processed location data
//      */
//     processLocation(pingData){
//         // In case not history was maintained for the device, add the current location to the history
//         if(!this.hasLocations(pingData.deviceId) || this.getLocations(pingData.deviceId).length === 0){
//             this.updateLocation(pingData.deviceId, pingData);
//             return pingData;
//         }

//         const lastPing = this.getLocations(pingData.deviceId)[this.getLocations(pingData.deviceId).length - 1];
//         pingData.jitter = this.detectJitter(pingData, lastPing);
//         pingData.accuracy = this.calculateMovementQuality(pingData);

//         // If there is jitter, then use the Kalman filter to smooth out the location data
//         // if(pingData.jitter) pingData = {...pingData, ...this.kalmanFilter(this.getLocations(pingData.deviceId), pingData)};

//         this.updateLocation(pingData.deviceId, pingData);
//         return pingData;

//     },
//     calculateMovementQuality(pingData) {
//         // Return a quality score based on various factors
//         let quality = 100;
        
//         if (pingData.jitter) quality -= 30;
//         if (pingData.gpsStatus === 0) quality -= 50;
//         if (pingData.gsm < 10) quality -= 20;
        
//         return Math.max(0, quality);
//     },
// }

module.exports = new LocationFilter;