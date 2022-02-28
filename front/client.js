const express = require('express');
const port = 3000;
const path = require('path');
const http = require('http');
const app = express();
const server = http.createServer(app);

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'build')));

app.get('/*', function(req, res) {
	res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

server.listen(port, function() {
	console.log(`Running on ${port}`);
});
