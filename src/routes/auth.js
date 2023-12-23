const express = require("express");
const app = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const error = require("../structs/error.js");
const functions = require("../structs/functions.js");
const tokenCreation = require("../tokenManager/tokenCreation.js");
const { verifyToken, verifyClient } = require("../tokenManager/tokenVerify.js");
const User = require("../model/user.js");

app.post("/account/api/oauth/token", async (req, res) => {
    let clientId;

    try {
        clientId = functions.DecodeBase64(req.headers["authorization"].split(" ")[1]).split(":")[0];
        if (!clientId) throw new Error("invalid client id");
    } catch {
        return handleError(res, "errors.com.epicgames.common.oauth.invalid_client", "Invalid or missing Authorization header.", [], 1011, "invalid_client", 400);
    }

    switch (req.body.grant_type) {
        case "client_credentials":
            handleGrant(req, res, clientId, "client_credentials", 4);
            break;
        case "password":
            handlePasswordGrant(req, res);
            break;
        case "refresh_token":
            handleGrant(req, res, clientId, "refresh_token", 24);
            break;
        case "exchange_code":
            handleExchangeCodeGrant(req, res);
            break;
        default:
            handleError(res, "errors.com.epicgames.common.oauth.unsupported_grant_type", `Unsupported grant type: ${req.body.grant_type}`, [], 1016, "unsupported_grant_type", 400);
            return;
    }
});

app.get("/account/api/oauth/verify", verifyToken, (req, res) => verifyTokenEndpoint(req, res));
app.get("/account/api/oauth/exchange", verifyToken, (req, res) => handleExchangeEndpoint(req, res));
app.delete("/account/api/oauth/sessions/kill", (req, res) => res.status(204).end());
app.delete("/account/api/oauth/sessions/kill/:token", handleKillSessionEndpoint);
app.post("/auth/v1/oauth/token", handleAuthV1TokenEndpoint);
app.post("/epic/oauth/v2/token", handleEpicOauthV2TokenEndpoint);

function handleError(res, errorCode, errorMessage, errorData, errorCodeNumber, errorType, statusCode = 400) {
    return error.createError(errorCode, errorMessage, errorData, errorCodeNumber, errorType, statusCode, res);
}

function handleGrant(req, res, clientId, grantType, hoursExpire) {
    let ip = req.ip;
    let clientToken = global.clientTokens.findIndex(i => i.ip == ip);

    if (clientToken != -1) global.clientTokens.splice(clientToken, 1);

    const token = tokenCreation.createClient(clientId, grantType, ip, hoursExpire);

    functions.UpdateTokens();

    const decodedClient = jwt.decode(token);

    res.json({
        access_token: `eg1~${token}`,
        expires_in: calculateExpiresIn(decodedClient.creation_date, decodedClient.hours_expire),
        expires_at: calculateExpiresAt(decodedClient.creation_date, decodedClient.hours_expire),
        token_type: "bearer",
        client_id: clientId,
        internal_client: true,
        client_service: "fortnite"
    });
}

async function handlePasswordGrant(req, res) {
    // Implementation for "password" grant type
    // ...
}

async function handleExchangeCodeGrant(req, res) {
    // Implementation for "exchange_code" grant type
    // ...
}

function verifyTokenEndpoint(req, res) {
    // Implementation for verifyToken endpoint
    // ...
}

function handleExchangeEndpoint(req, res) {
    // Implementation for handleExchangeCodeGrant endpoint
    // ...
}

function handleKillSessionEndpoint(req, res) {
    // Implementation for handleKillSessionEndpoint endpoint
    // ...
    res.status(204).end();
}

function handleAuthV1TokenEndpoint(req, res) {
    // Implementation for handleAuthV1TokenEndpoint endpoint
    // ...
}

function handleEpicOauthV2TokenEndpoint(req, res) {
    // Implementation for handleEpicOauthV2TokenEndpoint endpoint
    // ...
}

function calculateExpiresIn(creationDate, hoursExpire) {
    return Math.round(((DateAddHours(new Date(creationDate), hoursExpire).getTime()) - (new Date().getTime())) / 1000);
}

function calculateExpiresAt(creationDate, hoursExpire) {
    return DateAddHours(new Date(creationDate), hoursExpire).toISOString();
}

function DateAddHours(pdate, number) {
    let date = pdate;
    date.setHours(date.getHours() + number);
    return date;
}

module.exports = app;
