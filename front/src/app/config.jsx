/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   config.jsx                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: hcabel <hcabel@student.42.fr>              +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2021/11/19 22:49:04 by hcabel            #+#    #+#             */
/*   Updated: 2022/02/28 16:42:59 by hcabel           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const https = false;

let url = "localhost";

let prefix = "http";
let ssUrl = url;

if (https) {
	prefix = "https";
	url = "hugomeet.com";
	ssUrl = `signalling.${url}`;
}

const config = {
	url_front: `${prefix}://${url}${https ? "" : ":3000"}`,
	url_signaling: `${prefix.replace("http", "ws")}://${ssUrl}${https ? "" : ":8042"}`
}

export default config;
