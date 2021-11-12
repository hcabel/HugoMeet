import React, {useState} from "react";
import PreRoomLayer from "./Layers/InvitationLayer/preRoomLayer";
import RoomLayer from "./Layers/RoomLayer/roomLayer";

import "./roomPageCSS.css";

export default function	RoomPage() {
	const [_InRoom] = useState(true);

	return (
		<div className="RoomPage">
			{_InRoom === false ?
				<PreRoomLayer />
			:
				<RoomLayer />
			}
		</div>
	);
};