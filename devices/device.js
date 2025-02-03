const { EventHandler } = require("../events/event-handler");
const { saveTrackingData } = require("../services/tracking.service");
const { Debug } = require("../utils/debug");

/**
 * --------- Device Handler Class ---------
 * 
 * Manages both the Backend device data and socket device data and
 * receives the upcoming data from socket, parse it from the model class and
 * expose the parsed data to the webSocket client.
 * 
 * @todo: implement address fetching api
 *  -- URL for API: https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}}&key=${API_KEY}
 * 
 * @todo: implement device last status updated at param in socket data
 * 
 */
const InvalidDataFilter = require('../filters/invalid-data.filter');
const TemporalFilter = require('../filters/temporal.filter');
const MovementFilter = require("../filters/movement.filter");
const { saveEvent } = require("../services/event.service");

class Device extends EventHandler {
    // Connection information of the device from TCP server
    __socket = null;
    __remoteAddress = null;
    __remotePort = null;
    __deviceId = null;
    // __locationFilter = require('../services/location-filter.service');
    __model = null; // Hold the parser model class like "GT06"
    __applicableFilters = [
        InvalidDataFilter,
        TemporalFilter,
        MovementFilter
    ]; // Hold the list of filters that can be applied to the device data
    __history = []; // Hold the device data history device wise
    __maxHistoryLength = 10; // Maximum number of history data to store device wise

    // Device Status to check the device status
    __isConnected = false;
    __isActive = false;
    __acceptableStatus = ["online", "idle", "running", "stopped", "offline", "nodata"];
    __currentStatus = "nodata"; // online, offline, idle, running, stopped, nodata
    __currentStatusChangedAt = null; // saves the last status change datetime

    __wsNamespace = null; // Hold the list of webSocket Namespaces
    __wsClients = []; // Hold the list of webSocket clients subscribed by the device
    __wsTopics = {ping: 'ping', connect: 'device-connect', disconnect: 'device-disconnect', heartbeat: 'onHeartBeat'}; // Hold the list of webSocket topics

    __defaultEvents = {login: 'onAuthRequest', ping: 'onPing', disconnect: 'onDisconnect'}

    getSocket() { return this.__socket; }
    setSocket(socket) { this.__socket = socket; return this; }
    getRemoteAddress() { return this.__remoteAddress; }
    setRemoteAddress(address) { this.__remoteAddress = address; return this; }
    getRemotePort() { return this.__remotePort; }
    setRemotePort(port) { this.__remotePort = port; return this; }

    getDeviceId() { return this.__deviceId; }
    setDeviceId(id) { this.__deviceId = id; return this; }
    // getLocationFilter() { return this.__locationFilter; }
    getIsConnected() { return this.__isConnected; }
    setIsConnected(isConnected) { this.__isConnected = isConnected; return this; }

    getHistory() { return this.__history; }
    setHistory(history) { this.__history = history; return this; }
    updateHistory(data) {
        if(this.__history.length >= this.__maxHistoryLength) this.__history.shift();
        this.__history.push(data);
        return this;
    }

    getHistoryLength() { return this.__maxHistoryLength; }
    setHistoryLength(length) { this.__maxHistoryLength = length; return this; }

    getApplicableFilters() { return this.__applicableFilters; }
    setApplicableFilters(filters) { this.__applicableFilters = filters; return this; }
    checkFilters(data) {
        let checks = {};
        let isCompatible = true;
        for(let filter of this.getApplicableFilters()){
            var instance = filter.init(data, this.getHistory());
            checks = {...checks, ...instance.detect()};
            isCompatible = isCompatible && instance.check(checks);
        }

        data.checks = checks;
        data.isCompatible = isCompatible;
        return data;
    }
    filterData(data){
        let isCompatible = true;
        if(data.checks.length > 0){
            for(let filter of this.getApplicableFilters()){
                isCompatible  = isCompatible && filter.init().check(data.checks);
            }
            return isCompatible;
        }
        return true;
    }
    getIsActive() { return this.__isActive; }
    setIsActive(isActive) { this.__isActive = isActive; return this; }

    getCurrentStatus() { return this.__currentStatus; }
    setCurrentStatus(status) {
        if(this.__acceptableStatus.includes(status)) this.__currentStatus = status;
        return this;
    }
    getStatusChangedAt() { return this.__currentStatusChangedAt; }
    setStatusChangedAt(date) { this.__currentStatusChangedAt = date; return this; }

    getDefaultEvents() { return this.__defaultEvents; }
    setDefaultEvents(events) { this.__defaultEvents = events; return this; }

    setModel(model) { this.__model = model; return this; }
    getModel() { return this.__model; }

    getWsNamespace() { return this.__wsNamespaces; }
    setWsNamespace(Namespace) { this.__wsNamespaces = Namespace; return this; }

    getWsClients() { return this.__wsClients; }
    setWsClients(clients) { this.__wsClients = clients; return this; }
    setWsClient(clients) { this.__wsClients.push(clients); return this; }

    getWsTopics() { return this.__wsTopics; }
    getWsTopic(topicName) { return this.__wsTopics[topicName]; }

