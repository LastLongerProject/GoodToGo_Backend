const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const queue = require('queue')({
    concurrency: 1,
    autostart: true
});

const sendSMS = require("../helpers/aws/SNS").sms_now;
const intReLength = require('../helpers/toolkit').intReLength;

const keys = require('../config/keys');
const redis = require("../models/redis");
const User = require('../models/DB/userDB');
const UserKeys = require('../models/DB/userKeysDB');
const RoleType = require('../models/enums/userEnum').RoleType;
const UserGroup = require('../models/enums/userEnum').UserGroup;
const RoleElement = require('../models/enums/userEnum').RoleElement;

const role = require('../models/variables/role');
const Role = role.Role;
const RoleCreationError = role.RoleCreationError;
const VerificationCodeStatus = {
    NOT_FOUND: "not_found",
    EXPIRED: "expired",
    VALID: "valid"
};

function sendVerificationCode(phone, actionTxt, done) {
    const newCode = keys.getVerificationCode();
    sendSMS(`+886${phone.substr(1, 10)}`, `您的好盒器${actionTxt}驗證碼為：${newCode}，請於3分鐘內完成驗證。`, function (err, snsMsg) {
        if (err) return done(err);
        const ttl = new Date();
        ttl.setSeconds(ttl.getSeconds() + 60 * 3);
        setVerificationCode(phone, newCode, ttl, err => {
            if (err) return done(err);
            done(null, true, {
                needVerificationCode: true,
                body: {
                    type: 'signupMessage',
                    message: 'Send Again With Verification Code'
                }
            });
        });
    });
}

function setVerificationCode(phone, newCode, ttl, done) {
    redis.setex(`user_verifying:${phone}:${newCode}`, 60 * 60 * 24, ttl, (err, reply) => {
        if (err) return done(err);
        if (reply !== 'OK') return done(reply);
        return done(null);
    });
}

function checkVerificationCode(phone, verificationCode, done) {
    redis.get(`user_verifying:${phone}:${verificationCode}`, (err, reply) => {
        if (err) return done(err);
        if (reply === null) return done(null, VerificationCodeStatus.NOT_FOUND);
        else if (new Date(reply).valueOf() < new Date().valueOf()) return done(null, VerificationCodeStatus.EXPIRED);
        return done(null, VerificationCodeStatus.VALID);
    });
}

function delVerificationCode(phone, done) {
    redis.scan("0", "MATCH", `user_verifying:${phone}:*`, "COUNT", "1000", (err, reply) => {
        if (err) return done(err);
        const keysToDel = reply[1];
        if (keysToDel.length === 0) return done(null);
        redis.del(keysToDel, err => {
            if (err) return done(err);
            return done(null);
        });
    });
}

