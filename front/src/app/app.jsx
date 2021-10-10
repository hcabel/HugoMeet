import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";

import LandingPage from "./pages/landingPage/landingPage";
import RoomPage from "./pages/roomPage/roomPage";

export default function	App()
{
	return (
		<Switch>
			<Route exact path="/" component={LandingPage} />
			<Route exact path="/room/:roomId" component={RoomPage} />
			<Route render={() => <Redirect to="/" />} />
		</Switch>
	);
}