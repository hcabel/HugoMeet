/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.js                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: hcabel <hcabel@student.42.fr>              +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2021/11/19 22:49:02 by hcabel            #+#    #+#             */
/*   Updated: 2021/11/19 22:49:02 by hcabel           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import ReactDOM from 'react-dom';
import {BrowserRouter as Router} from "react-router-dom";
import { CookiesProvider } from 'react-cookie';

import App from "./app/app"

ReactDOM.render(
	<React.StrictMode>
		<Router>
			<CookiesProvider>
				<App />
			</CookiesProvider>
		</Router>
	</React.StrictMode>,
	document.getElementById('root')
);