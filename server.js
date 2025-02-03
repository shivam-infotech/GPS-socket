/**
 * Elements to work on for this library
 * 
 * Server - An TCP connecter (net package in Node.js)
 * Devices - A class which holds all the devices and their properties and methods to manage them.
 * Device - A device instance which will helps to parse Socket data, manage the connection, Manage backend device data and other device operations.
 * Models - A class which actually helps to understand and decode the data from the socket.
 * EventHandler - Emits and listen out the multiple events on the different classes.
 *  
 * 
 * Socket Server - An Server that Emits the events on the particular channels of the device
*/


const TcpServer = require('./servers/tcp-server');
const { getDevices } = require("./utils/api");
const Devices = require('./devices/devices');
const { Debug } = require('./utils/debug');
const WebSocketServer = require('./servers/ws-server');

const Server = {
    // Adapter classes which are use inside the server working
    __deviceServerHandler: TcpServer,
    __deviceServer: null,
    __defaultDeviceServerEvents: {data: 'onData', 'end-connection': 'onEndConnection'},
    
    __devicesHandler: Devices,
    __devices: null,

    __wsServerHandler: WebSocketServer,
    __wsServer: null,

    getDeviceHandler() { return this.__devicesHandler },
    getDeviceServerHandler() { return this.__deviceServerHandler },
    getDeviceServer() { return this.__deviceServer },
    getDevices() { return this.__devices },
    getDefaulDeviceServerEvents() { return this.__defaultDeviceServerEvents },

    setDeviceServer(server) { this.__deviceServer = server; return this; },
    setDevices(devices) { 
        if(Array.isArray(devices)) devices = new Devices(devices);
        this.__devices = devices;
        return this;
    },
    setWebSocketServer(server) { this.__wsServer = server; return this; },
    getWebSocketServer() { return this.__wsServer },
    getWebSocketServerHandler() { return this.__wsServerHandler },

     // Initializes the server and devices.
    async init(){
        Debug.log("------- Initiating the Server -------")
        this.setWebSocketServer(this.__wsServerHandler.init(process.env.WS_HOST, process.env.WS_PORT));

        // Getting the devices from the API and initializing the Devices class.
        this.setDevices(await this.getDeviceHandler().init(this.getWebSocketServer()));

        // Initailizing the TCP Server and attaching the events to it.
        this.setDeviceServer(this.__deviceServerHandler.init(process.env.TCP_HOST, process.env.TCP_PORT));
        this.attachServerEvents();

        Debug.log("------- Initiating Completed -------")
        return this;
    },

    attachServerEvents(){ // Mapping over the default events and attaching the methods to them.
        for(let event in this.getDefaulDeviceServerEvents()){
            this[this.getDefaulDeviceServerEvents()[event]].bind(this); // Binding this with the callbacks to preserve the this context for them.
            this.getDeviceServer().on(event, (...args) => this[this.getDefaulDeviceServerEvents()[event]](...args) )
        }
        return this;
    },onData(data, socket, remoteAddr, remotePort){        
        let device = this.getDevices().identifyDevice(data, socket, remoteAddr, remotePort);
        if(!device) return ;
        protocol = device.lookForProtocol(data);
        device.emit(protocol, data);
    },onEndConnection(socket, remoteAddr, remotePort){
        let device = Server.getDevices().identifyByDeviceIP(remoteAddr, remotePort);
        if(device) device.emit('end-connection', socket);
    },

    startServer(){ // Starts the TCP Server
        Debug.log("------- Starting the Both (TCP, WS) Server -------")
        this.getDeviceServer().listen();
        this.getWebSocketServer().listen();
        return this;
    },

    // Utility methods to used over the app
    async resyncDevices(){
        return await this.getDevices().resyncDevices();
    },

    // Add this new method for graceful shutdown
    async stopServer() {
        Debug.log("------- Stopping Servers Gracefully -------");
        
        // Close WebSocket server if exists
        if (this.getWebSocketServer()) {
            this.getWebSocketServer().close();
            Debug.log("WebSocket server closed");
        }

        // Close TCP server if exists
        if (this.getDeviceServer()) {
            this.getDeviceServer().close();
            Debug.log("TCP server closed");
        }

        // Clean up devices if needed
        if (this.getDevices()) {
            await this.getDevices().cleanup();
            Debug.log("Devices cleaned up");
        }

        Debug.log("------- Servers Stopped Gracefully -------");
        return true;
    }
}

module.exports = Server;