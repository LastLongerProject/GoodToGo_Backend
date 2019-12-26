const JWT = require('jsonwebtoken');
const redis = require("../../models/redis");
const User = require('../../models/DB/userDB');
const UserKeys = require('../../models/DB/userKeysDB');
const RoleType = require('../../models/enums/userEnum').RoleType;
const Role = require('../../models/variables/role').Role;

function iatGetDate(int) {
    var tmp = new Date();
    tmp = tmp.setDate(tmp.getDate() + int);
    return tmp.valueOf();
}

function isAuthorized(req, dbUser, dbKey) {
    const rolesToCheck = req._rolesToCheck;
    // addConditionToRoleCheck(req, RoleType.CUSTOMER) // Default as Customer
    if (typeof dbKey.roleID === "undefined" || typeof dbUser.roleList === "undefined" || dbUser.roleList.length === 0) { // Legacy Role System
        const RoleTypes = dbUser.roles;
        const thisKeyRole = dbKey.roleType;
        let roleTypeForNewSys = thisKeyRole;
        if (roleTypeForNewSys === RoleType.CLERK) roleTypeForNewSys = RoleType.STORE;
        else if (roleTypeForNewSys === RoleType.ADMIN) roleTypeForNewSys = RoleType.CLEAN_STATION;
        req._thisRole = new Role(roleTypeForNewSys, RoleTypes[thisKeyRole]);
        if (!Array.isArray(rolesToCheck) || rolesToCheck.length === 0) return true;
        for (let conditionIndex in rolesToCheck) {
            let aCondition = rolesToCheck[conditionIndex];
            if (RoleTypes[aCondition.roleType] && String(thisKeyRole).startsWith(aCondition.roleType)) {
                if (aCondition.condition && aCondition.condition.manager) {
                    return RoleTypes[aCondition.roleType].manager === true;
                }
                return true;
            }
        }
        return false;
    } else {
        const theKeyRole = dbUser.roleList.find(aRole => aRole.roleID === dbKey.roleID);
        req._thisRole = new Role(theKeyRole.roleType, theKeyRole);
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
    checkRoleIsCleanStation: condition => (req, res, next) => addConditionToRoleCheck(req, RoleType.CLEAN_STATION, condition, next),
    checkRoleIsStore: condition => (req, res, next) => addConditionToRoleCheck(req, RoleType.STORE, condition, next),
    checkRoleIsAdmin: condition => (req, res, next) => addConditionToRoleCheck(req, RoleType.ADMIN, condition, next),
    checkRoleIsBot: condition => (req, res, next) => addConditionToRoleCheck(req, RoleType.BOT, condition, next),
    checkRoleIs: roleTypeAndConditionList => (req, res, next) => Promise
        .all(roleTypeAndConditionList.map(aRoleTypeAndCondition =>
            new Promise((resolve, reject) =>
                addConditionToRoleCheck(req, aRoleTypeAndCondition.roleType, aRoleTypeAndCondition.condition, err => {
                    if (err) return reject(err);
                    resolve();
                })
            )
        ))
        .then(() => next())
        .catch(next)
};