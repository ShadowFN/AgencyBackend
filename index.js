const express = require("express");
const app = express();
const mongoose = require("mongoose");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const { MakeID, sleep } = require("./structs/functions");
const { createError } = require("./structs/error");
const { backend, error } = require("./structs/log");

const tokensFile = "./tokenManager/tokens.json";
const clientSettingsDir = "./ClientSettings";
const tokenPrefix = "eg1~";
const exchangeCodes = [];

global.JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 8080;

if (!fs.existsSync(clientSettingsDir)) {
  fs.mkdirSync(clientSettingsDir);
}

let tokens = JSON.parse(fs.readFileSync(tokensFile).toString());

// Token expiration check and update
Object.keys(tokens).forEach(tokenType => {
  tokens[tokenType] = tokens[tokenType].filter(token =>
    isTokenValid(token.token)
  );
});

fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));

global.accessTokens = tokens.accessTokens;
global.refreshTokens = tokens.refreshTokens;
global.clientTokens = tokens.clientTokens;

mongoose.connect(config.mongodb.database, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => backend("Agency connected to MongoDB!"))
  .catch(err => {
    error("MongoDB failed to connect.");
    throw err;
  });

app.use(setRateLimit());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

registerRoutes();

startServer();

handle404Errors();

function isTokenValid(token) {
  let decodedToken = jwt.decode(token.replace(tokenPrefix, ""));
  return DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).getTime() > new Date().getTime();
}

function DateAddHours(pdate, number) {
  let date = pdate;
  date.setHours(date.getHours() + number);
  return date;
}

function setRateLimit() {
  return rateLimit({ windowMs: 0.5 * 60 * 1000, max: 45 });
}

function registerRoutes() {
  const routesPath = path.join(__dirname, "routes");
  fs.readdirSync(routesPath).forEach(fileName => {
    app.use(require(path.join(routesPath, fileName)));
  });
}

function startServer() {
  app.listen(PORT, () => {
    backend(`Agency started on port ${PORT}`);

    require("./xmpp/xmpp.js");
    require("./DiscordBot");
  }).on("error", async (err) => {
    if (err.code === "EADDRINUSE") {
      error(`Port ${PORT} is already in use!\nClosing in 3 seconds...`);
      await sleep(3000);
      process.exit(0);
    } else throw err;
  });
}

function handle404Errors() {
  app.use((req, res, next) => {
    createError(
      "errors.com.epicgames.common.not_found",
      "Sorry the resource you were trying to find could not be found",
      undefined,
      1004,
      undefined,
      404,
      res
    );
  });
}
