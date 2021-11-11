function	catchError(e) {
	switch (e.name) {
		case "NotFoundError":
			alert("Unable to open your call because no camera and/or microphone were found");
			break;
		case "SecurityError":
		case "PermissionDeniedError":
			break;
		case "NotAllowedError":
			break;
		default:
			alert("Error opening your camera and/or microphone: " + e.message);
			break;
	}
}

function	combineStream(localStream, video) {
	if (!window.localStream) { // mean it never been initialised before
		video.onloadedmetadata = () => video.play(); // play once video stream is setup
		video.muted = true;	// Mute my own video to avoid hearing myself
	}
	else {
		// Combine previous track with the new one
		window.localStream.getTracks().forEach((track) => {
			localStream.addTrack(track);
		});
	}

	video.srcObject = localStream;
	window.localStream = localStream;
}

export default {
	combineStream,
	catchError
}