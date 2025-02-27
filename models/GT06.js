/**
import { extract } from './../../video_trans/old/node_modules/cheerio/src/static';
 * --------- GT06 GPS Device Model ---------
 * General Device Algorithim used by most GPS devices.
 * 
 * ----- Tips to build a model module:
 * 1. Create a new file in the library/models folder.
 * 2. Define a class with the same name as the file. Make sure the cases should be consistent.(For example - GT06.js, GT03.js, etc.)
 * 3. Should extents the BaseModel class.
 * 4. Should create a deviceIdPattern property to extract the device id.
 * 5. Should implement the lookForProtocol method to extract the protocol from the device.
 * 6. Should list out all the necessary protocols and their specific Id into the __protocols property.
 *      It should be an array and follow the structure like __protocols = [ { protocolsId: ["01"], protocolName: 'login' } ]
 * 6. Should export the class with the module.exports statement. Don't add any kind of export alias as it will cause errors.
 *      For Example - module.exports.gt06 = GT06; // This will cause an error.
 * 7. Should add a function which actually checks that did the socket data belongs to the exact model or not.
 *      Typically names matchDataPattern
 * 
 * ----- Some Restrictions to follow:
 * 1. Don't access the data members (variable of the model class) directly. Use getter and setter methods to access and modify the data.
 * 
 * 
 * ----- Implementations -----
 * 1. Implemented the LBS (Location based service), which actually helps us 
 * 
 * 
 * @todo: Implement the sequencial Packet detection and handling.
 *  - The device generally sends the data in a sequence manner, we need to save the packets somewhere.
 *  - Then we need to compare the last sequence number with the current one to detect the missing packets.
 *  - parseInt(currentSetCount, 16) === (parseInt(lastCount, 16) + 1) % 256 // this will detect the missing packets.
 *  - **Note:** The sequencial count is generally a single byte (0-255), After ff (255), it will start from 0 again.
 * 
 * @todo: Fix the datetime incoming from the socket.
 * 
 * 
 * @module models/GT06
 * @author Shivam-SV <shivam.vastav33@gmail.com>
 * @version 1.0.0
 */

const mapsService = require("../services/maps.services");
const { Utils } = require("../utils/common");
const { Debug } = require("../utils/debug");
const BaseModel = require("./BaseModel");

class GT06 extends BaseModel{
    __deviceIdPattern = /^.{8}([0-9A-Fa-f]{16})/gi;
    __protocols = [
        { protocolsId: ["01"], protocolName: 'login' },
        { protocolsId: ["12", "22"], protocolName: 'ping' },
        { protocolsId: ['13'], protocolName: 'heartbeat' },
        { protocolsId: ['16', '18'], protocolName: 'alarm' },
        // { protocolsId: [''] }
        { protocolsId: ['1F'], protocolName: 'location update' }
    ];
    __authorizeString = "787805010001d9dc0d0a";
    __heartbeatString = "787805130001d9dc0d0a";
    __startingHeaders = ["7878", "7979"];
    __stoppedThreshold = 5; // Speed in km/h considered as "stopped"

    getStoppedThreshold(){ return this.__stoppedThreshold; }

