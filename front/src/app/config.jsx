
const prefix = "http";
const url = "localhost";

const config = {
	url_front: `${prefix}://${url}:3000`,
	url_signaling: `${prefix.replace("http", "ws")}://${url}:3000`
}

export default config;