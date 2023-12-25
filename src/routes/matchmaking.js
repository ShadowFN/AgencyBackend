const express = require("express");
const app = express.Router();
const fs = require("fs");
const functions = require("../src/structs/functions.js");
const { verifyToken, verifyClient } = require("../src/token/tokenVerify.js");

let buildUniqueId = {};

// Route for finding a player in matchmaking session
app.get("/fortnite/api/matchmaking/session/findPlayer/*", (req, res) => {
    res.status(200).end();
});

// Route for getting matchmaking ticket for a player
app.get("/fortnite/api/game/v2/matchmakingservice/ticket/player/*", verifyToken, (req, res) => {
    if (typeof req.query.bucketId !== "string") {
        return res.status(400).end();
    }

    if (req.query.bucketId.split(":").length !== 4) {
        return res.status(400).end();
    }

    buildUniqueId[req.user.accountId] = req.query.bucketId.split(":")[0];

    const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());

    res.json({
        serviceUrl: `ws://${config.matchmakerIP}`,
        ticketType: "mms-player",
        payload: "69=",
        signature: "420="
    });
    res.end();
});

// Route for getting matchmaking account session
app.get("/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId", (req, res) => {
    res.json({
        accountId: req.params.accountId,
        sessionId: req.params.sessionId,
        key: "none"
    });
});

// Route for getting matchmaking session details
app.get("/fortnite/api/matchmaking/session/:sessionId", verifyToken, (req, res) => {
    const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());

    let gameServerInfo = {
        serverAddress: "127.0.0.1",
        serverPort: 7777
    };

    try {
        let calculateIp = config.gameServerIP.split(":")[0];
        let calculatePort = Number(config.gameServerIP.split(":")[1]);

        if (calculateIp) {
            gameServerInfo.serverAddress = calculateIp;
        }

        if (Number.isNaN(calculatePort) || !calculatePort) {
            throw new Error("Invalid port.");
        }

        gameServerInfo.serverPort = calculatePort;
    } catch {}

    const sessionDetails = {
        id: req.params.sessionId,
        ownerId: functions.MakeID().replace(/-/ig, "").toUpperCase(),
        ownerName: "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        serverName: "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        serverAddress: gameServerInfo.serverAddress,
        serverPort: gameServerInfo.serverPort,
        // i need to add rest of the details
        lastUpdated: new Date().toISOString(),
        started: false
    };

    res.json(sessionDetails);
});

// Routes for joining a matchmaking session
app.post("/fortnite/api/matchmaking/session/*/join", (req, res) => {
    res.status(204).end();
});

app.post("/fortnite/api/matchmaking/session/matchMakingRequest", (req, res) => {
    res.json([]);
});

module.exports = app;
