import React, {useState, useEffect} from "react";
import {useHistory, useParams} from "react-router-dom";

import config from "../../config";
import Utils from "../../utils/utils";
import HangUpIcon from "./assets/HandUpIcon.png";

import "./roomPageCSS.css";

let PeersConnection = new Map();

export default function	RoomPage() {
	const [_LoadingMessage, set_LoadingMessage] = useState("");
	const [_Peers, set_Peers] = useState([]);
	const [_SelfId, set_SelfId] = useState("");
	const [_IsMuted, set_IsMuted] = useState(true);
	const [_IsCameraOn, set_IsCameraOn] = useState(true);

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

	// When a new client wish to connect with you
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

		if (window.localStream) {
			// Send your local video stream to the client
			window.localStream.getTracks().forEach((track) => newConnection.addTrack(track, window.localStream));
		}
		newConnection.ontrack = (event) => {
			console.log(`WebRTC:\tYou received STREAM from Client_${peerId}`);
			const video = document.getElementById(`VideoStream_${peerId}`);
			video.onloadeddata = () => video.play();
			video.srcObject = event.streams[0];
		}

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

	// when you ask a peer to be connected with
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

		newConnection.addTransceiver("video", { direction: "sendrecv",  });
		if (window.localStream) {
			console.log("Send video TO ", peerId);
			window.localStream.getTracks().forEach((track) => newConnection.addTrack(track, window.localStream));
		}
		newConnection.ontrack = (event) => {
			console.log(`WebRTC:\tYou received STREAM from Client_${peerId}`);
			const video = document.getElementById(`VideoStream_${peerId}`);
			video.onloadeddata = () => video.play();
			video.srcObject = event.streams[0];
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

	async function	initialiseLocalVideo(selfId) {
		const mediaConstraints = {
			audio: true,
			video: true
		};

		if (!navigator.mediaDevices) {
			set_LoadingMessage("This site is untrusted we can access to the camera and microphone !");
			return;
		}

		// get Audio and Video
		await navigator.mediaDevices.getUserMedia({ audio: !_IsMuted, video: _IsCameraOn })
		.then(function(localStream) {
			const video = document.getElementById(`VideoStream_${selfId}`);
			video.onloadedmetadata = () => video.play(); // autoplay
			video.muted = true;	// Dont want to hear myself
			video.srcObject = localStream;
			window.localStream = localStream;
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

	async function	onRoomConnectionEstablish(msg) {
		set_Peers(msg.peers);
		set_SelfId(msg.selfId);

		// We wait because if not our streams are not in the `window.localstream` variable
		// and we can't send them to the peers
		await initialiseLocalVideo(msg.selfId);

		/* peerConnectionOptions = msg.peerConnectionOptions; */

		// Connect with all peers in the room
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
	//	Web Socket

	function	WSonMessage(msg) {
		try {
			msg = JSON.parse(msg.data);
		} catch (err) {
			console.error(`Cannot parse message: ${msg.data}\nError: ${err}`);
			return ;
		}

		if (msg.type === "ConnectionCallback") {
			onRoomConnectionEstablish(msg);
		}
		else if (msg.type === "clientJoin" || msg.type === "clientLeave") {
			// I have to send all the clients in `msg.peer` because for some reason `_Peers` is empty in this function
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
		setTimeout(() => {
			set_LoadingMessage("");
		}, 5000);
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

	///////////////////////////////////////////////////////////////////////////////
	//	UseEffect

	// If you enter in a room with a wrong RoomId, expulse to
	useEffect(() => {
		if (roomId.length !== 10) {
			history.push("/");
		}
	}, [roomId]);

	useEffect(() => {
		if (window.localStream) {
			console.log("Mute/Unmute audio");

			const audiTracks = window.localStream.getAudioTracks();
			if (audiTracks.length > 0) {
				audiTracks.forEach((track) => {
					track.enabled = !_IsMuted;
				});
			}
			else {
				console.log("INIT Audio (Video already exist)");
				// no videoTracks mean the client was already muted when he connect so the audio track were never create
				navigator.mediaDevices.getUserMedia({ audio: true })
				.then((localStream) => {

					const newTracks = window.localStream.getVideoTracks();
					newTracks.forEach((track) => {
						localStream.addTrack(track);
					});

					// Update srcObject with the localstream with the new audio tracks
					const video = document.getElementById(`VideoStream_${_SelfId}`);
					video.srcObject = localStream;
					window.localStream = localStream;
				});
			}

		}
	}, [_IsMuted]);

	useEffect(() => {
		if (window.localStream) {
			if (!_IsCameraOn) {
				console.log("Kill Video");
				// If `_IsCameraOn` is FALSE it mean it was TRUE before, so close the video stream
				window.localStream.getVideoTracks().forEach((track) => {
					track.stop();
				});
			}
			else {
				console.log("INIT Video");

				// If `_IsCameraOn` is TRUE it mean it was FALSE before, so restart webcam
				navigator.mediaDevices.getUserMedia({ video: true })
				.then((localStream) => {

					const newTracks = window.localStream.getAudioTracks();
					newTracks.forEach((track) => {
						localStream.addTrack(track);
					});

					const video = document.getElementById(`VideoStream_${_SelfId}`);
					video.srcObject = localStream;
					window.localStream = localStream;
				});
			}
		}
	}, [_IsCameraOn]);

	// Constructor, will be excuted only once
	useEffect(() => {
		if (roomId.length === 10 && (!window.SignalingSocket || window.SignalingSocket.readyState === 3)) {
			connectClient(roomId);
		}
	});

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
						<video className="RP-VC-P-Video" id={`VideoStream_${value}`} />
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
					<div className={`RP-TB-C-Button-${!_IsMuted ? "On" : "Off"} Center-Button-MicroStatus`} onClick={() => set_IsMuted(!_IsMuted)}>
						{!_IsMuted ?
							// Icon micro turn on
							<svg focusable="false" width="24" height="24" viewBox="0 0 24 24">
								<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path>
								<path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
							</svg>
							:
							// Icon micro turn off
							<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24">
								<path d="M0 0h24v24H0zm0 0h24v24H0z" fill="none"></path>
								<path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"></path>
							</svg>
						}
					</div>
					<div className={`RP-TB-C-Button-${_IsCameraOn ? "On" : "Off"} Center-Button-CameraStatus`} onClick={() => set_IsCameraOn(!_IsCameraOn)}>
						{_IsCameraOn ?
							// Icon camera turn on
							<svg focusable="false" width="24" height="24" viewBox="0 0 24 24">
								<path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zm-2-.79V18H4V6h12v3.69z"></path>
							</svg>
							:
							// Icon camera turn off
							<svg focusable="false" width="24" height="24" viewBox="0 0 24 24">
								<path d="M18 10.48V6c0-1.1-.9-2-2-2H6.83l2 2H16v7.17l2 2v-1.65l4 3.98v-11l-4 3.98zM16 16L6 6 4 4 2.81 2.81 1.39 4.22l.85.85C2.09 5.35 2 5.66 2 6v12c0 1.1.9 2 2 2h12c.34 0 .65-.09.93-.24l2.85 2.85 1.41-1.41L18 18l-2-2zM4 18V6.83L15.17 18H4z"></path>
							</svg>
						}
					</div>
					<div className={`RP-TB-C-Button-Off Center-Button-LeaveRoom`} onClick={() => history.push("/")}>
						<img className="RP-TB-C-B-CBL-Img" alt="Leave the call" src={HangUpIcon} />
					</div>
				</div>
				<div className="RP-TB-Right">
					{/* Nothing Yet */}
				</div>
			</div>
		</div>
	);
};