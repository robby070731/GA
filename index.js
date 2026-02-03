const express = require("express");
require("dotenv").config();
const { Server } = require("socket.io");
const { createServer } = require('http');
const fs = require("fs").promises;
const app = express();
const server = createServer(app);
const bcrypt = require("bcryptjs");
const escape = require("escape-html")
const session = require("express-session");
const { get } = require("https");
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

function auth(req, res, next){
    if(req.session.loggedIn) return next();
    res.redirect("/?error=Not logged in...");
}

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
    await fs.writeFile(`data/${file}.json`,JSON.stringify(data,null, 4));
}
//Hämtar data från json
async function getData(file){
    return JSON.parse((await fs.readFile(`data/${file}.json`)));
}

io.on('connection', (socket) => {
	console.log('a user connected');
    console.log(socket.request.session.email)
	socket.on("chat",(msg)=>{
		console.log("Message: " + msg);
		io.emit("chat", msg);
	})
})

app.get("/troubleshoot", (req, res)=>{
    res.send(req.session)
})

app.get("/", async (req, res)=>{
    const games = await getData("games");
    const html = games.map(g=>`
        <div class="games">
            <a href="/moreinfo?gameId=${g.gameId}">
                <h2>${escape(g.title)}</h2>
                <div class="imgBox">
                    <img src="${escape(g.imgSRC)}" alt="">
                </div>
            </a>
        </div>
        `).join("");
    res.send(await render(req, html));
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

app.get("/addGameForm", auth, async (req, res)=>{
    const addGameHtml = `
        <div id="addGame">
            <h2>Add Game</h2>
            <form action="/addGame" method="post">
                <input type="text" name="title" placeholder="Title">
                <input type="url" name="imgSRC" placeholder="IMG-Link">
                <input type="text" name="desc" placeholder="Description">
                <input type="submit" value="Add Game">
            </form>
        </div>`;
    const html = await render(req, addGameHtml);
    res.send(html);
})

app.post("/addGame", auth, async (req, res)=>{
    const title = req.body.title;
    const imgSRC = req.body.imgSRC;
    const desc = req.body.desc;
    const author = req.session.email;
    const gameId = "id:" + Date.now();
    const games = await getData("games");
    games.push({title, imgSRC, desc, author, gameId});
    await saveData(games, "games");
    res.redirect("/?success")
})

app.post("/register", async (req, res)=>{
    const username = req.body.username;
    const email = req.body.email;
    const accounts = await getData("accounts");
    if(accounts.find(a=>a.email == email)) return res.send(await render(req,"<h1>There is already a user with this email</h1>"));
    if(req.body.password !== req.body.passwordConfirm) return res.send(await render(req,"<h1>Password doesn't match</h1>"));
    const password = await bcrypt.hash(req.body.password, 12);
    const accountId = "id:" +  Date.now();
    accounts.push({username, email, password, accountId});
    await saveData(accounts, "accounts");
    res.redirect("/loginForm");
})

app.post("/login", async (req, res)=>{
    // Hämtar data från login formulär och existerande användare
    const email = req.body.email;
    const password = req.body.password;
    const existUsers = await getData("accounts");
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

app.get("/logout",(req,res)=>{
    req.session.destroy();
    res.clearCookie("connect.sid");
    res.redirect("/");
})