var jwt = require('jwt-simple');
var User = require('../models/DB/userDB'); // load up the user model

function iatGetDate(int) {
    var tmp = new Date();
    tmp = tmp.setDate(tmp.getDate() + int);
    return tmp;
}

module.exports = {
    JWT: function(req, res, next) {
        var jwtToken = req.headers['authorization'];
        var key = req.headers['apikey'];

        if (jwtToken && key) {
            process.nextTick(function() {
                User.findOne({ 'user.apiKey': key }, function(err, dbUser) {
                    if (err)
                        return next(err);
                    if (typeof dbUser === 'undefined' || dbUser === null)
                        return res.status(401).json({ type: 'validatingUser', message: 'Invalid User' });
                    if (!dbUser.user.secretKey)
                        return res.status(401).json({ type: 'validatingUser', message: 'User has logout on other device' });
                    if (!dbUser.active)
                        return res.status(401).json({ type: 'validatingUser', message: 'User has Banned' });
                    var decoded;
                    try {
                        decoded = jwt.decode(jwtToken, dbUser.user.secretKey);
                    } catch (err) {}
                    if (!decoded)
                        return res.status(401).json({ type: 'validatingUser', message: 'JWT Invalid' });
                    res._payload = decoded;
                    if (!decoded.jti || !decoded.iat || !decoded.exp)
                        return res.status(401).json({ type: 'validatingUser', message: 'JWT Payload Invalid' });
                    if (decoded.exp <= Date.now() || decoded.iat >= iatGetDate(1) || decoded.iat <= iatGetDate(-1)) {
                        return res.status(400).json({ type: 'validatingUser', message: 'JWT Expired' });
                    }
                    // check reply attack
                    if (req._role) {
                        if (dbUser.role.typeCode !== req._role.txt)
                            return res.status(403).json({ type: 'validatingUser', message: 'Not Authorized' });
                        if (req._role.manager)
                            if (dbUser.role.manager !== req._role.manager)
                                return res.status(403).json({ type: 'validatingUser', message: 'Not Authorized' });
                    }
                    next(dbUser);
                });
            });
        } else {
            return res.status(401).json({ type: 'validatingUser', message: 'JWT or ApiKey undefined' });
        }
    },
    regAsStoreManager: function(req, res, next) {
        req._role = {
            txt: 'clerk',
            manager: true
        };
        next();
    },
    regAsStore: function(req, res, next) {
        req._role = {
            txt: 'clerk'
        };
        next();
    },
    regAsAdminManager: function(req, res, next) {
        req._role = {
            txt: 'admin',
            manager: true
        };
        next();
    },
    regAsAdmin: function(req, res, next) {
        req._role = {
            txt: 'admin'
        };
        next();
    }
};