module.exports = {
    signup: function (req, done) {
        let role = req.body.role || {
            typeCode: RoleType.CUSTOMER
        };
        let roles = req.body.roles;
        const phone = req.body.phone.replace(/tel:|-/g, "");
        const password = req.body.password;
        const verificationCode = req.body.verification_code;
        let options = req._options || {};

        if (typeof phone === 'undefined' || typeof password === 'undefined') {
            return done(null, false, {
                code: 'D001',
                type: 'signupMessage',
                message: 'Content not Complete'
            });
        } else if (phoneIsNotValid(phone, options.passPhoneValidation)) {
            return done(null, false, {
                code: 'D009',
                type: 'signupMessage',
                message: 'Phone is not valid'
            });
        }
        try {
            new Role(role.typeCode, role);
        } catch (error) {
            if (error instanceof RoleCreationError) return done(null, false, {
                code: 'D003',
                type: 'signupMessage',
                message: `Role structure invalid:${error.message}`
            });
            else return done(error);
        }
        if (options.preCheck) {
            const preCheckResult = options.preCheck();
            if (!preCheckResult.continue) {
                return done(null, false, {
                    code: 'D???',
                    type: 'signupMessage',
                    message: preCheckResult.msg
                });
            }
        }
        User.findOne({
            'user.phone': phone
        }, function (err, dbUser) {
            if (err)
                return done(err);
            if (dbUser && dbUser.hasVerified) {
                let modifySomething_ori = false;
                if (dbUser.user.password === null) {
                    dbUser.user.password = User.generateHash(password);
                    modifySomething_ori = true;
                }
                dbUser.addRole(role.typeCode, role, (err, roleAdded, msg) => {
                    if (err) return done(err);
                    if (!modifySomething_ori && !roleAdded) {
                        return done(null, false, {
                            code: 'D002',
                            type: 'signupMessage',
                            message: 'That phone is already taken'
                        });
                    }
                    dbUser.save(function (err) {
                        if (err) return done(err);
                        return done(null, dbUser, {
                            body: {
                                type: 'signupMessage',
                                message: 'Authentication succeeded'
                            }
                        });
                    });
                });
            } else {
                if (options.passVerify !== true && typeof verificationCode === 'undefined') {
                    sendVerificationCode(phone, "註冊", done);
                } else {
                    checkVerificationCode(phone, verificationCode, (err, result) => {
                        if (err) return done(err);
                        let hasVerified = false;
                        if (options.passVerify !== true) {
                            if (result === VerificationCodeStatus.EXPIRED) return done(null, false, {
                                code: 'D010',
                                type: 'signupMessage',
                                message: 'Verification Code expired'
                            });
                            else if (result === VerificationCodeStatus.NOT_FOUND) return done(null, false, {
                                code: 'D011',
                                type: 'signupMessage',
                                message: "Verification Code isn't correct"
                            });
                            hasVerified = true;
                        } else if (options.needVerified === false) {
                            hasVerified = true;
                        }

                        let userToSave;
                        let rolesToAdd = [];
                        if (dbUser) { // has NOT verified
                            userToSave = dbUser;
                        } else {
                            let newUser = new User({
                                user: {
                                    phone,
                                    password: User.generateHash(password)
                                },
                                registerMethod: options.registerMethod
                            });

                            if (typeof roles !== 'undefined') {
                                roles.forEach(aRole => rolesToAdd.push({
                                    typeCode: aRole.typeCode,
                                    options: aRole
                                }));
                            } else {
                                rolesToAdd.push({
                                    typeCode: role.typeCode,
                                    options: role
                                });
                            }
                            rolesToAdd.push({
                                typeCode: RoleType.CUSTOMER,
                                options: {
                                    group: UserGroup.GOODTOGO_MEMBER
                                }
                            });
                            userToSave = newUser;
                        }

                        userToSave.hasVerified = hasVerified;
                        Promise
                            .all(rolesToAdd.map(aRoleToAdd =>
                                new Promise((resolve, reject) =>
                                    userToSave.addRole(aRoleToAdd.typeCode, aRoleToAdd.options, err => {
                                        if (err) return reject(err);
                                        resolve();
                                    }))))
                            .then(() => {
                                userToSave.save(function (err) {
                                    if (err) return done(err);
                                    delVerificationCode(phone, err => {
                                        if (err && options.passVerify !== true) return done(err);
                                        return done(null, true, {
                                            body: {
                                                type: 'signupMessage',
                                                message: 'Authentication succeeded'
                                            }
                                        });
                                    });
                                });
                            })
                            .catch(done);
                    });
                }
            }
        });
    },
    signupLineUser: function (req, done) {
        const phone = req.body.phone.replace(/tel:|-/g, "");
        const verificationCode = req.body.verification_code;
        const line_liff_userID = req.body.line_liff_userID;
        const line_channel_userID = req.body.line_channel_userID;
        const worker_id = req.body.worker_id || null;
        let options = req._options || {};

        if (typeof phone === 'undefined' || typeof line_liff_userID === 'undefined' || typeof line_channel_userID === 'undefined') {
            return done(null, false, {
                code: 'D001',
                type: 'signupMessage',
                message: 'Content not Complete'
            });
        } else if (phoneIsNotValid(phone, false) || typeof line_liff_userID !== 'string' || typeof line_channel_userID !== 'string') {
            return done(null, false, {
                code: 'D009',
                type: 'signupMessage',
                message: 'Phone or LineID is not valid'
            });
        }
        User.findOne({
            'user.phone': phone
        }, function (err, dbUser) {
            if (err)
                return done(err);
            if (dbUser && dbUser.agreeTerms) {
                return done(null, false, {
                    code: 'D002',
                    type: 'signupMessage',
                    message: 'That phone is already taken'
                });
            }
            if (options.passVerify !== true && typeof verificationCode === 'undefined') {
                sendVerificationCode(phone, "註冊", done);
            } else {
                checkVerificationCode(phone, verificationCode, (err, result) => {
                    if (err) return done(err);
                    if (options.passVerify !== true) {
                        if (result === VerificationCodeStatus.EXPIRED) return done(null, false, {
                            code: 'D010',
                            type: 'signupMessage',
                            message: 'Verification Code expired'
                        });
                        else if (result === VerificationCodeStatus.NOT_FOUND) return done(null, false, {
                            code: 'D011',
                            type: 'signupMessage',
                            message: "Verification Code isn't correct"
                        });
                    }

                    let userToSave;
                    if (dbUser) { // has NOT verified
                        userToSave = dbUser;
                    } else {
                        let newUser = new User({
                            user: {
                                phone,
                                password: null
                            },
                            registerMethod: options.registerMethod
                        });
                        userToSave = newUser;
                    }

                    userToSave.user.line_liff_userID = line_liff_userID;
                    userToSave.user.line_channel_userID = line_channel_userID;
                    let customerRole;
                    if (worker_id !== null) {
                        customerRole = {
                            group: UserGroup.KUANG_TIEN_STAFF,
                            extraArg: {
                                worker_id
                            }
                        };
                        userToSave.hasPurchase = true;
                    } else {
                        customerRole = {
                            group: UserGroup.GOODTOGO_MEMBER
                        };
                    }
                    userToSave.hasVerified = true;
                    userToSave.agreeTerms = true;
                    userToSave.addRole(RoleType.CUSTOMER, customerRole, err => {
                        if (err) return done(err);
                        userToSave.save(function (err) {
                            if (err) return done(err);
                            delVerificationCode(phone, err => {
                                if (err && options.passVerify !== true) return done(err);
                                return done(null, userToSave, {
                                    body: {
                                        type: 'signupMessage',
                                        message: 'Authentication succeeded',
                                        userPurchaseStatus: userToSave.getPurchaseStatus()
                                    }
                                });
                            });
                        });
                    });
                });
            }
        });
    },
    login: function (req, done) {
        const phone = req.body.phone;
        const password = req.body.password;
        if (typeof phone === 'undefined' || typeof password === 'undefined') {
            return done(null, false, {
                code: 'D004',
                type: 'loginMessage',
                message: 'Content not Complete'
            });
        }
        User.findOne({
            'user.phone': phone
        }, function (err, dbUser) {
            if (err)
                return done(err);
            if (!dbUser)
                return done(null, false, {
                    code: 'D005',
                    type: 'loginMessage',
                    message: 'No user found'
                });
            if (!dbUser.active || !dbUser.hasVerified || dbUser.user.password === null) {
                return done(null, false, {
                    code: 'D005',
                    type: 'loginMessage',
                    message: 'No user found'
                });
            }
            if (!dbUser.validPassword(password))
                return done(null, false, {
                    code: 'D006',
                    type: 'loginMessage',
                    message: 'Wrong password'
                });
            fetchUserKeys(dbUser, req.signedCookies.uid || req._uid, req.headers['user-agent'], (err, results) => {
                if (err) return done(err);
                const {
                    roleList,
                    MD5,
                    token
                } = results;
                return done(null, dbUser, {
                    headers: {
                        Authorization: token
                    },
                    body: {
                        type: 'loginMessage',
                        message: 'Authentication succeeded',
                        MD5,
                        roleList
                    }
                });
            });
        });
    },
    chanpass: function (req, done) {
        const oriPassword = req.body.oriPassword;
        const newPassword = req.body.newPassword;
        if (typeof oriPassword === 'undefined' || typeof newPassword === 'undefined')
            return done(null, false, {
                code: 'D007',
                type: 'chanPassMessage',
                message: 'Content not Complete'
            });
        const dbUser = req._user;
        if (!dbUser.validPassword(oriPassword))
            return done(null, false, {
                code: 'D008',
                type: 'chanPassMessage',
                message: 'Wrong password'
            });
        dbUser.user.password = User.generateHash(newPassword);
        dbUser.save(function (err) {
            if (err) return done(err);
            UserKeys.deleteMany({
                'phone': dbUser.user.phone
            }, (err) => {
                if (err) return done(err);
                return done(null, dbUser, {
                    body: {
                        type: 'chanPassMessage',
                        message: 'Change succeeded'
                    }
                });
            });
        });
    },
    forgotpass: function (req, done) {
        const phone = req.body.phone;
        const verificationCode = req.body.verification_code;
        const newPassword = req.body.new_password;
        if (typeof phone === 'undefined') {
            return done(null, false, {
                code: 'D012',
                type: 'forgotPassMessage',
                message: 'Content not Complete'
            });
        }
        User.findOne({
            'user.phone': phone
        }, function (err, dbUser) {
            if (err) return done(err);
            if (!dbUser) return done(null, false, {
                code: 'D013',
                type: 'forgotPassMessage',
                message: 'No User Found'
            });
            if (typeof verificationCode === 'undefined' || typeof newPassword === 'undefined') {
                if (!(typeof phone === 'string' && isMobilePhone(phone)))
                    return done(null, false, {
                        code: 'D009',
                        type: 'forgotPassMessage',
                        message: 'Phone is not valid'
                    });
                sendVerificationCode(phone, "更改密碼", done);
            } else {
                checkVerificationCode(phone, verificationCode, (err, result) => {
                    if (err) return done(err);
                    if (result === VerificationCodeStatus.EXPIRED) return done(null, false, {
                        code: 'D010',
                        type: 'signupMessage',
                        message: 'Verification Code expired'
                    });
                    else if (result === VerificationCodeStatus.NOT_FOUND) return done(null, false, {
                        code: 'D011',
                        type: 'signupMessage',
                        message: "Verification Code isn't correct"
                    });
                    UserKeys.deleteMany({
                        'phone': dbUser.user.phone
                    }, (err) => {
                        if (err) return done(err);
                        dbUser.user.password = User.generateHash(newPassword);
                        dbUser.save(function (err) {
                            if (err) return done(err);
                            delVerificationCode(phone, err => {
                                if (err) return done(err);
                                return done(null, dbUser, {
                                    body: {
                                        type: 'forgotPassMessage',
                                        message: 'Change Password succeeded'
                                    }
                                });
                            });
                        });
                    });
                });
            }
        });
    },
    resetPass: function (req, done) {
        const phone = req.body.phone;
        const password = req.body.password;
        if (typeof phone === 'undefined' || typeof password === 'undefined') {
            return done(null, false, {
                code: 'D001',
                type: 'resetPassMessage',
                message: 'Content not Complete'
            });
        } else if (phoneIsNotValid(phone, true)) {
            return done(null, false, {
                code: 'D009',
                type: 'resetPassMessage',
                message: 'Phone is not valid'
            });
        }
        User.findOne({
            "user.phone": phone
        }, (err, dbUser) => {
            if (err)
                return done(err);
            if (!dbUser)
                return done(null, false, {
                    code: 'D005',
                    type: 'resetPassMessage',
                    message: 'No user found'
                });
            dbUser.user.password = dbUser.generateHash(password);
            dbUser.save(err => {
                if (err) return done(err);
                UserKeys.deleteMany({
                    phone
                }, (err) => {
                    if (err) return done(err);
                    return done(null, null, {
                        type: 'resetPassMessage',
                        message: 'Reset Password succeeded.'
                    });
                });
            });
        });
    },
    logout: function (req, done) {
        const dbUser = req._user;
        UserKeys.deleteMany({
            'phone': dbUser.user.phone,
            'clientId': req.signedCookies.uid
        }, (err) => {
            if (err) return done(err);
            return done(null, null, {
                type: 'logoutMessage',
                message: 'Logout succeeded.'
            });
        });
    },
    addBot: function (req, done) {
        if (typeof req.body.scopeID === "undefined" || typeof req.body.botName === "undefined") {
            return done(null, false, {
                code: 'D001',
                type: 'signupMessage',
                message: 'Content not Complete'
            });
        } else if (typeof req.body.scopeID !== "number" || typeof req.body.botName !== "string") {
            return done(null, false, {
                code: 'D003',
                type: 'signupMessage',
                message: 'Role structure invalid'
            });
        }
        const role = {
            typeCode: RoleType.BOT,
            scopeID: req.body.scopeID
        };
        const botName = req.body.botName;
        queue.push(doneQtask => {
            User.count({
                roleList: {
                    $elemMatch: {
                        roleType: RoleType.BOT
                    }
                }
            }, function (err, botAmount) {
                if (err) return done(err);
                const botID = `bot${intReLength(botAmount + 1, 5)}`;
                const newUser = new User({
                    user: {
                        phone: botID,
                        name: botName
                    },
                    active: true
                });
                newUser.addRole(role.typeCode, role, err => {
                    if (err) return done(err);
                    newUser.save(function (err) {
                        if (err) return done(err);
                        createBotKey(newUser, req.headers['user-agent'], (err, keyPair) => {
                            if (err) return done(err);
                            done(null, true, {
                                body: {
                                    type: 'signupMessage',
                                    message: 'Authentication succeeded',
                                    keys: keyPair
                                }
                            });
                            return doneQtask();
                        });
                    });
                });
            });
        });
    },
    createBotKey: function (req, done) {
        User.findOne({
            'user.phone': req.body.bot
        }, function (err, theBot) {
            if (err) return done(err);
            if (!theBot)
                return done(null, false, {
                    code: 'D???',
                    type: 'botMessage',
                    message: 'No Bot Find'
                });
            createBotKey(theBot, req.headers['user-agent'], (err, keyPair) => {
                if (err) return done(err);
                done(null, true, {
                    body: {
                        type: 'signupMessage',
                        message: 'Authentication succeeded',
                        keys: keyPair
                    }
                });
            });
        });
    },
    fetchRole: function (req, done) {
        const dbUser = req._user;
        fetchUserKeys(dbUser, req.signedCookies.uid || req._uid, req.headers['user-agent'], (err, results) => {
            if (err) return done(err);
            const {
                roleList,
                MD5,
                token
            } = results;
            return done(null, dbUser, {
                headers: {
                    Authorization: token
                },
                body: {
                    type: 'loginMessage',
                    message: 'Authentication succeeded',
                    MD5,
                    roleList
                }
            });
        });
    },
    setVerificationCode,
    phoneIsNotValid
};

