const express = require("express");
require("dotenv").config();
const { Server } = require("socket.io");
const { createServer } = require('http');
const fs = require("fs").promises;
const app = express();
const server = createServer(app);
const bcrypt = require("bcryptjs");
const session = require("express-session");
const io = new Server(server);
const sessionMiddleware = session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: {  }
})

io.engine.use(sessionMiddleware);
app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));
app.use(sessionMiddleware)

server.listen(process.env.port || 3456, () => {
	console.log("Server is running");
})


async function render(req,data){
    const template = await fs.readFile("index.html","utf8");
    let html = template.replace("%content%",data);
    // Placerar olika nav baserat på om du är inloggad
    if(req.session.loggedIn){
        html = html.replace("%placeholderNav%","<nav><h2><a href=\"/\">HOME</a></h2><h2><a href=\"/addGameForm\">Add Game</a></h2><h2><a href=\"/logout\">Log Out</a></h2></nav>")
        return html;
    }
    html = html.replace("%placeholderNav%","<nav><h2><a href=\"/\">HOME</a></h2><div></div><div><h2><a href=\"/registerForm\">Register</a></h2><h2><a href=\"/loginForm\">Login</a></h2></div></nav>")
    return html;
}

async function saveData(data, file){
    await fs.writeFile(file,JSON.stringify(data,null, 4));
}
//Hämtar data från json
async function getData(file){
    return JSON.parse((await fs.readFile(file)));
}

io.on('connection', (socket) => {
	console.log('a user connected');
    console.log(socket.request.session.email)
	socket.on("chat",(msg)=>{
		console.log("Message: " + msg);
		io.emit("chat", msg);
	})
})

app.get("/", async (req, res)=>{
    res.send(await render(req, ""));
})

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
	const html = await render(req, loginHtml);
	res.send(html);
})

app.get("/registerForm", async (req, res)=>{
    const registerHtml =`
        <div id="register">
            <h2>Login</h2>
            <form action="/register" method="post">
                <input type="text" name="username" placeholder="Username">
                <input type="email" name="email" placeholder="E-mail">
                <input type="password" name="password" placeholder="Password">
                <input type="password" name="passwordConfirm" placeholder="Confirm Password">
                <input type="submit" value="Register">
            </form>
        </div>`;
    const html = await render(req, registerHtml);
    res.send(html);
})

app.post("/register", async (req, res)=>{
    const username = req.body.username;
    const email = req.body.email;
    const accounts = await getData("data/accounts.json");
    if(accounts.find(a=>a.email == email)) return res.send(await render(req,"<h1>There is already a user with this email</h1>"));
    if(req.body.password !== req.body.passwordConfirm) return res.send(await render(req,"<h1>Password doesn't match</h1>"));
    const password = await bcrypt.hash(req.body.password, 12);
    const accountId = "id:" +  Date.now();
    accounts.push({username,email,password,accountId});
    await saveData(accounts,"data/accounts.json");
    res.redirect("/?success");
})

app.post("/login", async (req, res)=>{
    // Hämtar data från login formulär och existerande användare
    const email = req.body.email;
    const password = req.body.password;
    const existUsers = await getData("data/accounts.json");
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