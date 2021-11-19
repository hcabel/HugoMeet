# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    setup.sh                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: hcabel <hcabel@student.42.fr>              +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2021/11/19 23:31:12 by hcabel            #+#    #+#              #
#    Updated: 2021/11/19 23:31:13 by hcabel           ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

npm i -g pm2
cd front
npm i
pm2 start npm --name "HotFront" -- start
cd ../SignallingServer/
npm i
pm2 start npm --name "HotSignallingServer" -- start
