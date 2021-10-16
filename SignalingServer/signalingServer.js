const express = require('express');
const app = express();
const port = 8042;
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');

let rooms = new Map(); // <RoomId, ClientArray>

///////////////////////////////////////////////////////////////////////////////
//	PixelStreaming CLIENT

let clientServer = new WebSocket.Server({ server: server });
console.log(`WebSocket listening to Client connections on *:${port}`);

clientServer.on('connection', function (webSocket, req) {
	const urlOrigin = new URL(`${req.headers.origin}${req.url}`);
	const roomId = urlOrigin.searchParams.get("roomid");

	// Add new client to the list
	let roomPeers = null;
	let clientId = 0;

	if (rooms.has(roomId)) {
		roomPeers = rooms.get(roomId);
		clientId = roomPeers.size;

		roomPeers.set(clientId, { id: clientId, ws: webSocket });
		rooms.set(roomId, roomPeers);
	}
	else {
		console.log(`** WS:\tCreate new room: ${roomId}`);

		const newMap = new Map();
		newMap.set(clientId, { id: clientId, ws: webSocket });
		rooms.set(roomId, newMap);
	}
	console.log(`** WS:\tRoom_${roomId}:\tNew client_${clientId}:\t${req.headers.origin}`);

	webSocket.on('message', function (msg) {
		console.log(`Room_${roomId}:\t<-- Client_${clientId}:\tMessage received.`);

		// Parse JSON msg, if not close stream
		try {
			msg = JSON.parse(msg);
		} catch (err) {
			console.error(`Cannot parse message: ${msg}\nError: ${err}`);
			ws.close(1008 /* Policy violation */, "Cannot parse msg");
			return ;
		}
		console.log('== ', msg);

		// dispatch based on msg.type value
		// if (msg.type === "offer") {
		// 	console.log(`** WS:\t<-- Client ${clientId}:\toffer`);
		// 	msg.playerId = clientId;
		// 	streamer.send(JSON.stringify(msg));
		// }
		// else if (msg.type === "iceCandidate") {
		// 	console.log(`** WS:\t<-- Client ${clientId}:\tIceCandidate`);
		// 	msg.playerId = clientId;
		// 	streamer.send(JSON.stringify(msg));
		// }
		// else {
		// 	console.error(`** WS:\tClient ${clientId}:\tUnsuported message type:\t${msg.type}`);
		// 	ws.close(1008/* Custom kick */, "kicked");
		// 	return ;
		// }
	});

	function	onPlayerDisconnected() {
		roomPeers = rooms.get(roomId);
		roomPeers.delete(clientId);
		rooms.set(roomId, roomPeers);

		roomPeers.forEach((peer) => {
			peer.ws.send(`{ "type": "playerDisconnected", "playerId": ${clientId} }`);
		});
	}

	webSocket.on('close', function (code, reason) {
		console.log(`Room_${roomId}:\tClient_${clientId}:\tConnection closed:\t${code} - ${reason}`);
		onPlayerDisconnected();
	});

	webSocket.on('error', function (error) {
		console.log(`Room_${roomId}:\tClient_${clientId}:\tConnection error:\t${code} - ${reason}`);
		ws.close(1006/* abnormal closure */, error);
		onPlayerDisconnected();
	});

	// Allow stream to be see from the outside of your network (just specified the streamIP int the turn)
	let peerConnectionOptions = JSON.stringify({
		iceServers: [{
			urls: ["stun:stun.l.google.com:19302"]
		}, {
			urls: ["stun:stun1.l.google.com:19302"]
		}, {
			urls: ["stun:stun2.l.google.com:19302"]
		}, {
			urls: ["stun:stun3.l.google.com:19302"]
		}]
	});
	webSocket.send(`{ "type": "ConnectionCallback", "peerConnectionOptions": ${peerConnectionOptions} }`);
});

server.listen(port, () => {
	console.log(`listening on *:${port}`);
});
