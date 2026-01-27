const express = require("express");
require("dotenv").config()
const { Server } = require("socket.io");
const { createServer } = require('http');
const fs = require("fs").promises;
const app = express();
const server = createServer(app);
const bcrypt = require("bcryptjs");
const session = require("express-session");

app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: {  }
}))


server.listen(process.env.port || 3456, () => {
	console.log("Server is running");
});

const io = new Server(server);

async function render(req,data){
    const template = await fs.readFile("public/index.html","utf8");
    let html = template.replace("%content%",data);
    // Placerar olika nav baserat på om du är inloggad
/*     if(req.session.loggedIn){
        html = html.replace("%placeholderNav%","<nav><h2><a href=\"/\">HOME</a></h2><h2><a href=\"/addGameForm\">Add Game</a></h2><h2><a href=\"/logout\">Log Out</a></h2></nav>")
        return html;
    }
    html = html.replace("%placeholderNav%","<nav><h2><a href=\"/\">HOME</a></h2><div></div><div><h2><a href=\"/registerForm\">Register</a></h2><h2><a href=\"/loginForm\">Login</a></h2></div></nav>") */
    return html;
}

async function saveData(data, file){
    await fs.writeFile(file,JSON.stringify(data,null, 3));
}
//Hämtar data från json
async function getData(file){
    return JSON.parse((await fs.readFile(file)));
}





io.on('connection', (socket) => {
	console.log('a user connected');
	socket.on("chat",(msg)=>{
		console.log("Message: " + msg);
		io.emit("chat", msg);
	})
});

app.get("/loginForm", async (req, res)=>{
	const loginHtml = `
		<div id="login">
    		<h2>Login</h2>
    		<form action="/login" method="post">
        		<input type="email" name="email" placeholder="E-mail">
        		<input type="password" name="password" placeholder="Password">
        		<input type="submit" value="Login">
    		</form>
		</div>`;
	const html = await render(req, loginHtml)
	console.log(html)
	res.send(html)
})

app.post("/login", async (req, res)=>{
    // Hämtar data från login formulär och existerande användare
    const email = req.body.email;
    const password = req.body.password;
    const existUsers = await getData("data/users.json");
    const user = existUsers.find(u=>u.email===email);
    // Kollar email och jämför lösenord
    if(!user) return res.send(await render(req,"<h1>Incorrect credentials</h1>"));
    const pwCheck = await bcrypt.compare(password, user.password);
    if(!pwCheck) return res.send(await render(req,"<h1>Incorrect credentials</h1>"));
    // Uppdatarar sessioms / kaka 
    req.session.loggedIn = true;
    req.session.email = email;
    res.redirect("/?login_success");
})