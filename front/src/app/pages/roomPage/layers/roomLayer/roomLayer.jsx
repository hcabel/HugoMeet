/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   roomLayer.jsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: hcabel <hcabel@student.42.fr>              +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2021/11/19 22:50:24 by hcabel            #+#    #+#             */
/*   Updated: 2022/02/28 20:11:45 by hcabel           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, {useState, useEffect} from "react";
import {useHistory, useParams} from "react-router-dom";

import Utils from "../../../../utils/utils";
import HangUpIcon from "./assets/HandUpIcon.png";
import NotificationIcon from "./assets/HugoMeetLogo-256x256.png"

// Components
import PeerVideo from "./components/peerVideo/peerVideo";
import JoiningNotificationElement from "./components/notification/notification";

import "./roomLayerCSS.css";

let PeersConnection = new Map();

export default function	RoomLayer(props) {
	const [_Peers, set_Peers] = useState([]);
	const [_PendingInvitation, set_PendingInvitation] = useState([]);

	const history = useHistory();
	const { roomId } = useParams();

	///////////////////////////////////////////////////////////////////////////////
	//	Client Input

	function	handUpCall() {
		if (window.SignalingSocket && window.SignalingSocket.readyState === 1) {
			const peersRTCObjs = PeersConnection.values();
			for (const peerRtcObj of peersRTCObjs) {
				peerRtcObj.PC.close();
			}
			PeersConnection.clear();
			window.SignalingSocket.close();
		}
		history.push("/");
	}

	function	toggleAudio() {
		props.onChangeAudioStatus(!props.audio)
		.then((newStream) => {
			console.log("Update Audio", newStream);
		});

		// Send message to inform everyon than I turn off/on my audioChannel
		sendMessageToEveryoneInTheRoom(JSON.stringify({ type: "audioStateChange", _id: props.selfId, audio: !props.audio }));
		const peerIndex = Utils.getPeerIndexFrom_Id(props.selfId, _Peers);
		if (peerIndex !== -1) {
			const peers = [..._Peers];
			peers[peerIndex].audio = !props.audio;
			set_Peers(peers);
		}
	}

	function	toggleVideo() {
		props.onChangeVideoStatus(!props.video)
		.then((newStream) => {
			if (!props.video) {
				PeersConnection.forEach((peerConnection) => {
					sendStreamsToPeers(peerConnection.PC, newStream);
				});
			}
		});

		sendMessageToEveryoneInTheRoom(JSON.stringify({ type: "videoStateChange", _id: props.selfId, video: !props.video }));
	}

	///////////////////////////////////////////////////////////////////////////////
	//	DataChanel

	function	DConOpen(dc, peerId) {
		console.log(`DC_${peerId}:\tConnected`);

		// Send your audio/video status
		dc.send(JSON.stringify({ type: "audioStateChange", _id: props.selfId, audio: props.audio }));
		dc.send(JSON.stringify({ type: "videoStateChange", _id: props.selfId, video: props.video }));
	}

	function	DConMessage(peerId, msg) {
		// Parse JSON msg
		try {
			msg = JSON.parse(msg.data);
		} catch (err) {
			console.error(`DC_${peerId}:\tError: ${err}`);
			return;
		}
		console.log(`DC_${peerId}:\tMessage Receveived`, msg.type);

		const peerIndex = Utils.getPeerIndexFrom_Id(msg._id, _Peers);
		if (peerIndex === -1) {
			// Update Audio status
			console.error(`DC_${peerId}:\tFailed to find peerIndex from`, msg._id);
			return;
		}

		if (msg.type === "audioStateChange") {
			// Update Audio status
			const peers = [..._Peers];
			peers[peerIndex].audio = msg.audio;
			set_Peers(peers);
		}
		else if (msg.type === "videoStateChange") {
			// Update Video status
			const peers = [..._Peers];
			peers[peerIndex].video = msg.video;
			set_Peers(peers);
		}
	}

	function	DConClose(peerId) {
		console.log(`DC_${peerId}:\tDisconnected`);
	}

	function	DConError(dc, event, peerId) {
		console.error(`DC_${peerId}:\tError:\t${event.error}`, event);
		dc.close();
	}

	function	initDCFunctions(dataChannel, peerId) {
		dataChannel.onopen = () => DConOpen(dataChannel, peerId);
		dataChannel.onmessage = (msg) => DConMessage(peerId, msg);
		dataChannel.onclose = () => DConClose(peerId);
		dataChannel.onerror = (event) => DConError(dataChannel, event, peerId);
	}

	function	sendMessageToEveryoneInTheRoom(msg) {
		// send message to everyone in the room excepte you
		const peersRTCObjs = PeersConnection.values();
		for (const peerRtcObj of peersRTCObjs) {
			if (peerRtcObj._id !== props.selfId) {
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

	function	sendStreamsToPeers(connection, stream) {
		// This function isn't efficient but there is no bug for simple usage.
		// (My guess is that it my crash when restarting the camera too much like 100 times or more)
		if (connection) {
			// remove all tracks
			const senders = connection.getSenders();
			senders.forEach((sender) => connection.removeTrack(sender));
			// Add all new track
			stream.getTracks().forEach((track) => connection.addTrack(track, stream));
		}
		else {
			console.error("Try to update peers with the new stream but peerConnection was not establish")
		}
	}

	function	onIceCandidate(e, peerId) {
		if (!e.candidate) {
			// This function is triggered one last time with an empty candidate when all candidate are send
			// And if the first triggered has a empty candidate it mean that the previous webrtc session has not be correctly be stoped
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
		if (video) {
			video.srcObject = event.streams[0];
		}
		else {
			console.error("WebRTC:\tStream received was not able to be apply to the peer video");
		}
		const connection = PeersConnection.get(peerId);
		connection.stream = event.streams[0];
		PeersConnection.set(peerId, connection);
	}

	function	onNegotiationNeeded(connection, peerId) {
		if (window.localStream) {
			// Send your streams to the peer (Audio/Video)
			sendStreamsToPeers(connection, window.localStream);
		}

		// Create/Set your own local description
		connection.createOffer()
		.then((offer) => {
			connection.setLocalDescription(offer)
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
	}

	function	setRemoteThenLocalDescription(connection, offer, peerId) {

		if (connection.connectionState === "stable") {
			return;
		}

		connection.setRemoteDescription(offer)
		.then(() => console.log(`WebRTC:\tClient_${peerId}:\tRemote description set`));

		connection.createAnswer()
		.then((answer) => {
			connection.setLocalDescription(answer)
			.then(() => console.log(`WebRTC:\tLocal description set`));

			// Send your local description to the peer
			let descriptor = {
				to: peerId,
				type: "Answer",
				answer: answer
			}
			console.log(`WebRTC:\tSend Answer to Client_${peerId}`);
			window.SignalingSocket.send(JSON.stringify(descriptor));
		});
	}

	// When a new client wish to connect with you
	function	sendAnswerBasedOffer(offer, peerId) {
		console.log(`WebRTC:\t>>> New peer connection with: Client_${peerId} <<<`);

		let newConnection = new RTCPeerConnection(props.rtcOptions);
		newConnection.onicecandidate = (event) => onIceCandidate(event, peerId);
		newConnection.ontrack = (event) => onTrack(event, peerId);
		newConnection.onnegotiationneeded = (event) => onNegotiationNeeded(event.currentTarget, peerId);

		newConnection.ondatachannel = (event) => {
			// this function will be executed when the two peers has set theyr local/remote description
			const peerConnection = PeersConnection.get(peerId);
			peerConnection.DC = event.channel;
			initDCFunctions(peerConnection.DC, peerId);
		};

		if (window.localStream) {
			// Send your streams to the peer (Audio/Video)
			sendStreamsToPeers(newConnection, window.localStream);
		}

		setRemoteThenLocalDescription(newConnection, offer, peerId);

		return ({
			PC: newConnection,
			DC: null // We return null because DC will be set when `ondatachannel` will be triggered
		});
	}

	// when you ask a peer to be connected with
	function	createNewPeerConnection(peerId) {
		console.log(`WebRTC:\t>>> Create peer connection with: Client_${peerId} <<<`);

		let newConnection = new RTCPeerConnection(props.rtcOptions);
		newConnection.onicecandidate = (event) => onIceCandidate(event, peerId);
		newConnection.ontrack = (event) => onTrack(event, peerId);
		newConnection.onnegotiationneeded = (event) => onNegotiationNeeded(event.currentTarget, peerId);

		// TODO: Make sure of the importance of this line (I think it's already set to `sendrecv`)
		newConnection.addTransceiver("video", { direction: "sendrecv" });
		newConnection.addTransceiver("audio", { direction: "sendrecv" });

		// Create DataChannel
		let dataChannel = newConnection.createDataChannel(`HugoMeet_${roomId}`);
		initDCFunctions(dataChannel, peerId);

		return ({
			PC: newConnection,
			DC: dataChannel
		});
	}

	function	RTCMessageDispatcher(msg) {
		if (msg.type === "Offer") {
			// somemone new has join the room and send you an offer start a peer connection

			if (PeersConnection.has(msg.from)) {
				// Update webrtc descriptions (renegotiation)
				console.log(`WebRTC:\t>>> Client_${msg.from} send you his Offer <<<`);
				const connection = PeersConnection.get(msg.from).PC;
				setRemoteThenLocalDescription(connection, msg.offer, msg.from);
			}
			else {
				// Create a new connection with the peer
				const newValues = sendAnswerBasedOffer(msg.offer, msg.from);
				const AlreadyexistingValues = PeersConnection.get(msg.from);

				PeersConnection.set(msg.from, {
					_id: msg.from,
					...AlreadyexistingValues,
					...newValues
				});
			}
			return;
		}

		let connection = PeersConnection.get(msg.from);
		if (!connection) {
			throw Error(`You receive a RTC message from a undefined peer:\t${msg.type}`);
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
				console.warn(`WebRTC:\tClient_${msg.from}:\tSend you a not valid ICE candidate`);
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

	async function	onRoomSetup(msg) {
		set_Peers(msg.peers);

		const video = document.getElementById(`LocalStream`);
		if (video) {
			video.srcObject = window.localStream;
		}
		else {
			console.error("WebRTC:\tStream received was not able to be apply to the peer video");
		}

		// Connect with all peers in the room
		for (const peer of msg.peers) {
			if (peer._id !== props.selfId) {
				PeersConnection.set(peer._id, {
					_id: peer._id,
					...createNewPeerConnection(peer._id)
				});
			}
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	//	Web Socket

	// If you'r the owner notification of which want to join the room will be send to you
	// This function will send them they'r responces
	function	sendJoinRequestResponce(approved, id) {
		set_PendingInvitation([..._PendingInvitation.filter((value) => {
			return (value._id !== id);
		})]);

		window.SignalingSocket.send(JSON.stringify({
			type: "JoinRequestResponce",
			to: id,
			approved: approved
		}))
	}

	async function	WSonMessage(msg) {
		try {
			// WebSocket message are always stringify JSON (in my case)
			msg = JSON.parse(msg.data);
		} catch (err) {
			console.error(`Cannot parse message: ${msg.data}\nError: ${err}`);
			return ;
		}
		console.log(`--> SS: ${msg.type}`)

		if (msg.type === "RoomSetupCallback") {
			// This will initialise the room from your side
			onRoomSetup(msg);
		}
		else if (msg.type === "clientJoin") {
			// Add to the peer map (we dont create peerConnection because he will ask us to connect)
			set_Peers([..._Peers, msg.newPeer]);
		}
		else if (msg.type === "clientLeave") {
			if (msg.role === "Client" || msg.role === "Owner") {
				// If it was a client or the owner of the room, close is PeerConnection
				const peerConnection = PeersConnection.get(msg.from);
				if (peerConnection) {
					if (peerConnection.PC && peerConnection.PC.connectionState === "connected") {
						peerConnection.PC.close();
					}
					if (peerConnection.DC && peerConnection.DC.connectionState === "connected") {
						peerConnection.DC.close();
					}
					PeersConnection.delete(msg.from);
				}

				const newPeers = _Peers.filter((peer) => {
					return (peer._id !== msg.from);
				});
				set_Peers(newPeers);
			}
			else if (msg.role === "Pending" && _PendingInvitation.length > 0) {
				// If it was a client who was waiting for joining in the room, remove is invitation
				set_PendingInvitation([..._PendingInvitation.filter((value) => {
					return (value._id !== msg.from);
				})]);
			}
		}
		else if (msg.type === "OwnershipReceived") {
			console.log("You've been promoted");
			// TODO: Show the admin panel or something
		}
		else if (msg.type === "JoinRequestReceived") {
			console.log("Someone want to join the room:", msg.from);

			if (window.Notification && window.Notification.permission === "granted") {
				new Notification('Hugo Meet - Joining request', {
					body: `${msg.name} ask you for joining the room`,
					icon: NotificationIcon,
					requireInteraction: true,
					silent: false
				});
			}
			set_PendingInvitation([..._PendingInvitation, { name: msg.name, _id: msg.from }]);
		}
		else if (Utils.rtc.isRTCMessage(msg.type)) {
			// msg.type === Offer | Answer | IceCandidate
			RTCMessageDispatcher(msg);
		}
		else {
			console.error(`Msg dropped because type ${msg.type} is unknown`);
		}
	}

	function	WSonClose(event) {
		console.log(`WS close: ${event.code}${event.reason && ` - ${event.reason}`}`, event);
		handUpCall();
	}

	function	WSonError(event) {
		console.log(`WS error:`, event);
		window.SignalingSocket.close();
	}

	window.SignalingSocket.onmessage = WSonMessage;
	window.SignalingSocket.onclose = WSonClose;
	window.SignalingSocket.onerror = WSonError;

	///////////////////////////////////////////////////////////////////////////////
	//	UseEffect

	useEffect(() => {
		// Could have been done in the `JoinRequestCallback` but I like it better that way (less props parameters)
		// This will be triggered only once at the time your joining the room and will fetch all the peer in the room with you
		window.SignalingSocket.send(JSON.stringify({
			type: "RoomSetup",
			to: props.selfId
		}));
	}, [false]);

	useEffect(() => {
		// Thanks to react _Peers wont be updated in the function DConMessage
		// and since I need _Peers values in DConMessage I reassigne each time it change
		// I Also could store a copy in the window variable but I didn't like it
		const peersRTC = Array.from(PeersConnection.values());
		for (const peerRTC of peersRTC) {
			if (peerRTC.DC) {
				peerRTC.DC.onmessage = (msg) => DConMessage(peerRTC._id, msg);
			}
		}
	}, [_Peers])

	///////////////////////////////////////////////////////////////////////////////
	//	Render

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

	console.log("RoomLayer:\tRefresh");
	return (
		<div className="RoomLayer">
			{/* NOTIFICATION */}
			{_PendingInvitation.map((invitation, index) =>
				<JoiningNotificationElement key={index} index={index}
					clientId={invitation._id}
					name={invitation.name}
					onResponce={sendJoinRequestResponce}
				/>
			)}
			{/* VIDEOS */}
			<div className="RL-VideoContainer" style={{ gridTemplateColumns: `${"auto ".repeat(numberOfColumns[_Peers.length])}` }}>
				{_Peers.map((peer, index) => (props.selfId && peer._id === props.selfId ?
						<PeerVideo key={index} index={index}
							id="LocalStream"
							stream={window.localStream}
							name={peer.name}
							audio={props.audio}
							video={props.video}
							muted
							mirrored
						/>
						:
						<PeerVideo key={index} index={index}
							id={`VideoStream_${peer._id}`}
							stream={PeersConnection.get(peer._id)?.stream}
							name={peer.name}
							audio={peer.audio}
							video={peer.video}
						/>
					))
				}
			</div>
			{/* BUTTONS UNDER VIDEOS */}
			<div className="RL-ToolsBox">
				<div className="RL-TB-Left">
					<div className="RL-TB-L-RoomId">
						{roomId}
					</div>
				</div>
				<div className="RL-TB-Center">
					<div className={`RL-TB-C-Button-${props.audio ? "On" : "Off"} Center-Button-MicroStatus`} touchstart={toggleAudio} onClick={toggleAudio}>
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
					<div className={`RL-TB-C-Button-${props.video ? "On" : "Off"} Center-Button-CameraStatus`} touchstart={toggleVideo} onClick={toggleVideo}>
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
					<div className={`RL-TB-C-Button-Off Center-Button-LeaveRoom`} touchstart={handUpCall} onClick={handUpCall}>
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