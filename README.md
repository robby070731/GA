# Dokumenation IFF
## GA 2026

### Server Start
```js
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
    cookie: {}
})

server.listen(process.env.port || 3456, () => {
    console.log("Server is running");
})
```
Den här koden sätter upp grunden för en serverapplikation i Node.js. Den importerar nödvändiga bibliotek som används för att hantera HTTP-förfrågningar (Express), realtidskommunikation (Socket.IO), sessionshantering och lösenordskryptering. Den skapar en Express-app och kopplar den till en HTTP-server. Dessutom konfigureras en sessionsmiddleware som används för att hantera användarsessioner, där inställningar som hemlig nyckel och cookie-hantering definieras.
***

### Middleware
```js
io.engine.use(sessionMiddleware);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware)

// Authorization function
function auth(req, res, next) {
    if (req.session.loggedIn) return next();
    res.redirect("/?error=Not logged in...");
}
```
Den här delen av koden kopplar sessionshanteringen till både Express och Socket.IO, så att samma session kan användas i realtidskommunikation. Den konfigurerar även middleware för att servera statiska filer och hantera formulärdata från klienten.

Dessutom definieras en autentiseringsfunktion (auth) som kontrollerar om användaren är inloggad via sessionen. Om användaren är inloggad får den fortsätta till nästa steg, annars omdirigeras den till startsidan med ett felmeddelande.
***

### Render Funktion
```js
// Hämtar template.html och placerar innehåll
async function render(req, data) {
    const template = await fs.readFile("index.html", "utf8");
    let html = template.replace("%content%", data);
    // Placerar olika nav baserat på om du är inloggad
    if (req.session.loggedIn) {
        html = html.replace("%placeholderNav%", "<nav><h2><a href=\"/\">HOME</a></h2><h2><a href=\"/addGameForm\">Add Game</a></h2><h2><a href=\"/logout\">Log Out</a></h2></nav>")
        return html;
    }
    html = html.replace("%placeholderNav%", "<nav><h2><a href=\"/\">HOME</a></h2><div></div><div><h2><a href=\"/registerForm\">Register</a></h2><h2><a href=\"/loginForm\">Login</a></h2></div></nav>")
    return html;
}
```
Den här funktionen `render` läser in en HTML-mall och ersätter en platshållare med dynamiskt innehåll. Den anpassar även navigationsmenyn beroende på om användaren är inloggad eller inte, genom att kontrollera sessionen. Om användaren är inloggad visas länkar för att t.ex. logga ut och lägga till innehåll, annars visas länkar för registrering och inloggning.
*** 

### Json Funktioner
```js
// Sparar data till json fil
async function saveData(data, file) {
    await fs.writeFile(`data/${file}.json`, JSON.stringify(data, null, 4));
}

// Hämtar data från json fil
async function getData(file) {
    return JSON.parse((await fs.readFile(`data/${file}.json`)));
}
```
Dessa funktioner används för att hantera data i JSON-filer. `saveData` sparar data till en fil genom att konvertera den till JSON-format, medan `getData` läser in data från en fil och omvandlar den tillbaka till ett JavaScript-objekt.
***

### Socket anslutning
```js
io.on('connection', (socket) => {
    console.log('a user connected');
    console.log(socket.request.session.email);

    // Här ligger hanteringen av kommentarer som förklaras efter detta

    })
```
Den här koden hanterar nya WebSocket-anslutningar via Socket.IO. När en klient ansluter loggas ett meddelande i konsolen, samt användarens e-postadress hämtad från sessionen, vilket gör det möjligt att identifiera den anslutna användaren.
***

#### Nya Kommentarer
```js
    // Funktion för att hantera nya kommentarer
    socket.on("comment", async (comment, gameId) => {
        // Olika kollar för att validera kommentarer
        if (!comment) return;
        if (typeof comment !== "string" || comment.length > 100) return;
        const username = socket.request.session.username;
        if (!username) return;

        const content = comment;
        const commentId = "id:" + Date.now();
        const comments = await getData("comments");
        let specComments = comments.find(c => c.gameId == gameId);
        if (!specComments) {
            comments.push({ gameId, "comments": [] });
            specComments = comments.find(c => c.gameId == gameId);
        }
        specComments.comments.push({ username, commentId, content });
        await saveData(comments, "comments");

        // Bygger escapad html att skicka till clienten
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
```
Den här funktionen hanterar inkommande kommentarer via WebSocket. Den validerar kommentaren, hämtar användarens namn från sessionen och sparar kommentaren i en JSON-fil kopplad till ett specifikt spel. Om det inte redan finns en kommentarslista för spelet skapas en ny.

Efter att kommentaren sparats byggs säker (escapad) HTML upp och skickas ut till alla anslutna klienter i realtid. Om kommentaren tillhör den inloggade användaren inkluderas även knappar för att redigera eller ta bort kommentaren.
***

