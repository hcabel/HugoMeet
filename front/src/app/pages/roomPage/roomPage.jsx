import React, {useState, useEffect} from "react";
import {useParams} from "react-router-dom";
import config from "../../config";

let SignalingSocket = null;

export default function	RoomPage()
{
	const [_LoadingMessage, set_LoadingMessage] = useState("");

	let { roomId } = useParams();

	useEffect(() => {
		function	connectClient() {
			console.log("START");
			set_LoadingMessage("Connection to the Signaling Server...");
			if (!window.WebSocket) {
				set_LoadingMessage("FAILED: Your browser's version is to old.");
			}

			SignalingSocket = new window.WebSocket(`${config.url_signaling}?roomid=${roomId}`);

			SignalingSocket.onopen = function (event) {
				set_LoadingMessage("SUCCEEDED: Connection to the Signaling server establish.");
				console.log(event);
			};
		}

		connectClient();
	}, [roomId]);

	return (
		<div className="RoomPage">
			{_LoadingMessage}
		</div>
	);
};