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

function	sendMsgToAllClientsInTheRoom(roomMap, msg, blacklist = []) {
	roomMap.forEach((client) => {
		let sendTo = true;

		for (const entry of blacklist) {
			if (entry === client._id) {
				sendTo = false;
				break;
			}
		}

		if (sendTo) {
			if (client.ws && client.ws.readyState === 1) {
				client.ws.send(msg);
			}
			else {
				console.warn(`Client_${client._id} WebSocket is closed, message dropped:\t`, msg);
			}
		}
	});
}

module.exports = {
	generateId,
	generateUniqueId,
	sendMsgToAllClientsInTheRoom
};