function phoneIsNotValid(phone, passPhoneValidation = false) {
    return typeof phone !== 'string' || (!passPhoneValidation && !(isMobilePhone(phone) || isStudentID(phone)));
}

function isMobilePhone(phone) {
    const reg = /^09[0-9]{8}$/;
    return reg.test(phone);
}

function isStudentID(phone) {
    const reg = /^[0-9]{7}$/;
    return reg.test(phone);
}

function createBotKey(theBot, ua, done) {
    Promise
        .all(theBot.roleList
            .filter(aRole => aRole.roleType === RoleType.BOT)
            .map(aRole => new Promise((resolve, reject) => {
                keys.keyPair(function (err, returnKeys) {
                    if (err) return reject(err);
                    UserKeys.findOneAndUpdate({
                        'phone': theBot.user.phone,
                        'roleID': aRole.roleID,
                        'roleType': aRole.roleType
                    }, {
                        'secretKey': returnKeys.secretKey,
                        'userAgent': ua,
                        '$setOnInsert': {
                            'apiKey': returnKeys.apiKey,
                            'user': theBot._id,
                        }
                    }, {
                        new: true,
                        upsert: true,
                        setDefaultsOnInsert: true
                    }, (err, keyPair) => {
                        if (err) return reject(err);
                        resolve({
                            apiKey: keyPair.apiKey,
                            secretKey: keyPair.secretKey,
                            roleID: keyPair.roleID
                        });
                    });
                });
            })))
        .then((keyPairList) => {
            return done(null, keyPairList);
        })
        .catch((err) => {
            if (err) return done(err);
        });
}

