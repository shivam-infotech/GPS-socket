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
const Server = require('../server');

/**
 * @event data - data received from the client
 * @event end-connection - connection with the client is terminated
 */
class TcpServer extends EventHandler {
    __server = null; // Holds the actual TCP server Instance
    __sockets = []; // Holds all the active sockets, that are emitting the data
    __port = 8080;
    __host = 'localhost';
    __connector = require('net');
    __monitorInterval = null;

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

            // Improving connection stability
            socket.setKeepAlive(true, 30000); // making the connection auto awake after 60 secs
            socket.setTimeout(60000); // Add a 60-second timeout

            // Binding events
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
        socket.on('error', (error) => this.onError(error, remoteAddr, remotePort));
        socket.on('timeout', () => {
            Debug.log(`Connection timeout for ${socket.remoteAddress}:${socket.remotePort}`);
            socket.end();
        });
        this.startPumpingHeartbeat(socket, remoteAddr, remotePort);
    }
    /**
     * Creating a heartbeat pump to keep the connection alive
     */
    startPumpingHeartbeat(socket, remoteAddr, remotePort){
        // Start a heartbeat interval
        const heartbeatInterval = setInterval(() => {
            if (socket.destroyed) {
                clearInterval(heartbeatInterval);
                return;
            }
            
            // Check if socket is still writable
            if (socket.writable) {
                try {
                    // For GT06 devices, you can use the heartbeat data
                    const model = Server.getDevices().identifyModelByDeviceIP(remoteAddr, remotePort);
                    if (model && typeof model.heartbeatData === 'function') {
                        socket.write(model.heartbeatData());
                    }
                } catch (err) {
                    Debug.log(`Heartbeat error for ${remoteAddr}:${remotePort}`, err.message);
                    socket.destroy();
                    clearInterval(heartbeatInterval);
                }
            } else {
                socket.destroy();
                clearInterval(heartbeatInterval);
            }
        }, 45000); 
    }

    startConnectionMonitoring() {
        // Check for stale connections every 5 minutes
        this.__monitorInterval = setInterval(() => {
            const sockets = this.getSockets();
            const now = Date.now();
            
            Object.entries(sockets).forEach(([key, socket]) => {
                // If the socket has a lastActivity timestamp and it's been inactive for too long
                if (socket.lastActivity && (now - socket.lastActivity > 300000)) { // 5 minutes
                    Debug.log(`Closing stale connection: ${key} (inactive for ${Math.round((now - socket.lastActivity)/1000)}s)`);
                    socket.destroy();
                    this.removeSocket(key);
                }
            });
            
            Debug.log(`Connection monitor: ${Object.keys(sockets).length} active connections`);
        }, 300000); // Run every 5 minutes
        
        return this;
    }
    
    onData(data, socket, remoteAddr, remotePort){
        // Update last activity timestamp
        const socketKey = remoteAddr + ':' + remotePort;
        const existingSocket = this.getSocket(socketKey);
        if (existingSocket) {
            existingSocket.lastActivity = Date.now();
        }
        this.emit('data', data, socket, remoteAddr, remotePort);
    }

    onEndConnection(socket, remoteAddr, remotePort) {
        this.removeSocket(remoteAddr + ':' + remotePort);
        this.emit('end-connection', socket, remoteAddr, remotePort);
        Debug.log(`Connection Ending `,`${remoteAddr}:${remotePort} `);
    }

    onError(error, remoteAddr, remotePort){
        Debug.log(`Error occurred in `,`${remoteAddr}:${remotePort} ` ,error.message);

        // Clean up socket on error
        const socketKey = remoteAddr + ':' + remotePort;
        const socket = this.getSocket(socketKey);
        
        if (socket && !socket.destroyed) {
            socket.destroy();
        }
        
        this.removeSocket(socketKey);
        
        // If it's a timeout error, we might want to try reconnecting
        if (error.code === 'ETIMEDOUT') {
            Debug.log(`Connection timed out for ${remoteAddr}:${remotePort}, cleaning up resources`);
        }
    }

    static init(host, port){
        return new TcpServer(host, port);
    }

    listen(onListenCallback = null){
        this.getServer().listen(this.getPort(), this.getHost(), () => {
            Debug.log('TCP Server listening on', this.getHost() + ':' + this.getPort());
            this.startConnectionMonitoring();
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