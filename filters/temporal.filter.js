/**
 * Temporal filter
 * @purpose - Deals with the time based filtering of data
 * 
 * It covers the 2 types of filtering:
 * 1. Time duplication data - When the data received with the same timestamp twice, thrice or multiple times.
 * 2. Outdated data - When the received data is older than the previous data received.
 * 
 * @implementation - make sure to implement the detect function to filter the data
 * 
 * @param {Object} data - The data received from the client
 * @param {Object} history - The history of the data received from the client
 * 
 */

const { Debug } = require('../utils/debug');
const BaseFilter = require('./base.filter');
class TemporalFilter extends BaseFilter {
    constructor(data, history){ super(data, history); }

    static init(...params){
        return new TemporalFilter(...params);
    }

    detect(){
        return {
            isDuplicate: this.isDuplicateTime(this.data, this.history),
            isOutdated: this.isOutdatedData(this.data, this.history)
        }
    }
    check(checks){
        return !checks.isDuplicate && !checks.isOutdated;
    }

    isDuplicateTime(data, history){
        // Check if the data received with the same timestamp twice, thrice or multiple times.
        const lastData = history[history.length - 1];
        return lastData ? new Date(data.date).getTime() === new Date(lastData.date).getTime() : false;
    }

    isOutdatedData(data, history){
        // Check if the received data is older than the previous data received.
        const lastData = history[history.length - 1];
        return lastData ? ((new Date(data.date).getTime()) < (new Date(lastData.date).getTime())) : false;
    }
}

module.exports = TemporalFilter;