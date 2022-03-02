/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   notification.jsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: hcabel <hcabel@student.42.fr>              +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2021/12/05 17:25:04 by hcabel            #+#    #+#             */
/*   Updated: 2021/12/05 17:26:11 by hcabel           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import "./notificationCSS.css";

export default function Notification(props) {

	function formatName(value) {
		if (value.length > 23) {
			return (value.slice(0, 20) + "...");
		}
		return (value.slice(0, 23));
	}

	return (
		<div key={props.index} className="RL-Invitation" style={{ top: `${40 * props.index}px` }}>
			<div className="RL-I-Content">
				<span className="RL-I-C-Name">
					{formatName(props.name)}
				</span>
				wants to join the room
			</div>
			<div className="RL-I-Buttons">
				<div
					className="RL-I-B-Allow"
					onClick={() => props.onResponce(true, props.clientId)}
				>
					allow
				</div>
				<div
					className="RL-I-B-Denied"
					onClick={() => props.onResponce(false, props.clientId)}
				>
					deny
				</div>
			</div>
		</div>
	);
};