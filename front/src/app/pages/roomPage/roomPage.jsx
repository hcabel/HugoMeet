import React, {useState, useEffect} from "react";
import {useHistory, useParams} from "react-router-dom";
import config from "../../config";

import Utils from "../../utils/utils";

import "./roomPageCSS.css";

let PeersConnection = new Map();

export default function	RoomPage()
{
	const [_LoadingMessage, set_LoadingMessage] = useState("");
	const [_PeersId, set_PeersId] = useState([]);

	const history = useHistory();

	let { roomId } = useParams();

	///////////////////////////////////////////////////////////////////////////////
	//	DataChanel

	function	DConOpen(peerId) {
		console.log("DC Connected with: ", peerId);
	}

	function	DConMessage(peerId, msg) {
		console.log(peerId, " send you: ", msg.data);
	}

	function	DConClose(peerId) {
		console.log("DC Disconnected with: ", peerId);
	}

	function	initDCFunctions(dataChannel, peerId) {
		dataChannel.onopen = () => DConOpen(peerId);
		dataChannel.onmessage = (msg) => DConMessage(peerId, msg);
		dataChannel.onclose = () => DConClose(peerId);
	}

	///////////////////////////////////////////////////////////////////////////////
	//	WebRTC

	function	sendAnswerBasedOffer(offer, peerId) {
		console.log(`Client_${peerId} Want to be connected with you`);
		let newConnection = new RTCPeerConnection();

		newConnection.ondatachannel = (event) => {
			// this function will be executed when the two peers has set theyr local/remote description
			// So the function `sendAnswerBasedOffer` will already return and the value store into `PeersConnection` Map
			const peerConnection = PeersConnection.get(peerId);
			peerConnection.DC = event.channel;
			initDCFunctions(peerConnection.DC, peerId);
		};

		newConnection.onicecandidate = (e) => {
			let descriptor = {
				to: peerId,
				type: "IceCandidate",
				iceCandidate: e.candidate
			}
			console.log(`Send ICE to Client_${peerId}`);
			window.SignalingSocket.send(JSON.stringify(descriptor));
		}

		newConnection.setRemoteDescription(offer);
		newConnection.createAnswer()
		.then((answer) => {
			newConnection.setLocalDescription(answer);

			let descriptor = {
				to: peerId,
				type: "Answer",
				answer: answer
			}
			console.log(`Send Answer to Client_${peerId}`);
			window.SignalingSocket.send(JSON.stringify(descriptor));
		})

		return ({
			PC: newConnection,
			DC: null
		});
	}

	function	createNewPeerConnection(peerId) {
		console.log(`>>> Create peer connection with: Client_${peerId} <<<`);
		let newConnection = new RTCPeerConnection();

		let dataChannel = newConnection.createDataChannel(`HugoMeet_${roomId}`);
		initDCFunctions(dataChannel, peerId);

		newConnection.onicecandidate = (e) => {
			let descriptor = {
				to: peerId,
				type: "IceCandidate",
				iceCandidate: e.candidate
			}
			console.log(`Send ICE to Client_${peerId}`);
			window.SignalingSocket.send(JSON.stringify(descriptor));
		}

		newConnection.createOffer()
		.then((offer) => {
			newConnection.setLocalDescription(offer);

			let descriptor = {
				to: peerId,
				type: "Offer",
				offer: offer
			}
			console.log(`Send Offer to Client_${peerId}`);
			window.SignalingSocket.send(JSON.stringify(descriptor));
		})

		return ({
			PC: newConnection,
			DC: dataChannel
		});
	}

	function	RTCMessageDispatcher(msg) {
		if (msg.type === "Offer") {
			PeersConnection.set(msg.from, {
				id: msg.from,
				...sendAnswerBasedOffer(msg.offer, msg.from)
			});
		}
		else if (msg.type === "Answer") {
			console.log("Answer received");
			let connection = PeersConnection.get(msg.from);
			if (connection) {
				connection.PC.setRemoteDescription(msg.answer);
			}
			else {
				throw Error("You receive a answer from a undefined peer");
			}
		}
		else if (msg.type === "IceCandidate") {
			console.log("ICE received");
			let connection = PeersConnection.get(msg.from);
			if (connection) {
				connection.PC.addIceCandidate(msg.iceCandidate);
			}
			else {
				throw Error("You receive a answer from a undefined peer");
			}
		}
	}

	function onRoomConnectionEstablish(msg) {
		set_PeersId(msg.peersId);
		// peerConnectionOptions = msg.peerConnectionOptions;
		for (const peerId of msg.peersId) {
			if (peerId !== msg.selfId) {
				PeersConnection.set(peerId, {
					id: peerId,
					...createNewPeerConnection(peerId)
				});
			}
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	//	Web Sockect

	function	WSonMessage(msg) {
		try {
			msg = JSON.parse(msg.data);
		} catch (err) {
			console.error(`Cannot parse message: ${msg.data}\nError: ${err}`);
			return ;
		}
		// console.log("** WS:\t", msg);

		if (msg.type === "ConnectionCallback") {
			onRoomConnectionEstablish(msg);
		}
		else if (msg.type === "clientJoin" || msg.type === "clientLeave") {
			// I have to send all the clients because for some reasont _PeersId is empty in this function
			set_PeersId(msg.peers);
		}
		else if (Utils.rtc.isRTCMessage(msg.type)) {
			RTCMessageDispatcher(msg);
		}
		else {
			console.error(`Msg dropped because type ${msg.type} is unknown`);
		}
	}

	function	WSonOpen() {
		set_LoadingMessage("SUCCEEDED: Connection to the Signaling server establish.");
	}

	function	WSonClose(code, reason) {
		console.log(`WS close: ${code} - ${reason}`);
		history.push(`/`);
	}

	function	connectClient(roomId) {
		set_LoadingMessage("Connection to the Signaling Server...");
		if (!window.WebSocket) {
			set_LoadingMessage("FAILED: Your browser's version is to old.");
		}

		window.SignalingSocket = new window.WebSocket(`${config.url_signaling}?roomid=${roomId}`);

		window.SignalingSocket.onopen = WSonOpen;
		window.SignalingSocket.onmessage = WSonMessage;
		window.SignalingSocket.onclose = WSonClose;
	}

	useEffect(() => {
		if (!window.SignalingSocket || window.SignalingSocket.readyState === 3) {
			connectClient(roomId);
		}
	})

	///////////////////////////////////////////////////////////////////////////////
	//	Render

	console.log("RoomPage:\tRefresh");
	return (
		<div className="RoomPage">
			{_LoadingMessage}
			{_PeersId.map((value, index) =>
				<div key={index} style={{ display: "flex", width: "100%", justifyContent: "space-around" }}>
					<div key={index}>
						{value}
					</div>
					<div>
						{PeersConnection.has(value) &&
							PeersConnection.get(value).PC.connectionState
						}
					</div>
					<button onClick={() => {
						const peer = PeersConnection.get(value);
						if (peer) {
							if (peer.DC) {
								peer.DC.send("HELLOBOY");
							}else {
								console.log(peer);
							}
						}
					}}>
						send data
					</button>
				</div>
			)}
		</div>
	);
};