var jwt = require('jwt-simple');
var redis = require("../redis");
var User = require('../DB/userDB'); // load up the user model
var UserKeys = require('../DB/userKeysDB');

function iatGetDate(int) {
    var tmp = new Date();
    tmp = tmp.setDate(tmp.getDate() + int);
    return tmp;
}

function isAuthorized(condition, userRoles, thisRole) {
    if (condition.length === 0) return true;
    for (var i in condition) {
        if (userRoles[condition[i].role] && condition[i].role === thisRole) {
            if (condition[i].manager) {
                return userRoles[condition[i].role].manager === true;
            }
            return true;
        }
    }
    return false;
}

module.exports = {
    JWT: function (req, res, next) {
        var jwtToken = req.headers['authorization'];
        var key = req.headers['apikey'];

        if (jwtToken && key) {
            process.nextTick(function () {
                UserKeys.findOneAndUpdate({
                    'apiKey': key
                }, {
                    'updatedAt': Date.now()
                }, function (err, dbKey) {
                    if (err)
                        return next(err);
                    if (!dbKey)
                        return res.status(401).json({
                            code: 'B003',
                            type: 'validatingUser',
                            message: 'User has logout'
                        });
                    User.findById(dbKey.user, function (err, dbUser) {
                        if (err)
                            return next(err);
                        if (!dbUser)
                            return res.status(401).json({
                                code: 'B002',
                                type: 'validatingUser',
                                message: 'User not Found'
                            });
                        if (!dbUser.active)
                            return res.status(401).json({
                                code: 'B004',
                                type: 'validatingUser',
                                message: 'User has Banned'
                            });
                        var decoded;
                        try {
                            decoded = jwt.decode(jwtToken, dbKey.secretKey);
                        } catch (err) {}
                        if (!decoded)
                            return res.status(401).json({
                                code: 'B005',
                                type: 'validatingUser',
                                message: 'JWT Invalid or User has login on another device'
                            });
                        res._payload = decoded;
                        if (!decoded.jti || !decoded.iat || !decoded.exp)
                            return res.status(401).json({
                                code: 'B006',
                                type: 'validatingUser',
                                message: 'JWT Payload Invalid'
                            });
                        if (decoded.exp.toString().length == 10)
                            decoded.exp *= 1000;
                        if (decoded.iat.toString().length == 10)
                            decoded.iat *= 1000;
                        if (decoded.orderTime && decoded.orderTime.toString().length == 10)
                            decoded.orderTime *= 1000;
                        if (decoded.exp <= Date.now() || decoded.iat >= iatGetDate(1) || decoded.iat <= iatGetDate(-1)) {
                            return res.status(401).json({
                                code: 'B007',
                                type: 'validatingUser',
                                message: 'JWT Expired'
                            });
                        }
                        if (req._role) {
                            if (!isAuthorized(req._role.list, dbUser.roles, dbKey.roleType))
                                return res.status(401).json({
                                    code: 'B008',
                                    type: 'validatingUser',
                                    message: 'Not Authorized for this URI'
                                });
                        }
                        redis.get('reply_check:' + decoded.jti + ':' + decoded.iat, (err, reply) => {
                            if (reply !== null) {
                                return res.status(401).json({
                                    code: 'Z004',
                                    type: 'security',
                                    message: 'Token reply'
                                });
                            } else {
                                redis.set('reply_check:' + decoded.jti + ':' + decoded.iat, 0, (err, reply) => {
                                    if (err) return next(err);
                                    if (reply !== 'OK') return next(reply);
                                    redis.expire('reply_check:' + decoded.jti + ':' + decoded.iat, 60 * 60 * 25, (err, reply) => {
                                        if (err) return next(err);
                                        if (reply !== 1) return next(reply);
                                        req._user = dbUser;
                                        req._key = dbKey;
                                        req._user.role = dbUser.roles[dbKey.roleType || dbUser.role.typeCode];
                                        req._user.role.typeCode = dbKey.roleType || dbUser.role.typeCode;
                                        // console.log(req._user.role);
                                        // console.log(req._thisUserRole);
                                        next();
                                    });
                                });
                            }
                        });
                    });
                });
            });
        } else {
            return res.status(401).json({
                code: 'B001',
                type: 'validatingUser',
                message: 'JWT or ApiKey undefined'
            });
        }
    },
    regAsStoreManager: function (req, res, next) {
        if (!req._role) {
            req._role = {
                txt: 'clerk',
                manager: true,
                list: [{
                    role: "clerk",
                    manager: true
                }]
            };
        } else {
            req._role.txt += 'clerk';
            req._role.manager = true;
            req._role.list.push({
                role: "clerk",
                manager: true
            });
        }
        next();
    },
    regAsStore: function (req, res, next) {
        if (!req._role) {
            req._role = {
                txt: 'clerk',
                list: [{
                    role: "clerk"
                }]
            };
        } else {
            req._role.txt += 'clerk';
            req._role.list.push({
                role: "clerk"
            });
        }
        next();
    },
    regAsAdminManager: function (req, res, next) {
        if (!req._role) {
            req._role = {
                txt: 'admin',
                manager: true,
                list: [{
                    role: "admin",
                    manager: true
                }]
            };
        } else {
            req._role.txt += 'admin';
            req._role.manager = true;
            req._role.list.push({
                role: "admin",
                manager: true
            });
        }
        next();
    },
    regAsAdmin: function (req, res, next) {
        if (!req._role) {
            req._role = {
                txt: 'admin',
                list: [{
                    role: "admin"
                }]
            };
        } else {
            req._role.txt += 'admin';
            req._role.list.push({
                role: "admin"
            });
        }
        next();
    }
};