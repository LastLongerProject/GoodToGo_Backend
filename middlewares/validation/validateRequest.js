const JWT = require('jsonwebtoken');
const redis = require("../../models/redis");
const User = require('../../models/DB/userDB');
const UserKeys = require('../../models/DB/userKeysDB');
const UserRole = require('../../models/enums/userEnum').UserRole;

function iatGetDate(int) {
    var tmp = new Date();
    tmp = tmp.setDate(tmp.getDate() + int);
    return tmp.valueOf();
}

function isAuthorized(req, dbUser, dbKey) {
    const rolesToCheck = req._rolesToCheck;
    // addConditionToRoleCheck(req, UserRole.CUSTOMER) // Default as Customer
    if (typeof dbKey.roleID === "undefined" || typeof dbUser.roleList === "undefined") { // Legacy Role System
        const userRoles = dbUser.roles;
        const thisKeyRole = dbKey.roleType;
        let roleForNewSys = {};
        let roleTypeForNewSys = thisKeyRole;
        if (roleTypeForNewSys === UserRole.CLERK) roleTypeForNewSys = UserRole.STORE;
        else if (roleTypeForNewSys === UserRole.ADMIN) roleTypeForNewSys = UserRole.CLEAN_STATION;
        Object.assign(roleForNewSys, userRoles);
        Object.assign(roleForNewSys, {
            roleType: roleTypeForNewSys
        });
        req._thisRole = roleForNewSys;
        if (!Array.isArray(rolesToCheck) || rolesToCheck.length === 0) return true;
        for (let conditionIndex in rolesToCheck) {
            let aCondition = rolesToCheck[conditionIndex];
            if (userRoles[aCondition.roleType] && String(thisKeyRole).startsWith(aCondition.roleType)) {
                if (aCondition.condition && aCondition.condition.manager) {
                    return userRoles[aCondition.roleType].manager === true;
                }
                return true;
            }
        }
        return false;
    } else {
        const theKeyRole = dbUser.roleList.find(aRole => aRole.roleID === dbKey.roleID);
        req._thisRole = theKeyRole;
        if (!Array.isArray(rolesToCheck) || rolesToCheck.length === 0) return true;
        for (let roleIndex in rolesToCheck) {
            let aRoleToCheck = rolesToCheck[roleIndex];
            if (aRoleToCheck.roleType === theKeyRole.roleType) {
                for (let aConditionKey in aRoleToCheck.condition) {
                    let aCondition = aRoleToCheck.condition[aConditionKey];
                    if (theKeyRole[aConditionKey] !== aCondition) return false;
                }
                return true;
            }
        }
        return false;
    }
}

function addConditionToRoleCheck(req, roleType, condition, next) {
    if (typeof condition === "undefined") condition = {};
    if (!req._rolesToCheck) {
        req._rolesToCheck = [];
    }
    req._rolesToCheck.push({
        roleType,
        condition
    });
    if (next) next();
}

module.exports = {
    JWT: function (req, res, next) {
        const jwtToken = req.headers['authorization'];
        const key = req.headers['apikey'];

        if (jwtToken && key) {
            UserKeys.findOne({
                'apiKey': key
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
                    if (typeof dbKey.roleID !== "undefined" && !dbUser.roleIsExistByID(dbKey.roleID))
                        return res.status(401).json({
                            code: 'B003',
                            type: 'validatingUser',
                            message: 'User no longer own that role'
                        });
                    JWT.verify(jwtToken, dbKey.secretKey, {
                        ignoreExpiration: true
                    }, (err, decoded) => {
                        if (err || !decoded) {
                            if (err instanceof JWT.JsonWebTokenError)
                                return res.status(401).json({
                                    code: 'B005',
                                    type: 'validatingUser',
                                    message: `JWTerr: ${err.message}`
                                });
                            else
                                return next(err);
                        }
                        res._payload = decoded;
                        decoded.exp = Number(decoded.exp);
                        decoded.iat = Number(decoded.iat);
                        if (decoded.orderTime)
                            decoded.orderTime = Number(decoded.orderTime);
                        if (!decoded.jti || isNaN(decoded.iat) || isNaN(decoded.exp))
                            return res.status(401).json({
                                code: 'B006',
                                type: 'validatingUser',
                                message: 'Arguments in JWT Payload are Invalid'
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
                                message: 'JWT has Expired'
                            });
                        if (!isAuthorized(req, dbUser, dbKey))
                            return res.status(401).json({
                                code: 'B008',
                                type: 'validatingUser',
                                message: 'Not Authorized for this URI'
                            });
                        redis.set('reply_check:' + decoded.jti + ':' + decoded.iat, 0, "EX", 60 * 60 * 25, "NX", (err, reply) => {
                            if (err) return next(err);
                            if (reply === null) {
                                return res.status(401).json({
                                    code: 'Z004',
                                    type: 'security',
                                    message: 'Token reply'
                                });
                            }
                            if (reply !== 'OK') return next(reply);
                            req._user = dbUser;
                            req._key = dbKey;
                            next();
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
    checkRoleIsCleanStation: condition => (req, res, next) => addConditionToRoleCheck(req, UserRole.CLEAN_STATION, condition, next),
    checkRoleIsStore: condition => (req, res, next) => addConditionToRoleCheck(req, UserRole.CLERK, condition, next),
    checkRoleIsAdmin: condition => (req, res, next) => addConditionToRoleCheck(req, UserRole.ADMIN, condition, next),
    checkRoleIsBot: condition => (req, res, next) => addConditionToRoleCheck(req, UserRole.BOT, condition, next)
};