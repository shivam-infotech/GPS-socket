/**
 * Movement filter
 * @purpose - Filter out the invalid movement of the device and indicates the having a quality movement or not.
 * 
 * It cavers 3 types of filters
 * 1. Invalid location data filter - Latitude or longitude is out of range (latitude < -90 or > 90, longitude < -180 or > 180).
 * 2. Zero location data filter - latitude or longitude is zero.
 * 3. Repeating location data filter - the same location data is received multiple times in a short period of time
 * 
 * @implementation - make sure to implement the detect, init, check function to filter the data
 */

const { Utils } = require("../utils/common");
const { Debug } = require("../utils/debug");
const BaseFilter = require("./base.filter");

class MovementFilter extends BaseFilter {
    minDistance = 10; // A device can move at least 10 meters in a minute.
    maxDistance = 500; // A device can move at most 1000 meters in a minute.
    constructor(data, history) {super(data, history)}

    static init(...params){
        return new MovementFilter(...params);
    }
    detect() {
        const lastData = this.history[this.history.length - 1];
        if(lastData) {
            const distance = Utils.getDistance(lastData.latitude, lastData.longitude, this.data.latitude, this.data.longitude);
            return {
                isLessThanMinDistance: this.isLessThanMinDistance(distance),
                isGreaterThanMaxDistance: this.isGreaterThanMaxDistance(distance),
                distance
            }
        }
        
        return {
            isLessThanMinDistance: false,
            isGreaterThanMaxDistance: false,
            distance: 0
        }
    }
    check(checks){
        return !checks.isLessThanMinDistance && !checks.isGreaterThanMaxDistance;
    }

    isLessThanMinDistance(distance) {
        return distance < this.minDistance;
    }
    isGreaterThanMaxDistance(distance) {
        return distance > this.maxDistance;
    }
}

module.exports = MovementFilter;