function fetchUserKeys(dbUser, cid, ua, done) {
    Promise
        .all(dbUser.roleList.map(aRole => new Promise((resolve, reject) => {
            keys.keyPair(function (err, returnKeys) {
                if (err) return reject(err);
                UserKeys.findOneAndUpdate({
                    'phone': dbUser.user.phone,
                    'clientId': cid,
                    'roleID': aRole.roleID,
                    'roleType': aRole.roleType
                }, {
                    'secretKey': returnKeys.secretKey,
                    'userAgent': ua,
                    '$setOnInsert': {
                        'apiKey': returnKeys.apiKey,
                        'user': dbUser._id,
                    }
                }, {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true
                }, (err, keyPair) => {
                    if (err) return reject(err);
                    resolve(keyPair);
                });
            });
        })))
        .then((keyPairList) => {
            keys.serverSecretKey((err, serverSecretKey) => {
                if (err) return done(err);
                return done(null, roleListBuilder(serverSecretKey, keyPairList, dbUser));
            });
        })
        .catch((err) => {
            if (err) return done(err);
        });
}

function roleListBuilder(serverSecretKey, userKeyPairList, dbUser) {
    const roleList = dbUser.roleList;
    if (!Array.isArray(userKeyPairList)) userKeyPairList = [userKeyPairList];
    userKeyPairList.forEach(aUserKeyPair => insertKeyPair(roleList, aUserKeyPair));
    const md5 = crypto.createHash('md5');
    roleList.sort((a, b) => {
        if (a.roleType === RoleType.ADMIN ||
            (a.roleType === RoleType.CLEAN_STATION && b.roleType !== RoleType.CLEAN_STATION && b.roleType !== RoleType.ADMIN) ||
            b.roleType === RoleType.BOT || b.roleType === RoleType.CUSTOMER
        ) {
            return -1;
        } else if (a.roleType === RoleType.CUSTOMER ||
            a.roleType === RoleType.BOT ||
            (a.roleType === RoleType.STORE && b.roleType !== RoleType.CUSTOMER && b.roleType !== RoleType.STORE) ||
            b.roleType === RoleType.ADMIN
        ) {
            return 1;
        } else if (a.roleType === b.roleType) {
            if (a.roleType === RoleType.STORE) {
                return a.storeID - b.storeID;
            } else if (a.roleType === RoleType.CLEAN_STATION) {
                return a.stationID - b.stationID;
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    });
    return {
        MD5: md5.update(JSON.stringify(roleList), "utf8").digest("hex"),
        roleList,
        token: jwt.sign({
            roleList
        }, serverSecretKey)
    };
}

function insertKeyPair(roleList, userKey) {
    const theRole = roleList.find(aRole => aRole.roleID === userKey.roleID);
    Object.assign(theRole, {
        apiKey: userKey.apiKey,
        secretKey: userKey.secretKey
    });
    delete theRole.roleID;
    if (userKey.roleType === RoleType.STORE)
        Object.assign(theRole, {
            [RoleElement.STORE_NAME]: role.getElement(theRole, RoleElement.STORE_NAME)
        });
    else if (userKey.roleType === RoleType.CLEAN_STATION)
        Object.assign(theRole, {
            [RoleElement.STATION_NAME]: role.getElement(theRole, RoleElement.STATION_NAME),
            [RoleElement.STATION_BOXABLE]: role.getElement(theRole, RoleElement.STATION_BOXABLE)
        });
}