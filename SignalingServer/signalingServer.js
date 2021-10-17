const express = require('express');
const app = express();
const port = 8042;
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');

///////////////////////////////////////////////////////////////////////////////
//	Utils

function	generateId(length) {
	let result = '';
	let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return (result);
}

function	generateUniqueId(length, blacklist = []) {
	let unique = false;
	let newid = "";
	let retry = 0;

	while (!unique && retry < 1000) {
		newid = generateId(length);
		unique = true;
		for (const entry of blacklist) {
			if (entry === newid) {
				unique = false;
				break;
			}
		}
		retry += 1;
	}
	if (retry >= 1000) {
		return ("");
	}
	return (newid);
}

function	sendToClientsRoom(roomMap, msg, blacklist = []) {
	roomMap.forEach((client) => {
		let sendTo = true;

		for (const entry of blacklist) {
			if (entry === client.id) {
				sendTo = false;
				break;
			}
		}

		if (sendTo) {
			client.ws.send(msg);
		}
	});
}

const Utils = {
	generateId,
	generateUniqueId,
	sendToClientsRoom
};

///////////////////////////////////////////////////////////////////////////////
//	CLIENT SERVER

let rooms = new Map(); // <RoomId, ClientArray>

let clientServer = new WebSocket.Server({ server: server });
console.log(`WebSocket listening to Client connections on *:${port}`);

clientServer.on('connection', function (socket, req) {
	const urlOrigin = new URL(`${req.headers.origin}${req.url}`);
	const roomId = urlOrigin.searchParams.get("roomid");

	// Add new client to the list
	let roomPeers = null; // contain everyone in the room (Also the current client)
	let clientId = -1;

	if (rooms.has(roomId)) {
		roomPeers = rooms.get(roomId);
		const blacklist = Array.from(roomPeers.keys());
		clientId = Utils.generateUniqueId(5, blacklist);
		if (clientId === "") {
			console.log(`** WS:\tCould find Id to a new User`);
			socket.close(1011 /* Internal Error */, "Could find Unique ID");
			return;
		}

		roomPeers.set(clientId, { id: clientId, ws: socket });
		rooms.set(roomId, roomPeers);
	}
	else {
		console.log(`** WS:\tCreate new room: ${roomId}`);

		const newMap = new Map();
		clientId = Utils.generateId(5);
		newMap.set(clientId, { id: clientId, ws: socket });
		rooms.set(roomId, newMap);
		roomPeers = newMap;
	}
	console.log(`** WS:\tRoom_${roomId}:\tNew client_${clientId}:\t${req.headers.origin}`);

	socket.on('message', function (msg) {
		console.log(`Room_${roomId}:\t<-- Client_${clientId}:\tMessage received.`);

		// Parse JSON msg
		try {
			msg = JSON.parse(msg);
		} catch (err) {
			console.error(`Cannot parse message: ${msg}\nError: ${err}`);
			ws.close(1008 /* Policy violation */, "Cannot parse msg");
			return;
		}
		console.log('== ', msg);

		// Update peers
		roomPeers = rooms.get(roomId);

		// who send the message
		msg.from = clientId;

		// Send the msg to who
		let target = roomPeers.get(msg.to);
		if (!target) {
			console.error(`Message to client_${msg.to} dropped: Player not find`);
			ws.close(1008 /* Policy violation */, "Cannot find peers id");
			return;
		}
		else if (msg.to === clientId) {
			console.error(`Client_${msg.to} Trying to send msg to himself`);
			ws.close(1008 /* Policy violation */, "Sending message to himself is not allow");
			return;
		}

		// dispatch based on msg.type value
		if (msg.type === "Offer") {
			console.log(`** WS:\t<-- Client ${clientId}:\tOffer`);
			target.ws.send(JSON.stringify(msg));
		}
		else if (msg.type === "Answer") {
			console.log(`** WS:\t<-- Client ${clientId}:\tAnswer`);
			target.ws.send(JSON.stringify(msg));
		}
		else if (msg.type === "IceCandidate") {
			console.log(`** WS:\t<-- Client ${clientId}:\tIceCandidate`);
			target.ws.send(JSON.stringify(msg));
		}
		else {
			console.error(`** WS:\tClient ${clientId}:\tUnsuported message type:\t${msg.type}`);
			ws.close(1008/* Custom kick */, "kicked");
			return ;
		}
	});

	function	onPlayerDisconnected() {
		roomPeers = rooms.get(roomId);
		roomPeers.delete(clientId);
		rooms.set(roomId, roomPeers);

		const peersId = JSON.stringify(Array.from(roomPeers.keys()));
		Utils.sendToClientsRoom(roomPeers, `{ "type": "clientLeave", "peers": ${peersId}, "from": "${clientId}" }`, [clientId]);
	}

	socket.on('close', function (code, reason) {
		console.log(`Room_${roomId}:\tClient_${clientId}:\tConnection closed:\t${code} - ${reason}`);
		onPlayerDisconnected();
	});

	socket.on('error', function (error) {
		console.log(`Room_${roomId}:\tClient_${clientId}:\tConnection error:\t${code} - ${reason}`);
		ws.close(1006/* abnormal closure */, error);
		onPlayerDisconnected();
	});

	// Allow peer connection from the outside of your network
	// (But not if they'r behing a symetric NAT, I didn't implement a TURN server)
	const peerConnectionOptions = JSON.stringify({
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

	const peersId = JSON.stringify(Array.from(roomPeers.keys()));
	socket.send(`{ \
		"type": "ConnectionCallback", \
		"peerConnectionOptions": ${peerConnectionOptions}, \
		"peersId": ${peersId}, \
		"selfId": "${clientId}" \
	}`);
	Utils.sendToClientsRoom(roomPeers, `{ "type": "clientJoin", "peers": ${peersId}, "from": "${clientId}" }`, [clientId]);
});

server.listen(port, () => {
	console.log(`listening on *:${port}`);
});
