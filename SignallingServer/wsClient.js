const Utils = require("./utils");
const globalVariables = require("./globalVariables");

module.exports = async function(socket, req) {
	let clientId = "";
	let roomId = "";
	let clientName = "";

	function	onPlayerDisconnected() {
		const roomPeers = globalVariables.rooms.get(roomId);
		roomPeers.delete(clientId);
		globalVariables.rooms.set(roomId, roomPeers);

		Utils.sendMsgToAllClientsInTheRoom(roomPeers, `{ "type": "clientLeave", "from": "${clientId}" }`, [clientId]);
	}

	///////////////////////////////////////////////////////////////////////////////
	//	WebSocket EVENT

	function onMessage(msg) {
		console.log(`Room_${roomId}:\t<-- Client_${clientId}:\tMessage received.`);

		// Parse JSON msg
		try {
			msg = JSON.parse(msg);
		} catch (err) {
			console.error(`Cannot parse message: ${msg}\nError: ${err}`);
			socket.close(1008 /* Policy violation */, "Cannot parse msg");
			return;
		}
		// console.log('== ', msg);

		// who send the message
		msg.from = clientId;

		const roomPeers = globalVariables.rooms.get(roomId);
		const target = roomPeers.get(msg.to); // Send the msg to who
		if (!target) {
			console.error(`Message to client_${msg.to} dropped: Player not find`);
			socket.close(1008 /* Policy violation */, "Cannot find peers id");
			return;
		}
		else if (msg.to === clientId) {
			console.error(`Client_${msg.to} Trying to send msg to himself`);
			socket.close(1008 /* Policy violation */, "Sending message to himself is not allow");
			return;
		}

		if (!target.ws || (target.ws && target.ws.readyState !== 1)) {
			console.error(`Client_${msg.to} WebSocket is closed, message ${msg.type} dropped`);
			return;
		}

		// dispatch based on msg.type value
		if (msg.type === "Offer") {
			console.log(`** WS:\t<-- Client ${clientId}:\tOffer`);
			// add peer connection options
			msg.peerConnectionOptions = globalVariables.peerConnectionOptions;
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
	}

	function onClose(code, reason) {
		console.log(`Room_${roomId}:\tClient_${clientId}:\tConnection closed:\t${code} - ${reason}`);
		onPlayerDisconnected();
	}

	function onError(error) {
		console.log(`Room_${roomId}:\tClient_${clientId}:\tConnection error`);
		onPlayerDisconnected();
		socket.close(1006/* abnormal closure */, error);
	}

	///////////////////////////////////////////////////////////////////////////////
	//	WebSocket Connection

	const urlOrigin = new URL(`${req.headers.origin}${req.url}`);
	roomId = urlOrigin.searchParams.get("roomid");
	clientName = urlOrigin.searchParams.get("name");

	// Add new client to the list
	if (globalVariables.rooms.has(roomId)) {
		const roomPeers = globalVariables.rooms.get(roomId);

		const blacklist = Array.from(roomPeers.keys());
		clientId = Utils.generateUniqueId(5, blacklist);
		if (clientId === "") {
			console.log(`** WS:\tCould find Id to a new User`);
			socket.close(1011 /* Internal Error */, "Could find Unique ID");
			return;
		}

		roomPeers.set(clientId, { _id: clientId, ws: socket, name: clientName });
		globalVariables.rooms.set(roomId, roomPeers);
	}
	else {
		console.log(`** WS:\tCreate new room: ${roomId}`);

		const newMap = new Map();
		clientId = Utils.generateId(5);
		newMap.set(clientId, { _id: clientId, ws: socket, name: clientName });
		globalVariables.rooms.set(roomId, newMap);
	}
	console.log(`** WS:\tRoom_${roomId}:\tNew client_${clientId}:\t${req.headers.origin}`);

	socket.on('message', onMessage);
	socket.on('close', onClose);
	socket.on('error', onError);

	const roomPeers = globalVariables.rooms.get(roomId);
	const peers = Array.from(roomPeers.values()).map((value) => {
		// You can't use `delete value.ws` because it will be erase in `roonPeers` has well
		return ({ ...value, ws: undefined });
	});
	socket.send(JSON.stringify({
		type: "ConnectionCallback",
		peerConnectionOptions: globalVariables.peerConnectionOptions,
		peers: peers,
		selfId: clientId
	}));
	Utils.sendMsgToAllClientsInTheRoom(
		roomPeers,
		JSON.stringify({
			type: "clientJoin",
			newPeer: {...roomPeers.get(clientId), ws: undefined},
			from: clientId
		}),
		[clientId]
	);
};