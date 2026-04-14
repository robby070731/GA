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
