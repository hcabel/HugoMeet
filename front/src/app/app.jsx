import React from "react";
import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";

import LandingPage from "./pages/landingPages/landingPage";

export default function	App()
{
	return (
		<Router>
			<Switch>
				<Route exact path="/" component={LandingPage} />
				<Route render={() => <Redirect to="/" />} />
			</Switch>
		</Router>

	);
}