    attachSocketInfo(socket, remoteAddress, remotePort, deviceId){
        this.setSocket(socket).setRemoteAddress(remoteAddress).setRemotePort(remotePort).setDeviceId(deviceId);
        return this;
    }
    attachEvents(){
        for(let event in this.getDefaultEvents()){
            this[this.getDefaultEvents()[event]].bind(this);
            this.on(event, (...args) => this[this.getDefaultEvents()[event]](...args) );
        }
    }
    bindWsConnections(socketNamespace){
        socketNamespace.on('connection', (client) => this.setWsClient(client));
        this.setWsNamespace(socketNamespace);
    }
    lookForProtocol(data){
        return this.getModel().lookForProtocol(data);
    }
    attachBasicInfoWithPingData(data){
        return {
            ...data,
            deviceId: this.getDeviceId(),
            ip: this.getRemoteAddress(),
            port: this.getRemotePort(),
            accuracy: this.calculateMovementQuality(data),
        };
    }
    calculateMovementQuality(pingData) {
        let accuracy = 100; // Best accuracy starts at 100%

        if (pingData.gpsStatus === 0) accuracy -= 50;
        const gsmSignal = pingData.gsm || 0;
        accuracy -= (100 - gsmSignal); // Adjust for GSM signal strength
        if (pingData.speed === 0 ) accuracy -= 20;

        return Math.max(0, Math.min(accuracy, 100));
    }
    attachLastStatusAndChangedTime(pingData){
        if(pingData.deviceStatus === this.getCurrentStatus()){
            if(!this.getStatusChangedAt()) this.setStatusChangedAt(pingData.date);
        }else{
            this.setCurrentStatus(pingData.deviceStatus);
            this.setStatusChangedAt(pingData.date);
        }
        pingData.statusChangedAt = this.getStatusChangedAt();
        return pingData;
    }
    constructor(deviceInfo, socketNamespaces){ // all device info from Backend server will be passed as an object
        super();
        for(let key in deviceInfo) this[key] = deviceInfo[key];
        this.attachEvents();
        this.bindWsConnections(socketNamespaces);
    }

    // Event functions that will be triggered by the socket data

    onAuthRequest(data){ //when ever the device ask for authentication, It sends the authorization bits to the device
        this.getSocket().write(this.getModel().authorizeData());
        this.getWsNamespace().emit(this.getWsTopic('connect'), {'message': "Device connected"});
        this.setIsConnected(true)
        saveEvent('connected', null, this.getDeviceId(), new Date().toISOString());
    }
    async onPing(data){
        let pingData = this.attachBasicInfoWithPingData(await this.getModel().extractPingData(data))
        pingData = this.attachLastStatusAndChangedTime(pingData); // Attach the last status and changed time to the ping data
        
        pingData = this.checkFilters(pingData); // Applying the applicable filters to the ping data
        if(pingData.isCompatible){ // if the data qualifies for the filters, then it will be broadcasted to the clients
            this.updateHistory(pingData); // Updating the history of the device
            this.getWsNamespace().emit(this.getWsTopic('ping'), pingData); // Broadcasting the ping data to all the clients subscribed to the 'ping' namespace
            const trackings = await saveTrackingData(pingData) // Saving Tracking Data

            // Identifying events and storing it into DB
            this.saveEventAndInform(pingData, trackings);
        }
    }
    async onAlarm(data){
        const pingData = await this.getModel().extractPingData(data)
        pingData.type = 'alarm';
        
    }
    onHeartBeat(){
        Debug.log("Heartbeat by: ", this.getDeviceId());
        this.getSocket().write(this.getModel().heartbeatData());
    }
    onDisconnect(socket){
        this.getWsNamespace().emit(this.getWsTopic('disconnect'), {'message': "Device disconnected"});
        this.setIsConnected(false);
        saveEvent('disconnected', null, this.getDeviceId(), new Date().toISOString());
    }
    /**
     * 
     * @param {*} pingData - Data from the device
     * @param {*} tracking - Saved model data from trackings table.
     */
    saveEventAndInform(pingData, tracking){
        const lastCoords = this.getHistory()[this.getHistory().lenght - 1];
        const data = {
            eventType: null,
            trackingId: tracking.id,
            deviceId: this.getDeviceId(),
            date: pingData.date
        };
        if(pingData.accStatus && !lastCoords.accStatus) data.eventType = 'ignition-on';
        else if(!pingData.accStatus && lastCoords.accStatus) data.eventType = 'ignition-off';
        else if(pingData.deviceStatus === 'running' && lastCoords.deviceStatus !== 'running') data.eventType = 'device-running';
        else if(pingData.deviceStatus === 'stopped' && lastCoords.deviceStatus !== 'stopped') data.eventType = 'device-stopped';
        else if(pingData.deviceStatus === 'idle' && lastCoords.deviceStatus !== 'idle') data.eventType = 'device-idle';

        if(data.eventType){
            saveEvent(data.eventType, data.trackingId, data.deviceId, data.date);
            this.getWsNamespace().emit(this.getWsTopic('event'), {
                event: data.eventType,
                ...pingData,
                type: 'event'
            });
        }
    }
}   
module.exports = Device;