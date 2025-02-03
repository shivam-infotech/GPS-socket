const Device = require('./device');
const GT06 = require('../models/GT06');
const { Debug } = require('../utils/debug');
const { getDevices } = require('../utils/api');
class Devices {
    __devices = [];
    __possibleTypoModels = {"gt06": GT06};
    __wsServer = null;
    __wsDefaultNamespace = 'device/{deviceID}';
    __wsConnections = [];

    getDevices() { return this.__devices; };
    getPossibleTypoModels() { return this.__possibleTypoModels; };
    getModel(modelName) { return this.__possibleTypoModels[modelName]; }

    getWSNamespace(){ return this.__wsDefaultNamespace; }

    setWsConnections(wsConnections) { this.__wsConnections = wsConnections; return this; }
    getWsConnections() { return this.__wsConnections; }
    setWsConnection(deviceID, wsConnection) { this.__wsConnections[deviceID] = wsConnection; return this; }
    getWsConnection(deviceID) { return this.__wsConnections[deviceID]; }

    addDevice(device, ...args) { this.__devices.push( new Device(device, ...args) ); }
    findDevice(deviceId) { return this.__devices.find(d => parseInt(d.imei) === parseInt(deviceId)); }
    removeDevice(deviceId) { this.__devices = this.__devices.filter(d => parseInt(d.imei) !== parseInt(deviceId)); }

    getWSServer() { return this.__wsServer; }
    setWSServer(wsServer) { this.__wsServer = wsServer; return this; }

    identifyDevice(socketData, socket , deviceIP, devicePort) {
        let device, model = null;
        device = this.identifyByDeviceIP(deviceIP, devicePort);
        if(!device){
            [device, model] = this.identifyBySocketData(socketData);
            device?.attachSocketInfo(socket, deviceIP, devicePort, device.imei).setModel(model);
        }

        return device;
    }
    identifyByDeviceIP(deviceIP, devicePort){
        for(let device of this.getDevices()){
            if(device.getRemoteAddress() === deviceIP && device.getRemotePort() === devicePort) return device;
        }
    }
    /**
     * Identifies the model (Like GT06, MT100) and device by extracting deviceId from socketData 
     * @param {string} socketData 
     * @returns [Device, BaseModel]
     */
    identifyBySocketData(socketData) {
        let device, model = null;
        for(let modelName in this.getPossibleTypoModels()){ // iterating over the possible typo models and Trying to get the device Id from
            let modelClass = this.getModel(modelName); // Getting the model
            let modelObj = new modelClass(); // Initializing the model object
            let deviceId = modelObj.extractDeviceId(socketData); // Extracting the deviceId from the socketData
            if(!(deviceId && this.findDevice(deviceId) && modelObj.matchDataPattern(socketData))) continue; // Skipping if deviceId not found or the Model doesn't match the socketData pattern
            device = this.findDevice(deviceId);
            if(!device) continue; // in case the device isn't found, continue to the next model
            model = modelObj;
            
        }
        return [device, model];
    }
    constructor(devices, wsServer) {
        this.setWSServer(wsServer);
        if (devices) this.buildDevices(devices);
    }

    static async init(wsServer){
        let devices = await getDevices();
        devices = await devices.json();
        if(!devices || devices.length === 0) return ;
        return new Devices(devices, wsServer);
    }

    buildDevices(devices){
        for(let device of devices){
            if(this.findDevice(device.imei)) continue;

            this.setWsConnection(device.imei, this.getWSServer().createNamespace(this.getWSNamespace().replace('{deviceID}', device.imei)));
            this.addDevice(device, this.getWsConnection(device.imei));
        }
    }

    async resyncDevices(){
        let devices = await getDevices();
        devices = await devices.json();
        if(!devices || devices.length === 0) return false;
        this.buildDevices(devices);
        return true;
    }

    cleanup(){
        delete this.getDevices();
    }
}

module.exports = Devices;