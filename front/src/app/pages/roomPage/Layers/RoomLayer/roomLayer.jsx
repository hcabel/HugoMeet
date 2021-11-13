import React, {useState, useEffect} from "react";
import {useHistory, useParams} from "react-router-dom";

import config from "../../../../config";
import Utils from "../../../../utils/utils";
import HangUpIcon from "./assets/HandUpIcon.png";

import "./roomLayerCSS.css";

let PeersConnection = new Map();

export default function	RoomLayer(props) {
	const [_LoadingMessage, set_LoadingMessage] = useState("Loading...");
	const [_Peers, set_Peers] = useState([]);
	const [_SelfId, set_SelfId] = useState("");

	const history = useHistory();
	const { roomId } = useParams();

	function	toggleAudio() {
		props.onChangeAudioStatus(!props.audio);

		sendMessageToEveryoneInTheRoom(JSON.stringify({ type: "muteStateChange", _id: _SelfId, audio: !props.audio }));
		const peerIndex = Utils.getPeerIndexFrom_Id(_SelfId, window._Peers);
		if (peerIndex !== -1) {
			const peers = [...window._Peers];
			peers[peerIndex].audio = !props.audio;
			set_Peers(peers);
		}
	}

	function	toggleVideo() {
		props.onChangeVideoStatus(!props.video);
	}

	///////////////////////////////////////////////////////////////////////////////
	//	DataChanel

	function	DConOpen(peerId) {
		console.log(`DC_${peerId}:\tConnected`);
	}

	function	DConMessage(peerId, msg) {
		console.log(`DC_${peerId}:\tMessage Receveived`, msg.data);

		// Parse JSON msg
		try {
			msg = JSON.parse(msg.data);
		} catch (err) {
			console.error(`DC_${peerId}:\tError: ${err}`);
			return;
		}

		const peerIndex = Utils.getPeerIndexFrom_Id(msg._id, window._Peers);
		if (peerIndex === -1) {
			console.error(`DC_${peerId}:\tFailed to find peerIndex from`, msg._id);
			return;
		}

		if (msg.type === "muteStateChange") {
			const peer = PeersConnection.get(msg._id);
			if (peer) {
				const peers = [...window._Peers];
				peers[peerIndex].isMuted = msg.isMuted;
				set_Peers(peers);
				window._Peers = peers;
			}
			else {
				console.error(`DC_${peerId}:\tMR:\tPeerId`, msg._id, `does not belong to anyone`);
			}
		}
	}

	function	DConClose(peerId) {
		console.log(`DC_${peerId}:\tDisconnected`);
	}

	function	initDCFunctions(dataChannel, peerId) {
		dataChannel.onopen = () => DConOpen(peerId);
		dataChannel.onmessage = (msg) => DConMessage(peerId, msg);
		dataChannel.onclose = () => DConClose(peerId);
	}

	function	sendMessageToEveryoneInTheRoom(msg) {
		// send message to everyone in the room excepte you
		const peersRTCObjs = PeersConnection.values();
		for (const peerRtcObj of peersRTCObjs) {
			if (peerRtcObj._id !== _SelfId) {
				if (peerRtcObj.DC && peerRtcObj.DC.readyState === "open") {
					peerRtcObj.DC.send(msg);
				}
				else {
					console.log(`DC:\tIs disconnected`, peerRtcObj);
				}
			}
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	//	WebRTC

	function	onIceCandidate(e, peerId) {
		if (!e.candidate) {
			// This function is triggered one last time with an empty candidate when all candidate are send
			// And if the first triggered has a empty candidate it mean that theyr is a wrong closure at the previous webrtc session
			return;
		}

		// When you create a new ice, send it to the peer
		let descriptor = {
			to: peerId,
			type: "IceCandidate",
			iceCandidate: e.candidate
		}
		console.log(`WebRTC:\tSend ICE to Client_${peerId}`);
		window.SignalingSocket.send(JSON.stringify(descriptor));
	}

	function	onTrack(event, peerId) {
		// When you receive streams from the peer

		console.log(`WebRTC:\tYou received STREAM from Client_${peerId}`);
		const video = document.getElementById(`VideoStream_${peerId}`);
		video.onloadeddata = () => video.play();
		video.srcObject = event.streams[0];

		const connection = PeersConnection.get(peerId);
		connection.stream = event.streams[0];
		PeersConnection.set(peerId, connection);
	}

	// When a new client wish to connect with you
	function	sendAnswerBasedOffer(offer, peerId, options) {
		console.log(`WebRTC:\t>>> Client_${peerId} send you an Offer <<<`, options);
		let newConnection = new RTCPeerConnection(options);

		newConnection.onicecandidate = (e) => onIceCandidate(e, peerId);

		newConnection.ondatachannel = (event) => {
			// this function will be executed when the two peers has set theyr local/remote description
			const peerConnection = PeersConnection.get(peerId);
			peerConnection.DC = event.channel;
			initDCFunctions(peerConnection.DC, peerId);
		};

		if (window.localStream) {
			// Send your streams to the peer (Audio/Video)
			window.localStream.getTracks().forEach((track) => newConnection.addTrack(track, window.localStream));
		}
		newConnection.ontrack = (event) => onTrack(event, peerId);

		// Set local description of the peer
		newConnection.setRemoteDescription(offer)
		.then(() => console.log(`WebRTC:\tClient_${peerId}:\tRemote description set`));

		// Create/Set your own local description
		newConnection.createAnswer()
		.then((answer) => {
			newConnection.setLocalDescription(answer)
			.then(() => console.log(`WebRTC:\tLocal description set`));

			// Send your local description to the peer
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
			DC: null // We return null because DC will be set when `ondatachannel` will be triggered
		});
	}

	// when you ask a peer to be connected with
	function	createNewPeerConnection(peerId, options) {
		console.log(`WebRTC:\t>>> Create peer connection with: Client_${peerId} <<<`, options);
		let newConnection = new RTCPeerConnection(options);

		newConnection.onicecandidate = (e) => onIceCandidate(e, peerId);

		let dataChannel = newConnection.createDataChannel(`HugoMeet_${roomId}`);
		initDCFunctions(dataChannel, peerId);

		// TODO: Make sure of the importance of this line (I think it's already set to `sendrecv`)
		newConnection.addTransceiver("video", { direction: "sendrecv",  });
		newConnection.addTransceiver("audio", { direction: "sendrecv",  });

		if (window.localStream) {
			// Send your streams to the peer (Audio/Video)
			window.localStream.getTracks().forEach((track) => newConnection.addTrack(track, window.localStream));
		}
		newConnection.ontrack = (event) => onTrack(event, peerId);

		// Create/Set your own local description
		newConnection.createOffer()
		.then((offer) => {
			newConnection.setLocalDescription(offer)
			.then(() => console.log(`WebRTC:\tLocal description set`));

			// send local description to the peer
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
			// somemone new has join the room and send you an offer start a peer connection

			const rtcOptions = {
				...msg.peerConnectionOptions
			};

			const result = sendAnswerBasedOffer(msg.offer, msg.from, rtcOptions);
			const AlreadyexistingValues = PeersConnection.get(msg.from);

			PeersConnection.set(msg.from, {
				_id: msg.from,
				...AlreadyexistingValues,
				...result
			});
		}

		let connection = PeersConnection.get(msg.from);
		if (!connection) {
			throw Error("You receive a answer from a undefined peer");
		}

		if (msg.type === "Answer") {
			// someone reponce to your offer with is own local description
			console.log(`WebRTC:\tClient_${msg.from}:\tAnswer received`);

			// set the local description of the remote peer
			connection.PC.setRemoteDescription(msg.answer)
			.then(() => console.log(`WebRTC:\tClient_${msg.from} Remote description set`));
		}
		else if (msg.type === "IceCandidate") {
			if (!msg.iceCandidate) {
				console.error(`WebRTC:\tClient_${msg.from}:\tSend you a not valid ICE candidate`);
				return;
			}

			// You received a new ICE from one of your remote peers
			console.log(`WebRTC:\tClient_${msg.from}:\tICE received`);

			// /!\ It's actually very important to add ICE because they change the local description of the remote peer
			// /!\ and if you don't do it, your peer will have a local description who isn't matching with the one you added with `setRemoteDescription`
			// /!\ and you will be DISCONNECTED has soon has it was connected
			const ice = new RTCIceCandidate(msg.iceCandidate);
			connection.PC.addIceCandidate(ice)
			.then(() => console.log(`WebRTC:\tAdd new ICE from Client_${msg.from}\t${ice.type}`));
		}
	}

	async function	onRoomConnectionEstablish(msg) {
		window._Peers = msg.peers;
		set_Peers(msg.peers);
		set_SelfId(msg.selfId);

		const video = document.getElementById(`LocalStream`);
		video.onloadedmetadata = () => video.play(); // play once video stream is setup
		video.muted = true;	// Mute my own video to avoid hearing myself
		video.srcObject = window.localStream;

		const rtcOptions = {
			...msg.peerConnectionOptions
		};

		// Connect with all peers in the room
		for (const peer of msg.peers) {
			if (peer._id !== msg.selfId) {
				PeersConnection.set(peer._id, {
					_id: peer._id,
					...createNewPeerConnection(peer._id, rtcOptions)
				});
			}
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	//	Web Socket

	function	WSonMessage(msg) {
		try {
			// WebSocket message are always stringify JSON (in my case)
			msg = JSON.parse(msg.data);
		} catch (err) {
			console.error(`Cannot parse message: ${msg.data}\nError: ${err}`);
			return ;
		}

		if (msg.type === "ConnectionCallback") {
			// once you sucessfully been connected to the room (msg contain all the initialising value)
			onRoomConnectionEstablish(msg);
		}
		else if (msg.type === "clientJoin") {
			set_Peers([...window._Peers, msg.newPeer]);
			window._Peers = [...window._Peers, msg.newPeer];
		}
		else if (msg.type === "clientLeave") {
			const peerConnection = PeersConnection.get(msg.from);
			peerConnection.PC.close();
			PeersConnection.delete(msg.from);

			const newPeers = window._Peers.filter((peer) => {
				return (peer._id !== msg.from);
			});
			set_Peers(newPeers);
			window._Peers = newPeers;
		}
		else if (Utils.rtc.isRTCMessage(msg.type)) {
			// msg.type === Offer | Answer | IceCandidate
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

	function	WSonClose(event) {
		console.log(`WS close: ${event.code}${event.reason && ` - ${event.reason}`}`, event);
		history.push(`/`);
	}

	function	WSonError(event) {
		console.log(`WS error:`, event);
		history.push(`/`);
	}

	function	connectClient(roomId) {
		set_LoadingMessage("Connection to the Signaling Server...");
		if (!window.WebSocket) {
			set_LoadingMessage("FAILED: Your browser's version is to old.");
		}

		// connect to signalling server
		window.SignalingSocket = new window.WebSocket(`${config.url_signaling}?roomid=${roomId}&name=${props.location && props.location.state ? props.location.state.name : "Unknown"}`);

		window.SignalingSocket.onopen = WSonOpen;
		window.SignalingSocket.onmessage = WSonMessage;
		window.SignalingSocket.onclose = WSonClose;
		window.SignalingSocket.onerror = WSonError;
	}

	///////////////////////////////////////////////////////////////////////////////
	//	UseEffect

	// If you enter in a room with a wrong RoomId, expulse to
	useEffect(() => {
		if (!Utils.idGenerator.isRoomIDValid(roomId)) {
			history.push("/");
		}
	}, [roomId]);

	// Constructor, will be excuted only once
	useEffect(() => {
		if (Utils.idGenerator.isRoomIDValid(roomId) && (!window.SignalingSocket || window.SignalingSocket.readyState === 3)) {
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

	console.log("RoomLayer:\tRefresh");
	return (
		<div className="RoomLayer">
			{_LoadingMessage !== "" &&
				<div className="RL-InformationMessage">
					{_LoadingMessage}
				</div>
			}
			{/* VIDEOS */}
			<div className="RL-VideoContainer" style={{ gridTemplateColumns: `${"auto ".repeat(numberOfColumns[_Peers.length])}` }}>
				{_Peers.map((peer, index) => {
					console.log(index, peer);
					return (
						<div key={index} className="RL-VC-Peer">
							{(_SelfId && peer._id === _SelfId ?
								<video // If it's me
									className="RL-VC-P-Video"
									id="LocalStream"
									src={window.localStream}
								/>
								:
								<video // If it's a peer
									className="RL-VC-P-Video"
									id={`VideoStream_${peer._id}`}
									src={PeersConnection.get(peer._id)?.streams}
								/>
							)}
							<div className="RL-VC-P-Name">
								{peer.name}
							</div>
							{peer.audio === false &&
								<>
									<div className="RL-VC-P-AudioStatus">
										<svg width="24px" height="24px" viewBox="0 0 24 24" fill="#000000">
											<path d="M0 0h24v24H0zm0 0h24v24H0z" fill="none"></path>
											<path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"></path>
										</svg>
									</div>
								</>
							}
						</div>
					);
				})}
			</div>
			{/* BUTTONS UNDER VIDEOS */}
			<div className="RL-ToolsBox">
				<div className="RL-TB-Left">
					<div className="RL-TB-L-RoomId">
						{roomId}
					</div>
				</div>
				<div className="RL-TB-Center">
					<div className={`RL-TB-C-Button-${props.audio ? "On" : "Off"} Center-Button-MicroStatus`} onClick={toggleAudio}>
						{props.audio ?
							// Icon micro turn on
							<svg className="svg-icon" focusable="false" width="24" height="24" viewBox="0 0 24 24">
								<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"></path>
								<path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
							</svg>
							:
							// Icon micro turn off
							<svg className="svg-icon" focusable="false" width="24px" height="24px" viewBox="0 0 24 24">
								<path d="M0 0h24v24H0zm0 0h24v24H0z" fill="none"></path>
								<path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"></path>
							</svg>
						}
					</div>
					<div className={`RL-TB-C-Button-${props.video ? "On" : "Off"} Center-Button-CameraStatus`} onClick={toggleVideo}>
						{props.video ?
							// Icon camera turn on
							<svg className="svg-icon" focusable="false" width="24" height="24" viewBox="0 0 24 24">
								<path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zm-2-.79V18H4V6h12v3.69z"></path>
							</svg>
							:
							// Icon camera turn off
							<svg className="svg-icon" focusable="false" width="24" height="24" viewBox="0 0 24 24">
								<path d="M18 10.48V6c0-1.1-.9-2-2-2H6.83l2 2H16v7.17l2 2v-1.65l4 3.98v-11l-4 3.98zM16 16L6 6 4 4 2.81 2.81 1.39 4.22l.85.85C2.09 5.35 2 5.66 2 6v12c0 1.1.9 2 2 2h12c.34 0 .65-.09.93-.24l2.85 2.85 1.41-1.41L18 18l-2-2zM4 18V6.83L15.17 18H4z"></path>
							</svg>
						}
					</div>
					<div className={`RL-TB-C-Button-Off Center-Button-LeaveRoom`} onClick={() => history.push("/")}>
						<img className="RL-TB-C-B-CBL-Img" alt="Leave the call" src={HangUpIcon} />
					</div>
				</div>
				<div className="RL-TB-Right">
					{/* Nothing Yet */}
				</div>
			</div>
		</div>
	);
};