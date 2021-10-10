const express = require('express');
const app = express();
const port = 8042;
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');

let clients = new Map(); // <clientID, clientInfo>, Map to each client and they'r websocket
let nextClientId = 100; // incrementable ID

///////////////////////////////////////////////////////////////////////////////
//	PixelStreaming STREAMER

const streamerPort = 8888;
let streamerServer = new WebSocket.Server({ port: streamerPort, backlog: 1 });
console.log(`WebSocket listening to Streamer connections on *:${streamerPort}`);
let streamer; // streamer websocket
let streamIP;

streamerServer.on('connection', function (ws, req) {
	streamIP = req.socket.remoteAddress.replace("::ffff:", "");
	console.log(`** WS:\tStreamer:\tConnected (${streamIP})`);

	ws.on('message', function (msg) {
		console.log(`** WS:\t<-- Streamer:\tMessage received.`);

		// Parse JSON msg, if not close stream 
		try {
			msg = JSON.parse(msg);
		} catch (err) {
			console.error(`Cannot parse Streamer message: ${msg}\nError: ${err}`);
			streamer.close(1008 /* Policy violation */, "Cannot parse msg");
			return ;
		}

		console.log('== ', msg);

		// Respond "pong" if "ping" received
		if (msg.type === "ping") {
			streamer.send(`{ "type": "pong", "time": ${msg.time} }`);
			return ;
		}

		// get message recipient, if does'nt exist drop the message
		let clientId = msg.playerId;
		delete msg.playerId;
		let client = clients.get(clientId);
		if (!client) {
			console.error(`** WS:\tStreamer:\tDropped message:\t${msg.type} as the player ${clientId} is not found`);
			return ;
		}

		// Dispatch
		if (msg.type === "answer" || msg.type === "iceCandidate")
			client.ws.send(JSON.stringify(msg));
		else if (msg.type === "disconnectPlayer")
			client.ws.close(1011 /* Server Error */, msg.reason);
		else
		{
			console.error(`** WS:\tStreamer ${clientId}:\tUnsuported message type:\t${msg.type}`);
			streamer.close(1008 /* Policy violation */, "Unsupported message type");
		}
	});

	function	onStreamerDisconected(code, reason)
	{
		// Disconnect all clients
		let clientMap = new Map(clients);

		for (let client of clientMap.values())
			client.ws.close(code, reason);

		console.log('STREAMING IS CLOSING');

	}

	ws.on('close', function (code, reason) {
		console.log(`** WS:\tStreamer:\tConnection closed:\t${code} - ${reason}`);
		onStreamerDisconected(code, reason);
	});

	ws.on('error', function (error) {
		console.log(`** WS:\tStreamer:\tConnection error:\t${error}`);
		streamer.close(1006 /* abnormal closure */, error);
		onStreamerDisconected(error, `Streamer Error`);
	});

	streamer = ws;
});

///////////////////////////////////////////////////////////////////////////////
//	PixelStreaming CLIENT

let clientServer = new WebSocket.Server({ server: server });
console.log(`WebSocket listening to Client connections on *:${port}`);

clientServer.on('connection', function (ws, req) {

	console.log('client connected');
	
	if (!streamer || streamer.readyState != 1 /* open */) {
		ws.close(1013/* Try again later */, `Streamer is not connected/ready`);
		return ;
	}

	// Add new client to the list
	let clientId = ++nextClientId;
	clients.set(clientId, {ws: ws, id: clientId});
	console.log(`** WS:\t<-- Client ${clientId}:\tConnected (${req.socket.remoteAddress})`);

	ws.on('message', function (msg) {
		console.log(`** WS:\t<-- Client ${clientId}:\tMessage received.`);

		// Parse JSON msg, if not close stream 
		try {
			msg = JSON.parse(msg);
		} catch (err) {
			console.error(`Cannot parse Streamer message: ${msg}\nError: ${err}`);
			streamer.close(1008 /* Policy violation */, "Cannot parse msg");
			return ;
		}

		console.log('== ', msg);

		// dispatch based on msg.type value
		if (msg.type === "offer") {
			console.log(`** WS:\t<-- Client ${clientId}:\toffer`);
			msg.playerId = clientId;
			streamer.send(JSON.stringify(msg));
		}
		else if (msg.type === "iceCandidate") {
			console.log(`** WS:\t<-- Client ${clientId}:\tIceCandidate`);
			msg.playerId = clientId;
			streamer.send(JSON.stringify(msg));
		}
		else {
			console.error(`** WS:\tClient ${clientId}:\tUnsuported message type:\t${msg.type}`);
			ws.close(1008/* Custom kick */, "kicked");
			return ;
		}
	});

	function	sendPlayerCount() {
		for (let currentClient of clients.values())
			currentClient.ws.send(`{ "type": "clientCount", "count": ${clients.size} }`);
	}

	function	onPlayerDisconnected() {
		clients.delete(clientId);
		streamer.send(`{ "type": "playerDisconnected", "playerId": ${clientId} }`);
		sendPlayerCount();
	}

	ws.on('close', function (code, reason) {
		console.log(`** WS:\tClient ${clientId}:\tConnection closed:\t${code} - ${reason}`);
		onPlayerDisconnected();
	});

	ws.on('error', function (error) {
		console.log(`** WS:\tClient ${clientId}:\tConnection error:\t${code} - ${reason}`);
		ws.close(1006/* abnormal closure */, error);
		onPlayerDisconnected();
	});

	// Allow stream to be see from the outside of your network (just specified the streamIP int the turn) 
	let peerConnectionOptions = JSON.stringify({
		iceServers: [{
				urls: ["stun:stun.l.google.com:19302", `turn:${streamIP}:19303`],
				username: "PixelStreamingUser",
				credential: "Another TURN in the road"
			}]
	});
	ws.send(`{ "type": "ConnectionCallback", "peerConnectionOptions": ${peerConnectionOptions} }`);

	sendPlayerCount();
});

server.listen(port, () => {
	console.log(`listening on *:${port}`);
});
