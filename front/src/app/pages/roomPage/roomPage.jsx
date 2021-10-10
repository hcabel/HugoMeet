import React from "react";
import {useParams} from "react-router-dom";

export default function	Room()
{
	let { roomId } = useParams();

	console.log("ID: ", roomId);
	return (
		<div className="RoomPage">
			{roomId}
		</div>
	);
};