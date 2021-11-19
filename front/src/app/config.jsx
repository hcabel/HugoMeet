/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   config.jsx                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: hcabel <hcabel@student.42.fr>              +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2021/11/19 22:49:04 by hcabel            #+#    #+#             */
/*   Updated: 2021/11/19 22:49:51 by hcabel           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const prefix = "http";
const url = "192.168.0.138";

const config = {
	url_front: `${prefix}://${url}:3000`,
	url_signaling: `${prefix.replace("http", "ws")}://${url}:8042`
}

export default config;