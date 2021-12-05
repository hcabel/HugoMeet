/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   peerVideo.jsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: hcabel <hcabel@student.42.fr>              +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2021/12/05 17:25:13 by hcabel            #+#    #+#             */
/*   Updated: 2021/12/05 17:25:16 by hcabel           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import "./peerVideoCSS.css";

export default function PeerVideo(props) {

	///////////////////////////////////////////////////////////////////////////////
	//	Render

	function	setStream(video, stream) {
		if (video) {
			// If you want to change the srcObject of a video you need to paused them before
			// So this function will return the appropriate stream depending on both stream id
			// and will pause the video if a switch of stream is required
			const videoStream = video.srcObject;
			if (stream && videoStream) {
				if (video.id === stream.id) {
					return (videoStream);
				}
				video.pause();
				video.srcObject = stream;
			}
			else if (!videoStream && !stream) {
				return (undefined);
			}
			return (videoStream ? videoStream : stream);
		}
		return (undefined);
	}

	return (
		<div id={`RL-VC-Video-${props.index}`} className="RL-VC-Peer">
			<video
				className="RL-VC-P-Video"
				id={props.id}
				src={setStream(document.getElementById(`RL-VC-Video-${props.index}`)?.children[0], props.stream)}
				autoPlay
				muted={props.muted}
			/>
			<div className="RL-VC-P-Name">
				{props.name}
			</div>
			{props.audio === false &&
				<div className="RL-VC-P-AudioStatus">
					<svg width="24px" height="24px" viewBox="0 0 24 24" fill="#000000">
						<path d="M0 0h24v24H0zm0 0h24v24H0z" fill="none"></path>
						<path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"></path>
					</svg>
				</div>
			}
		</div>
	)
};