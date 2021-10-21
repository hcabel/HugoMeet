import React, {useState, useEffect} from "react";
import {useHistory, useParams} from "react-router-dom";
import config from "../../config";

import Utils from "../../utils/utils";

import "./roomPageCSS.css";

let PeersConnection = new Map();

export default function	RoomPage() {
	const [_LoadingMessage, set_LoadingMessage] = useState("");
	const [_Peers, set_Peers] = useState([]);
	const [_Self, set_Self] = useState(-1);

	const history = useHistory();

	let { roomId } = useParams();

	///////////////////////////////////////////////////////////////////////////////
	//	DataChanel

	function	DConOpen(peerId) {
		console.log(`DC_${peerId}:\tConnected`);
	}

	function	DConMessage(peerId, msg) {
		console.log(`DC_${peerId}:\tReceveived Message`, msg.data);
	}

	function	DConClose(peerId) {
		console.log(`DC_${peerId}:\tDisconnected`);
	}

	function	initDCFunctions(dataChannel, peerId) {
		dataChannel.onopen = () => DConOpen(peerId);
		dataChannel.onmessage = (msg) => DConMessage(peerId, msg);
		dataChannel.onclose = () => DConClose(peerId);
	}

	///////////////////////////////////////////////////////////////////////////////
	//	WebRTC

	function	sendAnswerBasedOffer(offer, peerId) {
		console.log(`WebRTC:\t>>> Client_${peerId} send you an Offer <<<`);
		let newConnection = new RTCPeerConnection();

		newConnection.onicecandidate = (e) => {
			if (!e.candidate) {
				return;
			}

			let descriptor = {
				to: peerId,
				type: "IceCandidate",
				iceCandidate: e.candidate
			}
			console.log(`WebRTC:\tSend ICE to Client_${peerId}\t${e.candidate.type}`);
			window.SignalingSocket.send(JSON.stringify(descriptor));
		}

		newConnection.ondatachannel = (event) => {
			// this function will be executed when the two peers has set theyr local/remote description
			// So the function `sendAnswerBasedOffer` will already return and the value store into `PeersConnection` Map
			const peerConnection = PeersConnection.get(peerId);
			peerConnection.DC = event.channel;
			initDCFunctions(peerConnection.DC, peerId);
		};

		newConnection.addTransceiver("video", { direction: "sendrecv",  });

		newConnection.setRemoteDescription(offer)
		.then(() => console.log(`WebRTC:\tClient_${peerId}:\tRemote description set`));
		newConnection.createAnswer()
		.then((answer) => {
			newConnection.setLocalDescription(answer)
			.then(() => console.log(`WebRTC:\tLocal description set`));

			let descriptor = {
				to: peerId,
				type: "Answer",
				answer: answer
			}
			console.log(`WebRTC:\tSend Answer to Client_${peerId}`);
			window.SignalingSocket.send(JSON.stringify(descriptor));
		})

		return ({
			PC: newConnection,
			DC: null
		});
	}

	function	createNewPeerConnection(peerId) {
		console.log(`WebRTC:\t>>> Create peer connection with: Client_${peerId} <<<`);
		let newConnection = new RTCPeerConnection();

		newConnection.onicecandidate = (e) => {
			let descriptor = {
				to: peerId,
				type: "IceCandidate",
				iceCandidate: e.candidate
			}
			console.log(`WebRTC:\tSend ICE to Client_${peerId}`);
			window.SignalingSocket.send(JSON.stringify(descriptor));
		}

		let dataChannel = newConnection.createDataChannel(`HugoMeet_${roomId}`);
		initDCFunctions(dataChannel, peerId);

		newConnection.onicecandidate = (e) => {
			if (!e.candidate) {
				return;
			}

			let descriptor = {
				to: peerId,
				type: "IceCandidate",
				iceCandidate: e.candidate
			}
			console.log(`WebRTC:\tSend ICE to Client_${peerId}\t${e.candidate.type}`);
			window.SignalingSocket.send(JSON.stringify(descriptor));
		}

		newConnection.createOffer()
		.then((offer) => {
			newConnection.setLocalDescription(offer)
			.then(() => console.log(`WebRTC:\tLocal description set`));

			let descriptor = {
				to: peerId,
				type: "Offer",
				offer: offer
			}
			console.log(`WebRTC:\tSend Offer to Client_${peerId}`);
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

		let connection = PeersConnection.get(msg.from);
		if (!connection) {
			throw Error("You receive a answer from a undefined peer");
		}

		if (msg.type === "Answer") {
			console.log(`WebRTC:\tClient_${msg.from}:\tAnswer received`);

			connection.PC.setRemoteDescription(msg.answer)
			.then(() => console.log(`WebRTC:\tClient_${msg.from} Remote description set`));
		}
		else if (msg.type === "IceCandidate") {
			console.log(`WebRTC:\tClient_${msg.from}:\tICE received:\t${msg.iceCandidate?.candidate.split(" ")[7]}`);

			connection.PC.addIceCandidate(msg.iceCandidate)
			.then(() => console.log(`WebRTC:\tAdd new ICE from Client_${msg.from}`));
		}
	}

	function onRoomConnectionEstablish(msg) {
		set_Peers(msg.peers);
		set_Self(msg.selfId)
		// peerConnectionOptions = msg.peerConnectionOptions;
		for (const peer of msg.peers) {
			if (peer !== msg.selfId) {
				PeersConnection.set(peer, {
					id: peer,
					...createNewPeerConnection(peer)
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
			// I have to send all the clients because for some reasont _Peers is empty in this function
			set_Peers(msg.peers);
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

		const mediaConstraints = {
			audio: false,
			video: true
		};
		navigator.mediaDevices.getUserMedia(mediaConstraints)
		.then(function(localStream) {
			const video = document.getElementById("localVideo");
			video.onloadedmetadata = () => video.play();
			window.localStream = localStream;
			video.srcObject = localStream;
			// localStream.getTracks().forEach(track => newConnection.addTrack(track, localStream));
		})
		.catch((e) => {
			switch (e.name) {
				case "NotFoundError":
					alert("Unable to open your call because no camera and/or microphone were found");
					break;
				case "SecurityError":
				case "PermissionDeniedError":
					break;
				default:
					alert("Error opening your camera and/or microphone: " + e.message);
					break;
			}
		});
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

	// TODO: find math to remove that crap
	const numberOfColumns = {
		1: 1,
		2: 2,
		3: 2,
		4: 2,
		5: 3,
		6: 3,
		7: 3,
		8: 3,
		9: 3,
		10: 4,
		11: 4,
	};

	// console.log('>> ', _Peers.length,  numberOfColumns[_Peers.length]);

	///////////////////////////////////////////////////////////////////////////////
	//	Render

	console.log("RoomPage:\tRefresh");
	return (
		<div className="RoomPage">
			{_LoadingMessage !== "" &&
				<div className="RP-InformationMessage">
					{_LoadingMessage}
				</div>
			}
			<div className="RP-VideoContainer" style={{ gridTemplateColumns: `${"auto ".repeat(numberOfColumns[_Peers.length])}` }}>
				{_Peers.map((value, index) =>
					<div key={index} className="RP-VC-Peer">
						<video className="RP-VC-P-Video" id={value === _Self ? "localVideo": "" } />
						<div className="RP-VC-P-Name">
							{value}
						</div>
					</div>
				)}
			</div>
			<div className="RP-ToolsBox">
				<div className="RP-TB-Left">
					{`Welcome to room: ${roomId}`}
				</div>
				<div className="RP-TB-Center">

				</div>
				<div className="RP-TB-Right">

				</div>
			</div>
		</div>
	);
};