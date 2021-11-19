/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   roomPage.jsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: hcabel <hcabel@student.42.fr>              +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2021/11/19 22:49:23 by hcabel            #+#    #+#             */
/*   Updated: 2021/11/19 22:49:23 by hcabel           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, {useState, useEffect} from "react";
import { useHistory, useParams } from "react-router-dom";

import "./roomPageCSS.css";

// Layers
import PreRoomLayer from "./Layers/InvitationLayer/preRoomLayer";
import RoomLayer from "./Layers/RoomLayer/roomLayer";

import Utils from "../../utils/utils";

export default function	RoomPage() {
	const [_Audio, set_Audio] = useState(true);
	const [_Video, set_Video] = useState(true);
	const [_HasJoin, set_HasJoin] = useState(false);
	const [_SelfId, set_SelfId] = useState("");
	const [_RtcOptions, set_RtcOptions] = useState("");

	const history = useHistory();
	const { roomId } = useParams();

	function	onConnectionCallback(msg) {
		set_SelfId(msg.selfId);
		set_RtcOptions({ ...msg.peerConnectionOptions });
	}

	///////////////////////////////////////////////////////////////////////////////
	//	Media audio/video

	async function	InitStreams(audio, video) {
		console.log("Initstream with: ", audio, video);

		// You cant user `getUserMedia` with all constraints to false
		if (audio === false && video === false) {
			if (window.localStream) {
				window.localStream.getTracks().forEach((track) => {
					track.stop();
				});
			}
			return;
		}

		if (!navigator.mediaDevices) {
			alert("This site is untrusted we cant access to the camera/or and microphone !");
			return;
		}

		// Request audio & video separatly in case one of them are unvailable but not the other
		if (audio) {
			navigator.mediaDevices.getUserMedia({ audio: true })
			.then((localStream) => {
				const video = document.getElementById("LocalStream");
				Utils.media.combineStream(localStream, video);
			})
			.catch((e) => {
				set_Audio(false);
				Utils.media.catchError(e)
			});
		}
		if (video) {
			navigator.mediaDevices.getUserMedia({ video: true })
			.then((localStream) => {
				const video = document.getElementById("LocalStream");
				Utils.media.combineStream(localStream, video);
			})
			.catch((e) => {
				set_Video(false);
				Utils.media.catchError(e)
			});
		}
	}

	function	onChangeAudioStatus(audio) {
		set_Audio(audio);

		const audioTracks = window.localStream.getAudioTracks();
		if (audioTracks && audioTracks.length > 0) { // If already been initialised
			// Enable/disable audio track
			audioTracks.forEach((track) => {
				track.enabled = audio;
			});
		}
		else {
			// Init new audio tracks
			InitStreams(true, false);
		}
	}

	function	onChangeVideoStatus(video) {
		set_Video(video);

		if (video === false) {
			// Kill already existing video tracks
			window.localStream.getVideoTracks().forEach((track) => {
				track.stop();
			});
		}
		else {
			// init new video track
			InitStreams(false, true);
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	//	UseEffect

	// If you enter in a room with a wrong RoomId
	useEffect(() => {
		if (!Utils.idGenerator.isRoomIDValid(roomId)) {
			history.push("/");
		}
	}, [roomId]);

	useEffect(() => {
		if (Utils.idGenerator.isRoomIDValid(roomId)) {
			InitStreams(_Audio, _Video);
		}
	}, [false]);

	console.log("Refresh:\tRoomPage");
	return (
		<div className="RoomPage">
			{_HasJoin === false ?
				<PreRoomLayer
					onChangeAudioStatus={onChangeAudioStatus}
					onChangeVideoStatus={onChangeVideoStatus}
					onJoin={() => set_HasJoin(true)}
					onConnectionCallback={onConnectionCallback}
					audio={_Audio}
					video={_Video}
					selfId={_SelfId}
				/>
			:
				<RoomLayer
					onChangeAudioStatus={onChangeAudioStatus}
					onChangeVideoStatus={onChangeVideoStatus}
					audio={_Audio}
					video={_Video}
					selfId={_SelfId}
					rtcOptions={_RtcOptions}
				/>
			}
		</div>
	);
};