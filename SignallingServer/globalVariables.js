// Allow peer connection from the outside of your network
// (But not if they'r behing a symetric NAT, I didn't implement a TURN server)
const peerConnectionOptions = {
	iceServers: [{
		urls: ["stun:stun.l.google.com:19302"]
	}, {
		urls: ["stun:stun1.l.google.com:19302"]
	}, {
		urls: ["stun:stun2.l.google.com:19302"]
	}, {
		urls: ["stun:stun3.l.google.com:19302"]
	}]
};

const rooms = new Map(); // <RoomId, ClientArray>

module.exports = {
	peerConnectionOptions,
	rooms
}