#### Ändra Kommentarer
```js
    // Funktion för att ändra kommentarer
    socket.on("editComment", async (commentValue, commentId, gameId) => {
        // Validerar
        if (!gameId || !commentId) return
        if (!commentValue || commentValue.length > 100) return
        if (typeof commentValue !== "string");

        const allComments = await getData("comments");
        const gameComments = allComments.find(c => c.gameId === gameId);
        const specComment = gameComments.comments.find(c => c.commentId === commentId);
        if (!socket.request.username === specComment.username) return
        specComment.content = commentValue;
        await saveData(allComments, "comments");
        const html = `<p>${escape(commentValue)}</p>`;
        io.emit("editComment", html, commentId);
    })
```
Den här funktionen hanterar redigering av kommentarer via WebSocket. Den validerar inkommande data, hittar rätt kommentar baserat på spel- och kommentars-ID, och kontrollerar att det är rätt användare som försöker göra ändringen.

Om allt är giltigt uppdateras kommentaren i JSON-filen, och den nya (escapade) HTML-strukturen skickas ut till alla klienter så att ändringen visas i realtid.
***

#### Ta Bort Kommentarer
```js
    // Funktion för att radera kommentarer
    socket.on("deleteComment", async (commentId, gameId) => {
        if (!gameId || !commentId) return
        const allComments = await getData("comments");
        const gameComments = allComments.find(c => c.gameId === gameId);
        const specComment = gameComments.comments.find(c => c.commentId === commentId);
        if (!socket.request.username === specComment.username) return
        gameComments.comments = gameComments.comments.filter(c => c.commentId !== commentId);
        await saveData(allComments, "comments");
        io.emit("deleteComment", commentId);
    })
```
Den här funktionen hanterar borttagning av kommentarer via WebSocket. Den kontrollerar att nödvändiga ID:n finns, hämtar rätt kommentar och säkerställer att det är rätt användare som försöker ta bort den.

Om kontrollen godkänns tas kommentaren bort från JSON-filen och en uppdatering skickas ut till alla klienter i realtid så att kommentaren försvinner från gränssnittet.
***

