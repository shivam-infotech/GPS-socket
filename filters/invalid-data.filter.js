/**
 * Invalid data filter
 * @purpose - Filter out the false data from the GPS devices
 * 
 * It cavers 3 types of filters
 * 1. Invalid location data filter - Latitude or longitude is out of range (latitude < -90 or > 90, longitude < -180 or > 180).
 * 2. Zero location data filter - latitude or longitude is zero.
 * 3. Repeating location data filter - the same location data is received multiple times in a short period of time
 * 
 * @implementation - make sure to implement the detect, init, check function to filter the data
 */
const BaseFilter = require('./base.filter');

class InvalidDataFilter extends BaseFilter {

    constructor(data, history) {
        super(data, history);
    }

    static init(...params){
        return new InvalidDataFilter(...params);
    }

    detect() {
         return {
            isValid: !this.isInvalidLocationData(this.data),
            isZero: this.isZeroLocationData(this.data),
            isRepeating: this.isRepeatingLocationData(this.data, this.history)
         }
    }
    check(checks){
        return checks.isValid && !checks.isZero && !checks.isRepeating;
    }

    isInvalidLocationData(data) {
        // check if the latitude or longitude is out of range
        return data.latitude < -90 || data.latitude > 90 || data.longitude < -180 || data.longitude > 180 ? true: false;
    }
    isZeroLocationData(data) {
        // check if the latitude or longitude is zero
        return data.latitude === 0 || data.longitude === 0;
    }
    isRepeatingLocationData(data, history) {
        // check if the same location data is received multiple times in a short period of time
        const lastData = history[Object.keys(history)[Object.keys(history).length - 1]];
        return lastData && lastData.latitude === data.latitude && lastData.longitude === data.longitude && (new Date().getTime() - lastData.timestamp) < 1000;
    }
}

module.exports = InvalidDataFilter;