    lookForProtocol(socketData){
        return this.getProtocols().find(protocol => protocol.protocolsId.includes(this.extractProtocolId(socketData)))?.protocolName || this.getDefaultProtocol();
    }
    authorizeData(){
        return new Buffer.from(this.__authorizeString, 'hex');
    }
    heartbeatData(){
        return new Buffer.from(this.__heartbeatString, 'hex');
    }
    matchDataPattern(socketData){ // typically checks the header bits of the socketData and verify that is device is GT06 or not
        return this.__startingHeaders.reduce((prev, header) => socketData.substr(0, 4) === header || prev, false);
    }
    /**
     * Extracts the different Parts of the data and also fix the geoLocations if the gps fix isn't available.
     */
    async extractPingData(socketData){
        let length = parseInt(socketData.substr(4, 2), 16)
        let parsedData = {
            start: this.extractStart(socketData),
            length: length,
            finish: this.extractFinish(socketData),
            protocolId: this.extractProtocolId(socketData),
            rawData: socketData,
            ...this.extractParts(socketData.substr(8, length * 2), this.extractProtocolId(socketData))
        } // Extracting all the available data in the socket string
        
        // @todo: Fix this part of the code as the gpsStatus isn't accurate.
        // In case the GPS fix is not available, we need to fix it using the LBS data.
        // if(parsedData.gpsStatus === 0){
        //     let location = await this.fixGeoLocations(parsedData.mcc, parsedData.mnc, parsedData.lac, parsedData.cellId);
        //     parsedData.locationType = 'approximate'
        //     if(location){
        //         parsedData.latitudeApprox = location?.lat;
        //         parsedData.longitudeApprox = location?.lng;
        //     }
        // }

        return parsedData;
    }

    async fixGeoLocations(mcc, mnc, lac, cellId){
        return await mapsService.getLocationByLbsData(mcc, mnc, lac, cellId);
    }

    extractParts(socketData, protocolId){
        return {
            type: 'ping',
            // locationType: 'accurate',
            // sequencialPacketCount: this.extractSequencialPacketCount(socketData),
            date: this.extractDate(socketData),
            latitude: this.extractLatitude(socketData),
            longitude: this.extractLongitude(socketData),
            speed: this.extractSpeed(socketData),
            orientation: this.extractOrientation(socketData),
            // power: this.extractPowerStatus(socketData),
            // gsm: this.extractGsm(socketData, protocolId),
            // alert: this.extractAlert(socketData),
            // mnc: this.extractMnc(socketData),
            // lac: this.extractLac(socketData),
            // mcc: this.extractMmc(socketData),
            // cellId: this.extractCellId(socketData),
            // deviceInfo: this.extractDeviceInfo(socketData, protocolId),
            // gpsStatus: this.extractGpsStatus(socketData, protocolId),
            // powerStatus: this.extractPowerStatus(socketData, protocolId),
            accStatus: this.extractAccStatus(socketData, protocolId),
            deviceStatus: this.extractDeviceStatus(socketData, protocolId),
        };
    }

    extractStart(socketData){ return socketData.substr(0, 4); }
    extractFinish(socketData) { return socketData.substr(6 + this.extractLength(socketData) * 2, 4); }
    extractProtocolId(socketData){ return socketData.substr(6, 2); }
    extractLength(socketData){ return parseInt(socketData.substr(4, 2), 16); }
    extractDate(socketData){ 
        const year = 2000 + parseInt(socketData.substr(0, 2), 16); // First byte: Year
        const month = parseInt(socketData.substr(2, 2), 16) - 1;   // Second byte: Month (0-based in JS)
        const day = parseInt(socketData.substr(4, 2), 16);         // Third byte: Day
        const hour = parseInt(socketData.substr(6, 2), 16);        // Fourth byte: Hour
        const minute = parseInt(socketData.substr(8, 2), 16);      // Fifth byte: Minute
        const second = parseInt(socketData.substr(10, 2), 16);     // Sixth byte: Second

        return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString();
    }
    extractSequencialPacketCount(socketData) { return parseInt(socketData.substr(12, 2), 16); }
    extractLatitudeRaw(socketData){ return socketData.substr(14, 8); }
    extractLongitudeRaw(socketData){ return socketData.substr(22, 8); }
    extractLatitude(socketData) { return parseFloat(Utils.dexToDegree(this.extractLatitudeRaw(socketData)).toFixed(6)); }
    extractLongitude(socketData) { return parseFloat(Utils.dexToDegree(this.extractLongitudeRaw(socketData)).toFixed(6)); }
    extractSpeed(socketData){ return parseInt(socketData.substr(30, 2), 16); }
    extractOrientation(socketData){ return parseInt(socketData.substr(32, 4), 16); }