### Startsida
```js
// Homepage
app.get("/", async (req, res) => {
    const games = await getData("games");

    // Mappar alla spel som html
    const html = games.map(g => `
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
```
Den här routen hanterar startsidan. Den hämtar alla spel från en JSON-fil och omvandlar dem till HTML som visas på sidan. Varje spel presenteras med titel och bild samt en länk till en detaljsida.

Slutligen skickas innehållet till render-funktionen, som placerar det i HTML-mallen och returnerar den färdiga sidan till klienten.
***

### Mer info sida
```js
// Route for more info on a specific game
app.get("/moreInfo", async (req, res) => {
    const gameId = req.query.gameId;
    const game = (await getData("games")).find(g => g.gameId == gameId);
    const comments = (await getData("comments")).find(c => c.gameId == gameId);

    // Massiv template string för all html på more info sidan
    const html = `
        <script>const gameId = "${game.gameId}";</script>
        <div class="game">
            <div class="gameInfo">
                <div class="imgBox">
                    <img src="${escape(game.imgSRC)}" alt="">
                </div>
                <div class="gameText">
                    <h3>${escape(game.title)}</h3>
                    <p>${escape(game.desc)}</p>
                </div>
            </div>
            ${req.session.loggedIn && req.session.email == game.author ? `
            <div class="change">
                <div class="update">
                    <h2>Update</h2>
                    <form action="/update?gameId=${game.gameId}" method="post">
                        <input type="text" name="title" placeholder="Title" maxlength="50" value="${escape(game.title)}">
                        <input type="text" name="imgUrl" placeholder="Image URL">
                        <input type="text" name="desc" placeholder="Description" maxlength="250" value="${escape(game.desc)}">
                        <input type="submit" value="Update">
                    </form>
                </div>
                <button onclick="confirmDelete('${game.gameId}');">Delete</button>
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
```
Den här routen visar en detaljsida för ett specifikt spel baserat på ett gameId från query-parametern. Den hämtar spelets information samt tillhörande kommentarer från JSON-filer och bygger upp hela sidans HTML.

Sidan visar spelets bild, titel och beskrivning, samt alla kommentarer. Om användaren är inloggad visas även ett formulär för att skriva kommentarer. Om användaren är ägare av spelet visas dessutom funktioner för att uppdatera eller ta bort spelet.
***

### Login Formulär
```js
// Route för login formulär
app.get("/loginForm", async (req, res) => {
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
```
Den här routen visar ett inloggningsformulär. Den genererar HTML för att användaren ska kunna ange e-post och lösenord, och skickar sedan innehållet via render-funktionen för att placeras i sidmallen innan det returneras till klienten.
***

### Register formulär
```js
// Route för register formulär
app.get("/registerForm", async (req, res) => {
    const registerHtml = `
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
```
Den här routen visar ett registreringsformulär där användaren kan skapa ett konto genom att ange användarnamn, e-post och lösenord. HTML-innehållet skickas vidare till render-funktionen för att placeras i sidmallen innan det returneras till klienten.
***

### Formulär för att lägga till spel
```js
// Route för add game formulär
app.get("/addGameForm", auth, async (req, res) => {
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
```
Den här routen visar ett formulär för att lägga till ett nytt spel. Den är skyddad av auth-middleware, vilket innebär att endast inloggade användare kan komma åt sidan. Formuläret låter användaren ange titel, bild-URL och beskrivning, och skickas sedan vidare till render-funktionen för att placeras i sidmallen innan det returneras till klienten.
***

### Login route/funktion
```js
// Login funktionalitet
app.post("/login", async (req, res) => {
    // Hämtar data från login formulär och existerande användare
    const email = req.body.email;
    const password = req.body.password;
    const existUsers = await getData("accounts");
    const user = existUsers.find(u => u.email === email);
    // Kollar email och jämför lösenord
    if (!user) return res.redirect("/loginform?error=Incorrect credentials");
    const pwCheck = await bcrypt.compare(password, user.password);
    if (!pwCheck) return res.redirect("/loginform?error=Incorrect credentials");
    // Uppdatarar sessioms / kaka 
    req.session.loggedIn = true;
    req.session.email = email;
    req.session.username = user.username;
    res.redirect("/?login_success");
})
```
Den här routen hanterar inloggning av användare. Den hämtar e-post och lösenord från formuläret och jämför dem med sparade användarkonton i en JSON-fil. Om användaren inte finns eller om lösenordet är fel skickas användaren tillbaka med ett felmeddelande.

Om inloggningen lyckas verifieras lösenordet med bcrypt, och sessionen uppdateras med användarens inloggningsstatus, e-post och användarnamn. Därefter omdirigeras användaren till startsidan.
***

### Register route/funktionalitet
```js
// Register funktionalitet
app.post("/register", async (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const accounts = await getData("accounts");
    if (accounts.find(a => a.email == email)) return res.send(await render(req, "<h1>There is already a user with this email</h1>"));
    if (req.body.password !== req.body.passwordConfirm) return res.send(await render(req, "<h1>Password doesn't match</h1>"));
    const password = await bcrypt.hash(req.body.password, 12);
    const accountId = "id:" + Date.now();
    accounts.push({ username, email, password, accountId });
    await saveData(accounts, "accounts");
    res.redirect("/loginForm");
})
```
Den här routen hanterar registrering av nya användare. Den hämtar användardata från formuläret och kontrollerar först om e-postadressen redan finns registrerad. Den verifierar även att lösenord och lösenordsbekräftelse matchar.

Om valideringen godkänns hashas lösenordet med bcrypt och ett nytt användarkonto skapas med ett unikt ID. Kontot sparas i en JSON-fil och användaren omdirigeras sedan till inloggningssidan.
***

### Route/funktionalitet för att lägga till spel
```js
// Add game funktionalitet
app.post("/addGame", auth, async (req, res) => {
    const title = req.body.title.trim() || "No_Title";
    const imgSRC = req.body.imgSRC;
    const desc = req.body.desc.trim() || "No_Desc";
    const author = req.session.email;
    const gameId = "id:" + Date.now();
    const games = await getData("games");
    games.push({ title, imgSRC, desc, author, gameId });
    await saveData(games, "games");
    res.redirect("/?success")
})
```
Den här routen hanterar skapandet av nya spel och är skyddad av auth-middleware, vilket innebär att endast inloggade användare kan använda den. Den hämtar data från formuläret, rensar och validerar viss input, och sätter standardvärden om fält saknas.

Ett nytt spelobjekt skapas med ett unikt ID och användarens e-post som författare, och sparas sedan i en JSON-fil. Därefter omdirigeras användaren tillbaka till startsidan med en bekräftelse.
***

### Route/funktionalitet för att ta bort spel
```js
// Delete funktionalitet
app.get("/delete", auth, async (req, res) => {
    const gameId = req.query.gameId;
    const allGames = await getData("games");

    // Kollar så att du har behörighet att radera
    if (!req.session.email === allGames.find(g => g.gameId === gameId).author) return res.redirect("/?error=Not Authorized");
    const comments = await getData("comments");

    // Tar bort spelet och dess kommentarer
    await saveData(allGames.filter(g => g.gameId !== gameId), "games");
    await saveData(comments.filter(c => c.gameId !== gameId), "comments");
    res.redirect("/");
})
```
Den här routen hanterar borttagning av ett spel och är skyddad av auth-middleware. Den kontrollerar först att den inloggade användaren är ägare av spelet innan borttagning tillåts.

Om användaren har behörighet tas spelet bort från JSON-filen, och alla tillhörande kommentarer raderas samtidigt. Därefter omdirigeras användaren tillbaka till startsidan.
***

### Route/funktion för att logga ut
```js
// Logout funktionalitet
app.get("/logout", (req, res) => {
    // Rensar session / kakor och tar dig till homepage
    req.session.destroy();
    res.clearCookie("connect.sid");
    res.redirect("/");
})
```
Den här routen hanterar utloggning av användaren. Den förstör den aktiva sessionen, rensar sessions-cookien och loggar därmed ut användaren. Därefter omdirigeras användaren till startsidan.
***

###
```js

```

***

###
```js

```

***

