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
 
```
Här förklarar jag koden ovan....
***
