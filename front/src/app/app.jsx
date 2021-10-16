import React, {useEffect} from "react";
import { Switch, Route, Redirect, useHistory } from "react-router-dom";

import LandingPage from "./pages/landingPage/landingPage";
import RoomPage from "./pages/roomPage/roomPage";

export default function	App()
{
	const history = useHistory();

	useEffect(() => {
		return (history.listen(() => {
			// This function will be execute every time the Browser route change
			if (window.SignalingSocket) {
				if (window.SignalingSocket.readyState === 0 || window.SignalingSocket.readyState === 1) {
					window.SignalingSocket.close();
				}
				window.SignalingSocket = null;
			}

		}));
	},[ history ])

	return (
		<Switch>
			<Route exact path="/" component={LandingPage} />
			<Route exact path="/room/:roomId" component={RoomPage} />
			<Route render={() => <Redirect to="/" />} />
		</Switch>
	);
}