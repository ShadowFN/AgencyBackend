const express = require("express");
const app = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const error = require("../src/structs/errorModule.js");
const functions = require("../src/structs/functions.js");

const tokenManager = require("../src/token/tokenManager.js");
const { verifyToken, verifyClient } = require("../src/token/tokenVerify.js");
const User = require("../src/model/user.js");

app.post("/account/api/oauth/token", async (req, res) => {
    try {
        const clientId = getClientIdFromAuthorizationHeader(req.headers["authorization"]);
        
        switch (req.body.grant_type) {
            case "client_credentials":
                await handleClientCredentialsGrant(req, res, clientId);
                break;
            case "password":
                await handlePasswordGrant(req, res);
                break;
            case "refresh_token":
                await handleRefreshTokenGrant(req, res);
                break;
            case "exchange_code":
                await handleExchangeCodeGrant(req, res);
                break;
            default:
                error.createError("errors.com.epicgames.common.oauth.unsupported_grant_type",
                    `Unsupported grant type: ${req.body.grant_type}`, [], 1016, "unsupported_grant_type", 400, res);
        }
    } catch (err) {
        handleError(err, res);
    }
});

app.get("/account/api/oauth/verify", verifyToken, (req, res) => {
    try {
        const token = req.headers["authorization"].replace("bearer ", "");
        const decodedToken = jwt.decode(token.replace("eg1~", ""));
        sendVerificationResponse(req, res, decodedToken);
    } catch (err) {
        handleError(err, res);
    }
});

app.get("/account/api/oauth/exchange", verifyToken, (req, res) => {
    return res.status(400).json({
        "error": "This endpoint is deprecated, please use the discord bot to generate an exchange code."
    });
    // remove the return code above if you still want to make use of this endpoint
    try {
        const token = req.headers["authorization"].replace("bearer ", "");
        handleExchangeEndpoint(req, res, token);
    } catch (err) {
        handleError(err, res);
    }
});

app.delete("/account/api/oauth/sessions/kill", (req, res) => {
    res.status(204).end();
});

app.delete("/account/api/oauth/sessions/kill/:token", (req, res) => {
    try {
        const token = req.params.token;
        handleSessionKill(req, res, token);
    } catch (err) {
        handleError(err, res);
    }
});

app.post("/auth/v1/oauth/token", async (req, res) => {
    sendAuthV1TokenResponse(res);
});

app.post("/epic/oauth/v2/token", async (req, res) => {
    try {
        const clientId = getClientIdFromAuthorizationHeader(req.headers["authorization"]);
        await handleEpicOauthV2Token(req, res, clientId);
    } catch (err) {
        handleError(err, res);
    }
});

function handleError(err, res) {
    if (err instanceof Error) {
        return error.createError("errors.com.epicgames.common.oauth.internal_server_error",
            "Internal Server Error", [], -1, undefined, 500, res);
    } else {
        return error.createError("errors.com.epicgames.common.oauth.internal_server_error",
            "Internal Server Error", [], -1, undefined, 500, res);
    }
}

function getClientIdFromAuthorizationHeader(authorizationHeader) {
    try {
        const clientId = functions.DecodeBase64(authorizationHeader.split(" ")[1]).split(":")[0];
        if (!clientId) {
            throw new Error("Invalid client id");
        }
        return clientId;
    } catch (error) {
        throw new Error("Invalid Authorization header");
    }
}

async function handleClientCredentialsGrant(req, res, clientId) {
    try {
        const ip = req.ip;

        let clientTokenIndex = global.clientTokens.findIndex(i => i.ip === ip);
        if (clientTokenIndex !== -1) global.clientTokens.splice(clientTokenIndex, 1);

        const token = tokenManager.createClientToken(clientId, req.body.grant_type, ip, 4);

        functions.updateTokens();

        const decodedClient = jwt.decode(token);

        res.json({
            access_token: `eg1~${token}`,
            expires_in: Math.round(((DateAddHours(new Date(decodedClient.creation_date), decodedClient.hours_expire).getTime()) - (new Date().getTime())) / 1000),
            expires_at: DateAddHours(new Date(decodedClient.creation_date), decodedClient.hours_expire).toISOString(),
            token_type: "bearer",
            client_id: clientId,
            internal_client: true,
            client_service: "fortnite"
        });
    } catch (err) {
        handleError(err, res);
    }
}

async function handlePasswordGrant(req, res) {
    try {
        if (!req.body.username || !req.body.password) {
            return error.createError(
                "errors.com.epicgames.common.oauth.invalid_request",
                "Username/password is required.",
                [], 1013, "invalid_request", 400, res
            );
        }

        const { username: email, password: password } = req.body;

        req.user = await User.findOne({ email: email.toLowerCase() }).lean();

        const err = () => error.createError(
            "errors.com.epicgames.account.invalid_account_credentials",
            "Your e-mail and/or password are incorrect. Please check them and try again.",
            [], 18031, "invalid_grant", 400, res
        );

        if (!req.user) {
            return err();
        } else {
            if (!await bcrypt.compare(password, req.user.password)) {
                return err();
            }
        }
    } catch (err) {
        handleError(err, res);
    }
}

