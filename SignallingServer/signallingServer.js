const express = require('express');
const app = express();
const port = 8042;
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');

const onClientConnection = require("./wsClient");
const clientServer = new WebSocket.Server({ server: server });
clientServer.on('connection', onClientConnection);
console.log(`WebSocket listening to Client connections on *:${port}`);

server.listen(port, () => {
	console.log(`Signalling Server: READY`);
});
