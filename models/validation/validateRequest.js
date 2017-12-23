var jwt = require('jwt-simple');
var User = require('../DB/userDB'); // load up the user model
var UserKeys = require('../DB/userKeysDB');

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
                UserKeys.findOneAndUpdate({ 'apiKey': key }, { 'updatedAt': Date.now() }, function(err, dbKey) {
                    if (err)
                        return next(err);
                    if (!dbKey)
                        return res.status(401).json({ code: 'B003', type: 'validatingUser', message: 'User has logout' });
                    User.findById(dbKey.user, function(err, dbUser) {
                        if (err)
                            return next(err);
                        if (!dbUser)
                            return res.status(401).json({ code: 'B002', type: 'validatingUser', message: 'User not Found' });
                        if (!dbUser.active)
                            return res.status(401).json({ code: 'B004', type: 'validatingUser', message: 'User has Banned' });
                        var decoded;
                        try {
                            decoded = jwt.decode(jwtToken, dbKey.secretKey);
                        } catch (err) {}
                        if (!decoded)
                            return res.status(401).json({ code: 'B005', type: 'validatingUser', message: 'JWT Invalid or User has login on another device' });
                        res._payload = decoded;
                        if (!decoded.jti || !decoded.iat || !decoded.exp)
                            return res.status(401).json({ code: 'B006', type: 'validatingUser', message: 'JWT Payload Invalid' });
                        if (decoded.exp <= Date.now() || decoded.iat >= iatGetDate(1) || decoded.iat <= iatGetDate(-1)) {
                            return res.status(401).json({ code: 'B007', type: 'validatingUser', message: 'JWT Expired' });
                        }
                        // check reply attack
                        if (req._role) {
                            if (req._role.txt.indexOf(dbUser.role.typeCode) === -1)
                                return res.status(401).json({ code: 'B008', type: 'validatingUser', message: 'Not Authorized for this URI' });
                            if (req._role.manager)
                                if (dbUser.role.manager !== req._role.manager)
                                    return res.status(401).json({ code: 'B008', type: 'validatingUser', message: 'Not Authorized for this URI' });
                        }
                        req._user = dbUser;
                        req._key = dbKey;
                        next();
                    });
                });
            });
        } else {
            return res.status(401).json({ code: 'B001', type: 'validatingUser', message: 'JWT or ApiKey undefined' });
        }
    },
    regAsStoreManager: function(req, res, next) {
        if (!req._role) {
            req._role = {
                txt: 'clerk',
                manager: true
            };
        } else {
            req._role.txt += 'clerk';
        }
        next();
    },
    regAsStore: function(req, res, next) {
        if (!req._role) {
            req._role = {
                txt: 'clerk'
            };
        } else {
            req._role.txt += 'clerk';
        }
        next();
    },
    regAsAdminManager: function(req, res, next) {
        if (!req._role) {
            req._role = {
                txt: 'admin',
                manager: true
            };
        } else {
            req._role.txt += 'admin';
        }
        next();
    },
    regAsAdmin: function(req, res, next) {
        if (!req._role) {
            req._role = {
                txt: 'admin'
            };
        } else {
            req._role.txt += 'admin';
        }
        next();
    }
};