async function handleRefreshTokenGrant(req, res) {
    try {
        if (!req.body.refresh_token) {
            return error.createError(
                "errors.com.epicgames.common.oauth.invalid_request",
                "Refresh token is required.",
                [], 1013, "invalid_request", 400, res
            );
        }

        const refresh_token = req.body.refresh_token;

        let refreshTokenIndex = global.refreshTokens.findIndex(i => i.token === refresh_token);
        let object = global.refreshTokens[refreshTokenIndex];

        try {
            if (refreshTokenIndex === -1) {
                throw new Error("Refresh token invalid.");
            }

            let decodedRefreshToken = jwt.decode(refresh_token.replace("eg1~", ""));

            if (DateAddHours(new Date(decodedRefreshToken.creation_date), decodedRefreshToken.hours_expire).getTime() <= new Date().getTime()) {
                throw new Error("Expired refresh token.");
            }
        } catch {
            if (refreshTokenIndex !== -1) {
                global.refreshTokens.splice(refreshTokenIndex, 1);
                functions.updateTokens();
            }

            error.createError(
                "errors.com.epicgames.account.auth_token.invalid_refresh_token",
                `Sorry the refresh token '${refresh_token}' is invalid`,
                [refresh_token], 18036, "invalid_grant", 400, res
            );

            return;
        }

        req.user = await User.findOne({ accountId: object.accountId }).lean();
    } catch (err) {
        handleError(err, res);
    }
}

async function handleExchangeCodeGrant(req, res) {
    try {
        if (!req.body.exchange_code) {
            return error.createError(
                "errors.com.epicgames.common.oauth.invalid_request",
                "Exchange code is required.",
                [], 1013, "invalid_request", 400, res
            );
        }

        const { exchange_code } = req.body;

        let exchangeCodeIndex = global.exchangeCodes.findIndex(i => i.exchange_code === exchange_code);
        let exchange = global.exchangeCodes[exchangeCodeIndex];

        if (exchangeCodeIndex === -1) {
            return error.createError(
                "errors.com.epicgames.account.oauth.exchange_code_not_found",
                "Sorry the exchange code you supplied was not found. It is possible that it was no longer valid",
                [], 18057, "invalid_grant", 400, res
            );
        }

        global.exchangeCodes.splice(exchangeCodeIndex, 1);

        req.user = await User.findOne({ accountId: exchange.accountId }).lean();
    } catch (err) {
        handleError(err, res);
    }
}

function sendVerificationResponse(req, res, decodedToken) {
    // Implement the logic for sending verification response
    // ...
}

function handleExchangeEndpoint(req, res, token) {
    // Implement the logic for handling exchange endpoint
    // ...
}

function handleSessionKill(req, res, token) {
    // Implement the logic for handling session kill
    // ...
}

function sendAuthV1TokenResponse(res) {
    // Implement the logic for sending AuthV1 token response
    // ...
}

async function handleEpicOauthV2Token(req, res, clientId) {
    try {
        if (!req.body.refresh_token) {
            return error.createError(
                "errors.com.epicgames.common.oauth.invalid_request",
                "Refresh token is required.",
                [], 1013, "invalid_request", 400, res
            );
        }

        const refresh_token = req.body.refresh_token;

        let refreshTokenIndex = global.refreshTokens.findIndex(i => i.token === refresh_token);
        let object = global.refreshTokens[refreshTokenIndex];

        try {
            if (refreshTokenIndex === -1) {
                throw new Error("Refresh token invalid.");
            }

            let decodedRefreshToken = jwt.decode(refresh_token.replace("eg1~", ""));

            if (DateAddHours(new Date(decodedRefreshToken.creation_date), decodedRefreshToken.hours_expire).getTime() <= new Date().getTime()) {
                throw new Error("Expired refresh token.");
            }
        } catch {
            if (refreshTokenIndex !== -1) {
                global.refreshTokens.splice(refreshTokenIndex, 1);
                functions.updateTokens();
            }

            error.createError(
                "errors.com.epicgames.account.auth_token.invalid_refresh_token",
                `Sorry the refresh token '${refresh_token}' is invalid`,
                [refresh_token], 18036, "invalid_grant", 400, res
            );

            return;
        }

        req.user = await User.findOne({ accountId: object.accountId }).lean();

        res.json({
            scope: req.body.scope || "basic_profile friends_list openid presence",
            token_type: "bearer",
            access_token: "lawinsaccesstokenlol",
            refresh_token: "lawinsrefreshtokenlol",
            id_token: "lawinsidtokenlol",
            expires_in: 7200,
            expires_at: "9999-12-31T23:59:59.999Z",
            refresh_expires_in: 28800,
            refresh_expires_at: "9999-12-31T23:59:59.999Z",
            account_id: req.user.accountId,
            client_id: clientId,
            application_id: "lawinsacpplicationidlol",
            selected_account_id: req.user.accountId,
            merged_accounts: []
        });
    } catch (err) {
        handleError(err, res);
    }
}

function DateAddHours(pdate, number) {
    let date = pdate;
    date.setHours(date.getHours() + number);
    return date;
}

module.exports = app;
