/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   app.jsx                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: hcabel <hcabel@student.42.fr>              +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2021/11/19 22:49:07 by hcabel            #+#    #+#             */
/*   Updated: 2021/11/19 22:49:07 by hcabel           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, {useEffect} from "react";
import { Switch, Route, Redirect, useHistory } from "react-router-dom";

import LandingPage from "./pages/landingPage/landingPage";
import RoomPage from "./pages/roomPage/roomPage";

export default function	App()
{
	const history = useHistory();

	useEffect(() => {
		return (history.listen((e) => {
			// If go on a page that isn't a room page
			if (!e.pathname.includes("/room/")) {
				if (window.SignalingSocket) {
					// Close signaling WebSocket
					if (window.SignalingSocket.readyState === 0 || window.SignalingSocket.readyState === 1) {
						window.SignalingSocket.close();
					}
					window.SignalingSocket = null;
				}

				if (window.localStream) {
					// Close Camera and Audio
					window.localStream.getTracks().forEach((tracks) => {
						if (tracks.readyState === "live") {
							tracks.stop();
						}
					});
				}
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