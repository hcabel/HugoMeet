function	isRTCMessage(msgType) {
	if (msgType === "Offer"
		|| msgType === "Answer"
		|| msgType === "IceCandidate"
	) {
		return (true);
	}
	return (false);
}

export default {
	isRTCMessage
}