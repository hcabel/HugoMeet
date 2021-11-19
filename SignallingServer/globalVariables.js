/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   globalVariables.js                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: hcabel <hcabel@student.42.fr>              +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2021/11/19 22:48:50 by hcabel            #+#    #+#             */
/*   Updated: 2021/11/19 22:48:51 by hcabel           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Allow peer connection from the outside of your network
// (But not if they'r behing a symetric NAT, I didn't implement a TURN server)
const peerConnectionOptions = {
	iceServers: [{
		urls: ["stun:stun.l.google.com:19302"]
	}, {
		urls: ["stun:stun1.l.google.com:19302"]
	}, {
		urls: ["stun:stun2.l.google.com:19302"]
	}, {
		urls: ["stun:stun3.l.google.com:19302"]
	}]
};

const rooms = new Map(); // <RoomId, ClientArray>

module.exports = {
	peerConnectionOptions,
	rooms
}