/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   landingPage.jsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: hcabel <hcabel@student.42.fr>              +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2021/11/19 22:49:17 by hcabel            #+#    #+#             */
/*   Updated: 2022/02/28 16:32:29 by hcabel           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, {useState} from "react";
import {useHistory} from "react-router-dom";

import "./landingPageCSS.css"

import Header from "../header/Header";

import Presentation_1_Img from "./assets/Presentation_1_Img.png"
import Presentation_2_Img from "./assets/Presentation_2_Img.png"
import Presentation_3_Img from "./assets/Presentation_3_Img.png"

import Utils from "../../utils/utils";

const	PresentationPhotos = [
	Presentation_1_Img,
	Presentation_2_Img,
	Presentation_3_Img
];
const	PresentationTitle = [
	"Get a link that you can share",
	"See everyone together",
	"Your meeting is safe"
];
const	PresentationText = [
	"Click New meeting to get a link that you can send to people that you want to meet with",
	"See multiple people at the same time (with some lag)",
	"Almost no one can join a meeting unless invited or admitted by the host"
];

export default function LandingPage()
{
	const history = useHistory();
	const [_PresentationIndex, set_PresentationIndex] = useState(0);
	const [_Value, set_Value] = useState("");
	const [_Focused, set_Focused] = useState(false);

	function createNewRoom() {
		const newRoomId = Utils.idGenerator.generateRoomID(9);
		history.push("/room/" + newRoomId);
	}

	function joinRoom(roomId) {
		if (!Utils.idGenerator.isRoomIDValid(roomId)) {
			console.warn("RoomID is not valid !");
			return;
		}
		history.push("/room/" + roomId);
	}

	return (
		<div className="LandingPage">
			<Header />
			<div className="LP-Body">
				<div className="LP-B-TextAndButton">
					<div className="LP-B-TAB-Text">
						HugoMeet, now available for everyone, for free.
					</div>
					<div className="LP-B-TAB-Text2">
						Welcome to my video meeting platform. I made this to show my WebRTC skills. I hope you like it and maybe find it useful.
					</div>
					<div className="LP-B-TAB-Button">
						<div className="LP-B-TAB-B-CreateNewRoom" onClick={createNewRoom}>
							<div className="LP-B-TAB-B-CNR-Img"></div>
							<div className="LP-B-TAB-B-CNR-Text">
								New meeting
							</div>
						</div>
						<div className="LP-B-TAB-B-JoinRoom">
							<label className={`LP-B-TAB-B-JR-Label${_Focused ? "Blue" : "Grey"}`}>
								<div className="LP-B-TAB-B-JR-L-Img"></div>
								<input className="LP-B-TAB-B-JR-L-Input"
									type="text"
									value={_Value}
									autoComplete="off"
									id="i3"
									aria-controls="i4"
									aria-describedby="i4"
									placeholder="Enter a code"
									spellCheck="false"
									maxLength="50"
									onChange={(e) => set_Value(e.target.value)}
									onFocus={() => set_Focused(true)}
									onBlur={() => set_Focused(false)}
								>
								</input>
							</label>
							{(_Focused || _Value.length > 0) &&
								<button
									className="LP-B-TAB-B-JR-Button"
									style={{ color: (Utils.idGenerator.isRoomIDValid(_Value) ? "#1a73e8" : "rgba(60,64,67,0.38)")}}
									onClick={() => (Utils.idGenerator.isRoomIDValid(_Value) ? joinRoom(_Value) : undefined)}
								>
									Join
								</button>
							}
						</div>
					</div>
					<div className="LP-B-TAB-HR"></div>
					<div className="LP-B-TAB-MoreInfos">
						<span className="LP-MI-Span">
							<a className="LP-MI-S-Href" href="https://www.youtube.com/channel/UCuKL6gBO82AEBAFc5lWJQFg">Learn more</a> about HugoMeet
						</span>
						<span className="LP-MI-Span">
							contact@hugomeet.com
						</span>
					</div>
				</div>
				<div className="LP-B-ImgList">
					<div className="LP-B-IL-Content">
						<button className="LP-B-IL-C-ButtonLeft" onClick={() => set_PresentationIndex(_PresentationIndex - 1)} disabled={(_PresentationIndex <= 0)}>
							<svg width="24" height="24" viewBox="0 0 24 24" focusable="false" className="LP-B-IL-C-BL-Arrow">
								<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"></path>
							</svg>
						</button>
						<div className="LP-B-IL-C-Content">
							<div className="LP-B-IL-C-C-TextImage">
								<img width="100%" height="100%" alt="presentation images" src={PresentationPhotos[_PresentationIndex]} ></img>
								<div className="LP-B-IL-C-C-TI-text">
									<div className="LP-B-IL-C-C-TI-T-Title">
										{PresentationTitle[_PresentationIndex]}
									</div>
									<div className="LP-B-IL-C-C-TI-T-Text">
										{PresentationText[_PresentationIndex]}
									</div>
								</div>
							</div>
						</div>
						<button className="LP-B-IL-C-ButtonRight" onClick={() => set_PresentationIndex(_PresentationIndex + 1)} disabled={(_PresentationIndex >= 2)}>
						<svg width="24" height="24" viewBox="0 0 24 24" focusable="false" className="LP-B-IL-C-BR-Arrow">
							<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"></path>
						</svg>
						</button>
					</div>
					<div className="LP-B-IL-IndexList">
						<div className={"LP-B-IL-IL-Item " + (_PresentationIndex === 0 ? "CurrentItem" : "")}></div>
						<div className={"LP-B-IL-IL-Item " + (_PresentationIndex === 1 ? "CurrentItem" : "")}></div>
						<div className={"LP-B-IL-IL-Item " + (_PresentationIndex === 2 ? "CurrentItem" : "")}></div>
					</div>
					<div className="LP-B-IL-MoreInfos">
						<span className="LP-MI-Span">
							<a className="LP-MI-S-Href" href="https://www.youtube.com/channel/UCuKL6gBO82AEBAFc5lWJQFg">Learn more</a> about HugoMeet
						</span>
						<span className="LP-MI-Span">
							contact@hugomeet.com
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
