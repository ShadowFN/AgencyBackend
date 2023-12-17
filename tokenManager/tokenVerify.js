const validateToken = (token) => {
    const decodedToken = jwt.decode(token);

    let findAccess = global.accessTokens.find(i => i.token === `eg1~${token}`);

    if (!findAccess && !global.clientTokens.find(i => i.token === `eg1~${token}`)) {
        throw new Error("Invalid token.");
    }

    if (DateAddHours(new Date(decodedToken.creation_date), decodedToken.hours_expire).getTime() <= new Date().getTime()) {
        throw new Error("Expired access/client token.");
    }

    return findAccess;
};

const removeToken = (token) => {
    global.accessTokens = global.accessTokens.filter(i => i.token !== `eg1~${token}`);
    global.clientTokens = global.clientTokens.filter(i => i.token !== `eg1~${token}`);
    functions.UpdateTokens();
};

const verifyToken = async (req, res, next) => {
    const token = req.headers["authorization"].replace("bearer eg1~", "");

    try {
        const findAccess = validateToken(token);

        if (findAccess) {
            req.user = await User.findOne({ accountId: decodedToken.sub }).lean();

            if (req.user.banned) {
                return error.createError(
                    "errors.com.epicgames.account.account_not_active",
                    "You have been permanently banned from Fortnite.",
                    [], -1, undefined, 400, res
                );
            }
        }

        next();
    } catch (err) {
        removeToken(token);
        return authErr();
    }
};

function DateAddHours(pdate, number) {
    let date = new Date(pdate);
    date.setHours(date.getHours() + number);

    return date;
}

module.exports = {
    verifyToken
};