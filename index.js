require('dotenv').config();
const DeviceServer = require('./server');
const express = require('express');
const http = require('http');
const { Debug } = require('./utils/debug');
const cors = require('cors');
const fs = require('fs');
require('./database/database');

const app = express();
const appServer = http.createServer(app);
// const appServer = https.createServer(app, {
//     key: fs.readFileSync('/etc/letsencrypt/live/allits.life/privkey.pem'),
//     cert: fs.readFileSync('/etc/letsencrypt/live/allits.life/cert.pem'),
//     ca: fs.readFileSync('/etc/letsencrypt/live/allits.life/chain.pem')
// });

app.use(express.json());
app.use(cors({ origin: "*" }));

app.use('/api/v1', require('./routes/api').apis);

appServer.listen(process.env.APP_PORT,process.env.APP_HOST ,() => {
    Debug.log(" API Server Running at the PORT: ", process.env.APP_PORT);
});

DeviceServer.init().then(function(){
    DeviceServer.startServer();
});

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
    Debug.log('Shutting down gracefully...');
    
    try {
        // Close the HTTP server
        await new Promise((resolve) => appServer.close(resolve));
        Debug.log('HTTP server closed');
        
        // Close the DeviceServer if it has a stop method
        if (DeviceServer.stopServer) {
            await DeviceServer.stopServer();
            Debug.log('DeviceServer closed');
        }
        
        process.exit(0);
    } catch (err) {
        Debug.error('Error during shutdown:', err);
        process.exit(1);
    }
}