/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   wsClient.js                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: hcabel <hcabel@student.42.fr>              +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2021/11/19 22:48:47 by hcabel            #+#    #+#             */
/*   Updated: 2021/12/23 13:30:28 by hcabel           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const Utils = require("./utils");
const globalVariables = require("./globalVariables");

module.exports = async function(socket, req) {
	let clientId = "";
	let roomId = "";

	function	giveOwnership(to) {
		const roomPeers = globalVariables.rooms.get(roomId);
		let newOwnerId = to;

		if (newOwnerId === undefined) {
			const peers = Array.from(roomPeers.keys());
			for (const peer in peers) {
				if (peer.role === "Client") {
					newOwnerId = peer._id;
					break;
				}
			}

			if (newOwnerId === undefined) {
				return;
			}
		}

		const newOwner = roomPeers.get(newOwnerId);
		if (newOwner) {
			newOwner.role = "Owner";
			newOwner.ws.send(JSON.stringify({
				type: "OwnershipReceived",
			}));
		}
	}

	function	getRoomOwner(roomId) {
		const room = globalVariables.rooms.get(roomId);
		const peers = Array.from(room.values());

		for (const peer of peers) {
			if (peer.role === "Owner") {
				return (peer);
			}
		}
		return (undefined);
	}

	function	onPlayerDisconnected() {
		const roomPeers = globalVariables.rooms.get(roomId);

		const role = roomPeers.get(clientId).role;
		Utils.sendMsgToAllClientsInTheRoom(roomPeers, JSON.stringify({
			type: "clientLeave",
			from: clientId,
			role: role
		}), [clientId]);

		if (roomPeers.size === 1) {
			// If everyone leave delete room
			globalVariables.rooms.delete(roomId);
		}
		else {
			roomPeers.delete(clientId);
			globalVariables.rooms.set(roomId, roomPeers);

			if (role === "Owner") {
				// Give the ownership to a the first player in the list (May change this method BTW)
				giveOwnership(undefined);
			}
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	//	WebSocket EVENT

	function onMessage(msg) {
		// Parse JSON msg
		try {
			msg = JSON.parse(msg);
		} catch (err) {
			console.error(`Cannot parse message: ${msg}\nError: ${err}`);
			socket.close(1008 /* Policy violation */, "Cannot parse msg");
			return;
		}
		console.log(`Room_${roomId}:\t<-- Client_${clientId}:\tMessage received.`, msg.type);

		// who send the message
		msg.from = clientId;

		const roomPeers = globalVariables.rooms.get(roomId);
		const target = roomPeers.get(msg.to); // Send the msg to who
		if (!target) {
			console.error(`Message to client_${msg.to} dropped: Player not find`);
			socket.close(1008 /* Policy violation */, "Cannot find peers id");
			return;
		}

		if (!target.ws || (target.ws && target.ws.readyState !== 1)) {
			console.error(`Client_${msg.to} WebSocket is closed, message ${msg.type} dropped`);
			return;
		}

		// dispatch based on msg.type value
		if (msg.type === "JoinRequestResponce") {
			if (msg.approved === false) {
				target.ws.close(4005, "Joining request denied");
				return;
			}

			target.ws.send(JSON.stringify({ type: "JoinRequestCallback", approved: msg.approved }));
			target.role = "Client";

			const roomPeers = globalVariables.rooms.get(roomId);
			Utils.sendMsgToAllClientsInTheRoom(
				roomPeers,
				JSON.stringify({
					type: "clientJoin",
					newPeer: {...target, ws: undefined},
					from: clientId
				}),
				[target._id]
			);
		}
		else if (msg.type === "RoomSetup") {
			const roomPeers = globalVariables.rooms.get(roomId);
			const peers = Array.from(roomPeers.values()).filter((peer) => {
				return (peer.role !== "Pending");
			}).map((value) => {
				// You can't use `delete value.ws` because it will be erase in `roonPeers` has well
				return ({ ...value, ws: undefined });
			});

			target.ws.send(JSON.stringify({
				type: "RoomSetupCallback",
				peers: peers
			}))
		}
		else if (msg.type === "Offer") {
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

	// console.log(Array.from(roomMap.keys()));

	// Get/Create the map
	let roomMap = globalVariables.rooms.get(roomId);
	if (!roomMap) {
		console.log(`** WS:\tCreate new room: ${roomId}`);
		roomMap = new Map();
	}

	// Generate a new clientId
	const blacklist = Array.from(roomMap.keys());
	clientId = Utils.generateUniqueId(5, blacklist);
	if (clientId === "") {
		console.log(`** WS:\tCould find Id to a new User`);
		socket.close(1011 /* Internal Error */, "Could find Unique ID");
		return;
	}
	// Add new Client to the map
	roomMap.set(clientId, {
		_id: clientId,
		ws: socket,
		name: "NotDefined",
		role: "Pending"
	});
	// Override the map
	globalVariables.rooms.set(roomId, roomMap);

	console.log(`** WS:\tRoom_${roomId}:\tNew client_${clientId}:\t${req.headers.origin}`);

	// register clients events
	socket.on('message', onMessage);
	socket.on('close', onClose);
	socket.on('error', onError);

	if (blacklist.length > 0) {
		// ask to enter in the room
		const roomOwner = getRoomOwner(roomId);
		roomOwner.ws.send(JSON.stringify({
			type: "JoinRequestReceived",
			from: clientId,
			to: roomOwner._id,
			name: urlOrigin.searchParams.get("name")
		}));
	}
	else {
		giveOwnership(clientId);
	}

	socket.send(JSON.stringify({
		type: "ConnectionCallback",
		peerConnectionOptions: globalVariables.peerConnectionOptions,
		selfId: clientId,
		instantJoin: (blacklist.length > 0 ? false : true)
	}));
};