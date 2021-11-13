import React, {useState, useEffect} from "react";

import "./roomPageCSS.css";

// Layers
import PreRoomLayer from "./Layers/InvitationLayer/preRoomLayer";
import RoomLayer from "./Layers/RoomLayer/roomLayer";

import Utils from "../../utils/utils";

export default function	RoomPage() {
	const [_Audio, set_Audio] = useState(true);
	const [_Video, set_Video] = useState(true);
	const [_Name, set_Name] = useState("");

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

	useEffect(() => {
		InitStreams(_Audio, _Video);
	}, [false]);

	console.log("Refresh:\tRoomPage");
	return (
		<div className="RoomPage">
			{_Name === "" ?
				<PreRoomLayer
					onChangeAudioStatus={onChangeAudioStatus}
					onChangeVideoStatus={onChangeVideoStatus}
					audio={_Audio}
					video={_Video}
					onJoin={(name) => set_Name(name)}
				/>
			:
				<RoomLayer
					onChangeAudioStatus={onChangeAudioStatus}
					onChangeVideoStatus={onChangeVideoStatus}
					audio={_Audio}
					video={_Video}
					name={_Name}
				/>
			}
		</div>
	);
};