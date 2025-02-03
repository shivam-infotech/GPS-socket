/**
 * 
 * --------- Base Model for all models ---------
 * It wraps up all the model modules and provides a common interface for all models.
 * 
 *  * ----- Tips to build a custom model module:
 * 1. Create a new file in the library/models folder.
 * 2. Define a class with the same name as the file. Make sure the cases should be consistent.(For example - GT06.js, GT03.js, etc.)
 * 3. Should extents the BaseModel class.
 * 4. Should create a deviceIdPattern property to extract the device id.
 * 
 * 
 * ----- Some Restrictions to follow:
 * 1. Don't access the data members (variable of the model class) directly. Use getter and setter methods to access and modify the data.
 * 
 * @module models/BaseModel
 * @author Shivam-SV <shivam.vastav33@gmail.com>
 * @version 1.0.0
 * 
 */

const { Debug } = require("../utils/debug");

class BaseModel {
    __defaultProtocol = 'noop'; // Incase the data doesn't have any protocol, use this default protocol

    getDeviceIdPattern(){ return this.__deviceIdPattern; }
    getDefaultProtocol(){ return this.__defaultProtocol; }

    getProtocols(){ return this.__protocols; }

    extractDeviceId(data) { // extract the device id from the data by using the deviceIdPattern
        const deviceId = [...data.matchAll(this.getDeviceIdPattern())][0]?.filter(m => m.length === 16);
        return deviceId ? deviceId[0] : null;
    }
}

module.exports = BaseModel;