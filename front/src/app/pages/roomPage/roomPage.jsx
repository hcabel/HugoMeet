import React, {useState, useEffect} from "react";
import {useParams} from "react-router-dom";
import config from "../../config";

export default function	RoomPage()
{
	const [_LoadingMessage, set_LoadingMessage] = useState("");
	const [_PeersId, set_PeersId] = useState([]);

	let { roomId } = useParams();

	function	onMessage(msg) {
		try {
			msg = JSON.parse(msg.data);
		} catch (err) {
			console.error(`Cannot parse message: ${msg.data}\nError: ${err}`);
			return ;
		}
		console.log("** WS:\t", msg);

		if (msg.type === "ConnectionCallback") {
			set_PeersId(msg.peersId);
			// peerConnectionOptions = msg.peerConnectionOptions;
		}
		else if (msg.type === "clientJoin" || msg.type === "clientLeave") {
			// I have to send all the clients because for some reasont _PeersId is empty in this function
			set_PeersId(msg.peers);
		}
	}

	function	onOpen() {
		set_LoadingMessage("SUCCEEDED: Connection to the Signaling server establish.");
	}

	function	connectClient(roomId) {
		console.log("START");
		set_LoadingMessage("Connection to the Signaling Server...");
		if (!window.WebSocket) {
			set_LoadingMessage("FAILED: Your browser's version is to old.");
		}

		window.SignalingSocket = new window.WebSocket(`${config.url_signaling}?roomid=${roomId}`);

		window.SignalingSocket.onopen = onOpen;
		window.SignalingSocket.onmessage = onMessage;
	}

	useEffect(() => {
		if (!window.SignalingSocket || window.SignalingSocket.readyState === 3) {
			connectClient(roomId);
		}
	})
	return (
		<div className="RoomPage">
			{_LoadingMessage}
			{_PeersId.map((value, index) => {
				return (<div key={index}>{value}</div>);
			})}
		</div>
	);
};