    // LBS data - Use to get the Approximate Location of the device.
    extractLbs(socketData){ return socketData.substr(36, 18); }
    extractMmc(socketData) { return parseInt(this.extractLbs(socketData).substr(0, 4), 16); } // Mobile Country Code (3 bytes, identifies the country).
    extractMnc(socketData) { return parseInt(this.extractLbs(socketData).substr(4, 2), 16); } // Mobile Network Code (2 bytes, identifies the carrier).
    extractLac(socketData) { return parseInt(this.extractLbs(socketData).substr(6, 4), 16); } // Location Area Code (2 bytes, identifies the network area).
    extractCellId(socketData) { return parseInt(this.extractLbs(socketData).substr(10, 8), 16); } // Cell Tower ID (2–4 bytes, identifies the specific tower).

    extractPowerStatus(socketData) { return parseInt(socketData.substr(56, 2), 16); }
    extractGsm(socketData, protocolId) { 
        return parseInt(socketData.substr(protocolId === '13' ? 58 : 74, 2), 16);
    }
    extractAlert(socketData) { return parseInt(socketData.substr(60, 4), 16); }
    // Current Device Status (2 bytes)
    extractDeviceInfo(socketData, protocolId) { 
        return parseInt(socketData.substr(protocolId === '16' ? 50 : 54, 2), 16);
    }
    // extractGpsStatus(socketData, protocolId) { return Utils.checkBit(this.extractDeviceInfo(socketData, protocolId), 0); } // 0 Invalid / 1 Valid
    // extractOverSpeedAlarmStatus(socketData, protocolId) { return Utils.checkBit(this.extractDeviceInfo(socketData, protocolId), 1); } // 0 Normal / 1 over speed
    // extractGpsAntennaStatus(socketData, protocolId) { return Utils.checkBit(this.extractDeviceInfo(socketData, protocolId), 2); } // 0 Antenna connected / 1 Antenna disconnected
    // extractGpsRealTimeStatus(socketData, protocolId) { return Utils.checkBit(this.extractDeviceInfo(socketData, protocolId), 3); } // 0 Cached / 1 Real-time
    // extractPowerCutAlarmStatus(socketData, protocolId) { return Utils.checkBit(this.extractDeviceInfo(socketData, protocolId), 4); } // 0 Normal / 1 Power cut
    // extractChargeStatus(socketData, protocolId) { return Utils.checkBit(this.extractDeviceInfo(socketData, protocolId), 5); } // 0 Not charging / 1 Charging
    // extractAccStatus(socketData, protocolId) { return Utils.checkBit(this.extractDeviceInfo(socketData, protocolId), 7); } // 0 Not in use / 1 In use
    // extractBlockedStatus(socketData, protocolId) { return Utils.checkBit(this.extractDeviceInfo(socketData, protocolId), 7); } 

    extractPowerStatus(socketData, protocolId) { return (this.extractDeviceInfo(socketData, protocolId) & 0b10000000) } // First bit (MSB)
    extractGpsStatus(socketData, protocolId) { return (this.extractDeviceInfo(socketData, protocolId) & 0b01000000) } // Second bit
    extractAccStatus(socketData, protocolId) {
        const accStatus = (this.extractDeviceInfo(socketData, protocolId) & 0b00000010) >> 1;
        const speed = this.extractSpeed(socketData);
        
        // If device is moving (speed > 0), consider ignition as ON regardless of ACC status
        if (speed > 0) {
            return 1;
        }
        return accStatus;
    } // Seventh bit
    extractDefenceStatus(socketData, protocolId) { return (this.extractDeviceInfo(socketData, protocolId) & 0b00000001) } // Eighth bit (LSB)
    
    extractDeviceStatus(socketData, protocolId) {
        const speed = this.extractSpeed(socketData);
        const power = this.extractAccStatus(socketData, protocolId);
        const isStopped = speed <= this.getStoppedThreshold() && power <= 0;
        return isStopped ? 'stopped' : speed > this.getStoppedThreshold() ? 'running' : 'idle';
    }
}

module.exports = GT06;