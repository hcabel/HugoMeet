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

function	combineStream(stream1, stream2) {
	if (stream1 && stream2) {
		// Create a new stream with the tracks of both stream (Filter non active tracks)
		const allTracks = [...stream1.getTracks(), ...stream2.getTracks()];
		return (new MediaStream(allTracks.filter((track) => (track.readyState === "live"))));
	}
	else if (!stream1 && !stream2) {
		return (undefined);
	}
	return (stream1 ? stream1 : stream2);
}

function	killTracks(tracks, stream) {
	if (stream && tracks) {
		tracks.forEach((track) => {
			track.stop();
			stream.removeTrack(track);
		})
	}
}

export default {
	combineStream,
	killTracks,
	catchError
}