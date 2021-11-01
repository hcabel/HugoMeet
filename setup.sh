npm i -g pm2
cd front
npm i
pm2 start npm --name "HotFront" -- start
cd ../SignallingServer/
npm i
pm2 start npm --name "HotSignallingServer" -- start
