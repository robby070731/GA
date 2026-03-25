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

async function getData(file){
    return JSON.parse((await fs.readFile(`data/${file}.json`)));
}

io.on('connection', (socket) => {
	console.log('a user connected');
    console.log(socket.request.session.email)
	socket.on("comment", async (comment, gameId)=>{
        if(comment.length > 100) return
		console.log("Message: " + comment);
        const username = socket.request.session.username;
        if(!username) return;
        const content = comment;
        const commentId = "id:" + Date.now();
        const comments = await getData("comments");
        let specComments = comments.find(c=>c.gameId == gameId);
        console.log(specComments);
        if(!specComments){
            comments.push({gameId,"comments":[]});
            specComments = comments.find(c=>c.gameId == gameId);
        }
        specComments.comments.push({username, commentId, content});
        await saveData(comments, "comments");
        const html = `
            <div class="comment" id="${commentId}">
                <div class="content">
                    <p>${escape(username)}</p>
                    <p>${escape(content)}</p>
                </div>
                ${socket.request.session.username === username ? `
                <div class="icons">
                    <i class="material-icons commentIcon" onclick="commentEdit(event)">edit</i>
                    <i class="material-icons commentIcon" onclick="commentDelete(event)">delete</i>
                </div>`: ""}
            </div>`;
		io.emit("comment", html);
	})
    socket.on("editComment", async (commentValue, commentId, gameId)=>{
        if(!gameId || !commentId) return
        if(!commentValue || commentValue.length > 100) return
        console.log("puss")
        const allComments = await getData("comments");
        const gameComments = allComments.find(c=>c.gameId === gameId);
        const specComment = gameComments.comments.find(c=>c.commentId === commentId);
        if(!socket.request.username === specComment.username) return
        specComment.content = commentValue;
        await saveData(allComments, "comments");
        const html = `<p>${escape(commentValue)}</p>`;
        io.emit("editComment", html, commentId);
    })
    socket.on("deleteComment", async (commentId, gameId)=>{
        if(!gameId || !commentId) return
        const allComments = await getData("comments");
        const gameComments = allComments.find(c=>c.gameId === gameId);
        const specComment = gameComments.comments.find(c=>c.commentId === commentId);
        if(!socket.request.username === specComment.username) return
        gameComments.comments = gameComments.comments.filter(c=>c.commentId !== commentId);
        await saveData(allComments, "comments");
        io.emit("deleteComment", commentId);
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

app.get("/moreInfo", async (req, res)=>{
    const gameId = req.query.gameId;
    const game = (await getData("games")).find(g=>g.gameId == gameId);
    const comments = (await getData("comments")).find(c=>c.gameId == gameId);
    const html = `
        <script>const gameId = "${game.gameId}";</script>
        <div class="game">
            <div class="gameInfo">
                <h3>${escape(game.title)}</h3>
                <img src="${escape(game.imgSRC)}" alt="">
                <p>${escape(game.desc)}</p>
            </div>
            ${req.session.loggedIn && req.session.email == game.author ? `
            <div class="update">
                <button style="text-decoration:underline" onclick="confirmDelete('${game.gameId}');">Delete</button>
                <h2>Update</h2>
                <form action="/update?gameId=${game.gameId}" method="post">
                    <input type="text" name="title" placeholder="Title" maxlength="50" value="${escape(game.title)}">
                    <input type="text" name="imgUrl" placeholder="Image URL">
                    <input type="text" name="desc" placeholder="Description" maxlength="250" value="${escape(game.desc)}">
                    <input type="submit" value="Update">
                </form>
            </div>
            `: ""}
            ${req.session.loggedIn ? `
            <div id="commentForm">
                <h2>Comment</h2>
                <form action="" id="commentForm">
                    <input type="text" name="comment" placeholder="Comment" maxlength="100">
                </form>
            </div>`: ""}
            <div id="comments">
                ${comments && comments.comments.length ? `
                ${comments.comments.map(c => `
                <div class="comment" id="${c.commentId}">
                    <div class="content">
                        <p>${escape(c.username)}</p>
                        <p>${escape(c.content)}</p>
                    </div>
                    ${req.session.username === c.username ? `
                    <div class="icons">
                        <i class="material-icons commentIcon" onclick="commentEdit(event)">edit</i>
                        <i class="material-icons commentIcon" onclick="commentDelete(event)">delete</i>
                    </div>
                    `: ""}
                </div>`).join("")}
                `: ""}
            </div>
        </div>`;
    res.send(await render(req, html));
})

app.get("/loginForm", async (req, res)=>{
	const loginHtml = `
		<div id="login">
            <h2>Login</h2>
            <form action="/login" method="post">
                <input type="email" name="email" placeholder="E-mail" value = "image@gmail.com">
                <input type="password" name="password" placeholder="Password" value="1234">
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
                <input type="text" name="username" placeholder="Username" maxlength="50">
                <input type="email" name="email" placeholder="E-mail" maxlength="100">
                <input type="password" name="password" placeholder="Password" maxlength="25">
                <input type="password" name="passwordConfirm" placeholder="Confirm Password" maxlength="25">
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
                <input type="text" name="title" placeholder="Title" maxlength="50">
                <input type="url" name="imgSRC" placeholder="IMG-Link">
                <input type="text" name="desc" placeholder="Description" maxlength="250">
                <input type="submit" value="Add Game">
            </form>
        </div>`;
    const html = await render(req, addGameHtml);
    res.send(html);
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
    req.session.username = user.username;
    res.redirect("/?login_success");
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

app.post("/addGame", auth, async (req, res)=>{
    const title = req.body.title.trim() || "No_Title";
    const imgSRC = req.body.imgSRC;
    const desc = req.body.desc.trim() || "No_Desc";
    const author = req.session.email;
    const gameId = "id:" + Date.now();
    const games = await getData("games");
    games.push({title, imgSRC, desc, author, gameId});
    await saveData(games, "games");
    res.redirect("/?success")
})

app.get("/delete", auth, async (req, res)=>{
    const gameId = req.query.gameId;
    const allGames = await getData("games");
    if(!req.session.email === allGames.find(g=>g.gameId === gameId).author) return res.redirect("/?error=Not Authorized");
    const comments = await getData("comments");
    await saveData(allGames.filter(g=>g.gameId !== gameId), "games");
    await saveData(comments.filter(c=>c.gameId !== gameId), "comments");
    res.redirect("/");
})

app.get("/logout", (req,res)=>{
    req.session.destroy();
    res.clearCookie("connect.sid");
    res.redirect("/");
})