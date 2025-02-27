const { Utils } = require('../utils/common');

/**
 * ---------- TCP Server Class ----------
 * 
 * Used to create a TCP server and listen for incoming connections.
 * 
 * @author Shivam-SV
 * @version 1.0.0
 */

const { EventHandler } = require('../events/event-handler');
const { Debug } = require('../utils/debug');

/**
 * @event data - data received from the client
 * @event end-connection - connection with the client is terminated
 */
class TcpServer extends EventHandler {
    __server = null; // Holds the actual TCP server Instance
    __sockets = []; // Holds all the active sockets, that are emitting the data
    __port = 8080;
    __host = 'localhost';
    __connector = require('net')

    setServer(server) { this.__server = server; return this; }
    getServer() { return this.__server; }

    setSockets(sockets) { this.__sockets = sockets; return this; }
    setSocket(socket, key) { this.__sockets[key] = socket; return this; }
    getSockets() { return this.__sockets; }
    getSocket(key) { return this.__sockets[key]; }
    removeSocket(key) { delete this.__sockets[key]; return this; }
    activeSockets() { return this.getSockets(); }

    events() { return this.__eventHandler; }
    
    getPort() { return this.__port; }
    setPort(value) { this.__port = value; return this; }

    getHost() { return this.__host; }
    setHost(value) { this.__host = value; return this; }

    getConnector() { return this.__connector; }
    setConnector(value) { this.__connector = value; return this; }
    
    constructor(host = 'localhost',port = null){
        super();
        if(host) this.setHost(host);
        if(port) this.setPort(port);
        Debug.log('--------- New TCP Srver Initating ---------');
        this.setServer(this.getConnector().createServer((socket) => {
            Debug.log("New connection from " + socket.remoteAddress + ":" + socket.remotePort);
            socket.setKeepAlive(true, 10000); // making the connection auto awake after 60 secs
            this.onConnection(socket, socket.remoteAddress, socket.remotePort);
        }))
    }
    
    onConnection(socket, remoteAddr, remotePort) {
        this.setSocket(socket, remoteAddr + ':' + remotePort);
        socket.on('data', (data) => {
            data = Utils.decryptDeviceData(data);
            this.onData(data, socket, remoteAddr, remotePort)
        });
        socket.on('end', () => this.onEndConnection(socket, remoteAddr, remotePort))
        socket.on('error', (error, remoteAddr, remotePort) => this.onError(error, remoteAddr, remotePort));
    }
    
    onData(data, socket, remoteAddr, remotePort){
        this.emit('data', data, socket, remoteAddr, remotePort);
    }

    onEndConnection(socket, remoteAddr, remotePort) {
        this.removeSocket(remoteAddr + ':' + remotePort);
        this.emit('end-connection', socket, remoteAddr, remotePort);
        Debug.log(`Connection Ending `,`${remoteAddr}:${remotePort} `);
    }

    onError(error, remoteAddr, remotePort){
        Debug.log(`Error occurred in `,`${remoteAddr}:${remotePort} ` ,error.message);
    }

    static init(host, port){
        return new TcpServer(host, port);
    }

    listen(onListenCallback = null){
        this.getServer().listen(this.getPort(), this.getHost(), () => {
            Debug.log('TCP Server listening on', this.getHost() + ':' + this.getPort());
            if(onListenCallback) onListenCallback()
        });
    }

    // Add this new method for graceful shutdown
    async close() {
        Debug.log('Closing TCP server...');
        
        // Close all active socket connections
        Object.values(this.getSockets()).forEach(socket => {
            socket.destroy();
        });
        Debug.log('All socket connections closed');

        // Close the TCP server
        if (this.getServer()) {
            await new Promise((resolve) => this.getServer().close(resolve));
            Debug.log('TCP server closed');
        }

        Debug.log('TCP server shutdown complete');
        return true;
    }
}

module.exports = TcpServer;