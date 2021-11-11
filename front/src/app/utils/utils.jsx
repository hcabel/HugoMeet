import rtc from "./rtc";
import idGenerator from "./idGenerator";

function	catchMediaError(e) {
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

export default {
	rtc,
	idGenerator,
	catchMediaError
}