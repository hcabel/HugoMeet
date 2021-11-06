import { useState, useEffect } from "react";

import "./preRoomPageCSS.css";

function	PreRoomPage() {
	const [_Video, set_Video] = useState(true);
	const [_Audio, set_Audio] = useState(true);

	function	toggleAudio() {
		set_Audio(!_Audio);
	}

	function	toggleVideo() {
		set_Video(!_Video);
	}

	async function	InitStreams(audio, video) {
		console.log("Initstream with: ", audio, video);
		if (!navigator.mediaDevices) {
			alert("This site is untrusted we can access to the camera/or and microphone !");
		}

		// You cant user `getUserMedia` with all constraints to false
		if (audio === false && video === false) {
			if (window.localStream) {
				window.localStream.getTracks().forEach((track) => {
					track.stop();
				});
			}
			return;
		}

		// get Audio and Video
		navigator.mediaDevices.getUserMedia({ audio: audio, video: video })
		.then(function(localStream) {
			const video = document.getElementById("LocalStream");
			if (!video) {
				throw Error("ERROR");
			}

			if (!window.localStream) { // mean it never been initialised before
				video.onloadedmetadata = () => video.play(); // play once video stream is setup
				// video.muted = true;	// Mute my own vide to avoid hearing myself
				video.srcObject = localStream;
				window.localStream = localStream;
			}
			else {
				// Combine previous track with the new one
				const oldTracks = window.localStream.getTracks();
				oldTracks.forEach((track) => {
					localStream.addTrack(track);
				});

				video.srcObject = localStream;
				window.localStream = localStream;
			}
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

	useEffect(() => {
		InitStreams(_Audio, _Video);
	}, [false]);

	useEffect(() => {
		if (!navigator.mediaDevices) {
			alert("This site is untrusted we can access to the microphone !");
			return;
		}

		if (window.localStream) {
			const audioTracks = window.localStream.getAudioTracks();
			if (audioTracks && audioTracks.length > 0) { // If already been initialised
				// Audio track can just be mute/unmuted
				audioTracks.forEach((track) => {
					track.enabled = _Audio;
				});
			}
			else {
				InitStreams(_Audio, _Video);
			}
		}
		// else {
		// 	InitStreams(_Audio, _Video);
		// }
	}, [ _Audio ])

	useEffect(() => {
		if (!navigator.mediaDevices) {
			alert("This site is untrusted we can access to the microphone !");
			return;
		}

		if (window.localStream) {
			if (_Video === false) {
				if (window.localStream) {
					window.localStream.getVideoTracks().forEach((track) => {
						track.stop();
					});
				}
			}
			else {
				InitStreams(_Audio, _Video);
			}
		}
	}, [ _Video ])

	return (
		<div className="PreRoomPage">
			<div className="PRP-Body">
				<div className="PRP-B-Content">
					<div className="PRP-B-C-Stream">
						<div className="PRP-B-C-S-VideoShadow">
							<div className="PRP-B-C-S-VS-Video">
								<div className="PRP-B-C-S-VS-V-Inside">
									<div className="PRP-B-C-S-VS-V-I-StreamsVideo">
										<video autoPlay id="LocalStream" className="PRP-B-C-S-VS-V-I-SV-Video" />
									</div>
								</div>
								<div className="PRP-B-C-S-VS-V-Buttons">
									<div className={`PRP-B-C-S-VS-V-B-AudioButton${_Audio ? "On" : "Off"}`} onClick={toggleAudio}>
										{_Audio ?
											// Logo micro On
											<svg focusable="false" width="24" height="24" viewBox="0 0 24 24">
												<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"></path>
												<path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path>
											</svg>
											:
											// Logo micro Off
											<svg focusable="false" width="24" height="24" viewBox="0 0 24 24">
												<path d="M11 5c0-.55.45-1 1-1s1 .45 1 1v5.17l1.82 1.82c.11-.31.18-.64.18-.99V5c0-1.66-1.34-3-3-3S9 3.34 9 5v1.17l2 2V5zM2.81 2.81L1.39 4.22l11.65 11.65c-.33.08-.68.13-1.04.13-2.76 0-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c.57-.08 1.12-.24 1.64-.46l5.14 5.14 1.41-1.41L2.81 2.81zM19 11h-2c0 .91-.26 1.75-.69 2.48l1.46 1.46A6.921 6.921 0 0 0 19 11z"></path>
											</svg>
										}
									</div>
									<div className={`PRP-B-C-S-VS-V-B-VideoButton${_Video ? "On" : "Off"}`} onClick={toggleVideo}>
											{_Video ?
												// Logo video On
												<svg focusable="false" width="24" height="24" viewBox="0 0 24 24">
													<path d="M18 10.48V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4.48l4 3.98v-11l-4 3.98zm-2-.79V18H4V6h12v3.69z"></path>
												</svg>
												:
												// Logo video Off
												<svg focusable="false" width="24" height="24" viewBox="0 0 24 24">
													<path d="M18 10.48V6c0-1.1-.9-2-2-2H6.83l2 2H16v7.17l2 2v-1.65l4 3.98v-11l-4 3.98zM16 16L6 6 4 4 2.81 2.81 1.39 4.22l.85.85C2.09 5.35 2 5.66 2 6v12c0 1.1.9 2 2 2h12c.34 0 .65-.09.93-.24l2.85 2.85 1.41-1.41L18 18l-2-2zM4 18V6.83L15.17 18H4z"></path>
												</svg>
											}
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="PRP-B-C-Form">
						<div className="PRP-B-C-F-Title">
							Prêt à participer ?
						</div>
						<div className="PRP-B-C-F-SubmitButtons">
							<div className="PRP-B-C-F-SB-Participate">
								<span className="PRP-B-C-F-SB-P-Value">
									Participer
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default PreRoomPage;