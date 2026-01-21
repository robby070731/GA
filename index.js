const express = require("express");
require("dotenv").config()
const { Server } = require("socket.io");
const { createServer } = require('http');
const app = express();
const server = createServer(app);

app.use(express.static("public"));

server.listen(process.env.port || 3456, () => {
	console.log("Server is running");
});

const io = new Server(server);

io.on('connection', (socket) => {
	console.log('a user connected');
	socket.on("chat",(msg)=>{
		console.log("Message: " + msg);
		io.emit("chat", msg);
	})
});