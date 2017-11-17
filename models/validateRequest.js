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
                    if (!dbUser)
                        return res.status(401).json({ code: 'B002', type: 'validatingUser', message: 'User not Found' });
                    if (!dbUser.user.secretKey)
                        return res.status(401).json({ code: 'B003', type: 'validatingUser', message: 'User has logout' });
                    if (!dbUser.active)
                        return res.status(401).json({ code: 'B004', type: 'validatingUser', message: 'User has Banned' });
                    var decoded;
                    try {
                        decoded = jwt.decode(jwtToken, dbUser.user.secretKey);
                    } catch (err) {}
                    if (!decoded)
                        return res.status(401).json({ code: 'B005', type: 'validatingUser', message: 'JWT Invalid' });
                    res._payload = decoded;
                    if (!decoded.jti || !decoded.iat || !decoded.exp)
                        return res.status(401).json({ code: 'B006', type: 'validatingUser', message: 'JWT Payload Invalid' });
                    if (decoded.exp <= Date.now() || decoded.iat >= iatGetDate(1) || decoded.iat <= iatGetDate(-1)) {
                        return res.status(401).json({ code: 'B007', type: 'validatingUser', message: 'JWT Expired' });
                    }
                    // check reply attack
                    if (req._role) {
                        if (dbUser.role.typeCode !== req._role.txt)
                            return res.status(401).json({ code: 'B008', type: 'validatingUser', message: 'Not Authorized for this URI' });
                        if (req._role.manager)
                            if (dbUser.role.manager !== req._role.manager)
                                return res.status(401).json({ code: 'B008', type: 'validatingUser', message: 'Not Authorized for this URI' });
                    }
                    req._user = dbUser;
                    next();
                });
            });
        } else {
            return res.status(401).json({ code: 'B001', type: 'validatingUser', message: 'JWT or ApiKey undefined' });
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