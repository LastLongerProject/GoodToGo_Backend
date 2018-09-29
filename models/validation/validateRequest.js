var jwt = require('jwt-simple');
var redis = require("../redis");
var User = require('../DB/userDB'); // load up the user model
var UserKeys = require('../DB/userKeysDB');

function iatGetDate(int) {
    var tmp = new Date();
    tmp = tmp.setDate(tmp.getDate() + int);
    return tmp.valueOf();
}

function isAuthorized(conditions, userRoles, thisKeyRole) {
    if (!Array.isArray(conditions) || conditions.length === 0) return true; // Customer
    conditions.forEach(aCondition => {
        if (userRoles[aCondition.role] && aCondition.role === thisKeyRole) {
            if (aCondition.manager) {
                return userRoles[aCondition.role].manager === true;
            }
            return true;
        }
    });
    return false;
}

function addRoleToCheck(req, theRole, shouldBeManager, cb) {
    if (!req._rolesToCheck) {
        req._rolesToCheck = [];
    }
    req._rolesToCheck.push({
        role: theRole,
        manager: shouldBeManager
    });
    cb();
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
                        decoded.exp = parseInt(decoded.exp);
                        decoded.iat = parseInt(decoded.iat);
                        if (decoded.orderTime)
                            decoded.orderTime = parseInt(decoded.orderTime);
                        if (!decoded.jti || isNaN(decoded.iat) || isNaN(decoded.exp))
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
                        if (decoded.exp <= Date.now() || decoded.iat >= iatGetDate(1) || decoded.iat <= iatGetDate(-1))
                            return res.status(401).json({
                                code: 'B007',
                                type: 'validatingUser',
                                message: 'JWT Expired'
                            });
                        if (!isAuthorized(req._rolesToCheck, dbUser.roles, dbKey.roleType))
                            return res.status(401).json({
                                code: 'B008',
                                type: 'validatingUser',
                                message: 'Not Authorized for this URI'
                            });
                        redis.get('reply_check:' + decoded.jti + ':' + decoded.iat, (err, reply) => {
                            if (err) return next(err);
                            if (reply !== null) {
                                return res.status(401).json({
                                    code: 'Z004',
                                    type: 'security',
                                    message: 'Token reply'
                                });
                            }
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
    regAsStoreManager: (req, res, next) => addRoleToCheck(req, "clerk", true, next),
    regAsStore: (req, res, next) => addRoleToCheck(req, "clerk", false, next),
    regAsAdminManager: (req, res, next) => addRoleToCheck(req, "admin", true, next),
    regAsAdmin: (req, res, next) => addRoleToCheck(req, "admin", false, next),
    regAsBot: (req, res, next) => addRoleToCheck(req, "bot", false, next)
};