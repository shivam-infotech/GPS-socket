const https = require('https');
const fs = require('fs');
const { Debug } = require('../utils/debug');
const express = require('express');
var cors = require('cors');

class WebSocketServer{
    __app = null; // holds the express app instance
    __httpServer = null; // holds the http server instance
    __server = null; // ws server instance
    __port = null; // port number of the server
    __host = null; // host name of the server
    __sockets = []; // holds the list of connected sockets
    __channels = []; // holds the list of available channels
    __wsDefaultOptions = {
        cors: { origin: "*" },
        secure: true
    }
    __httpDefaultOptions = {
        key: fs.readFileSync('/etc/letsencrypt/live/allits.life/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/allits.life/cert.pem'),
        ca: fs.readFileSync('/etc/letsencrypt/live/allits.life/chain.pem'),
        requestCert: false,
        rejectUnauthorized: false,
        transports: ['websocket', 'polling'],
        cors: { origin: "*" },
        credentials: true
    }

    getApp(){ return this.__app; }
    setApp(app){ this.__app = app; return this; }
    getHttpServer(){ return this.__httpServer; }
    setHttpServer(httpServer){ this.__httpServer = httpServer; return this; }
    getServer(){ return this.__server; }
    setServer(server){ this.__server = server; return this; }
    getPort(){ return this.__port; }
    setPort(port){ this.__port = port; return this; }
    getHost(){ return this.__host; }
    setHost(host){ this.__host = host; return this; }
    getSockets(){ return this.__sockets; }
    setSockets(sockets){ this.__sockets = sockets; return this; }
    getChannels(){ return this.__channels; }
    getChannel(channel) { return this.__channels[channel]; }
    setChannels(channels){ this.__channels = channels; return this; }
    setChannel(channel, namespace){ this.__channels[channel] = namespace; return this; }
    getWsDefaultOptions(){ return this.__wsDefaultOptions; }
    getHttpDefaultOptions(){ return this.__httpDefaultOptions; }

    constructor(host, port){
        this.setApp(express()).setPort(port).setHost(host); // Initating by saving the app, port and host
        this.getApp().use(cors()); // Enabling cors for all requests
        
        // Creating an instace of http server
        this.setHttpServer(https.createServer(this.getHttpDefaultOptions(), this.getApp()))

        // Creating an instance of ws server
        this.setServer(new (require('socket.io').Server)(this.getHttpServer(), this.getWsDefaultOptions()));
    }

    static init(host, port){
        return new WebSocketServer(host, port);
    }

    // Creates a new namespace connection for a channel
    createNamespace(channel){
        this.setChannel(channel, this.getServer().of(`/${channel}`));
        return this.getChannel(channel);
    }

    // Broadcasts a message to all the clients in a channel
    broadcast(channel, message, event = 'message'){
        if(this.getChannel(channel) === undefined) return ;
        this.getChannel(channel).emit(event, message);
    }

    // Listens to a channel for a message
    on(event, channel, callback){
        this.createNamespace(channel).on(event, callback);
    }

    // Listens to a channel for a connection
    onConnection(channel, callback){
        this.createNamespace(channel).on('connection', callback);
    }
    listen(){
        this.getHttpServer().listen(this.getPort(), () => {
            Debug.log(`Websocket running on ${this.getHost()}:${this.getPort()}`);
        });
    }

    // Add this new method for graceful shutdown
    async close() {
        Debug.log('Closing WebSocket server...');
        
        // Close all socket connections
        this.getSockets().forEach(socket => {
            socket.disconnect(true);
        });
        Debug.log('All socket connections closed');

        // Close the WebSocket server
        if (this.getServer()) {
            this.getServer().close();
            Debug.log('WebSocket server closed');
        }

        // Close the HTTP server
        if (this.getHttpServer()) {
            await new Promise((resolve) => this.getHttpServer().close(resolve));
            Debug.log('HTTP server closed');
        }

        Debug.log('WebSocket server shutdown complete');
        return true;
    }
}

module.exports = WebSocketServer;