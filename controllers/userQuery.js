const jwt = require('jwt-simple');
const queue = require('queue')({
    concurrency: 1,
    autostart: true
});

const sendCode = require("../helpers/aws/SNS").sms_now;
const intReLength = require('../helpers/toolkit').intReLength;
const keys = require('../config/keys');
const redis = require("../models/redis");
const User = require('../models/DB/userDB');
const UserKeys = require('../models/DB/userKeysDB');
const DataCacheFactory = require("../models/dataCacheFactory");
const UserRole = require('../models/enums/userEnum').UserRole;
const UserGroup = require('../models/enums/userEnum').UserGroup;

function sendVerificationCode(phone, done) {
    var newCode = keys.getVerificationCode();
    sendCode('+886' + phone.substr(1, 10), '您的好盒器註冊驗證碼為：' + newCode + '，請於3分鐘內完成驗證。', function (err, snsMsg) {
        if (err) return done(err);
        redis.setex('user_verifying:' + phone, 60 * 3, newCode, (err, reply) => {
            if (err) return done(err);
            if (reply !== 'OK') return done(reply);
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

module.exports = {
    signup: function (req, done) {
        let role = req.body.role || {
            typeCode: UserRole.CUSTOMER
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
        } else if (typeof phone !== 'string' || (!options.passPhoneValidation && !(isMobilePhone(phone) || isStudentID(phone)))) {
            return done(null, false, {
                code: 'D009',
                type: 'signupMessage',
                message: 'Phone is not valid'
            });
        } else if (
            typeof roles === 'undefined' &&
            ((role.typeCode === UserRole.CLERK && (typeof role.manager === 'undefined' || typeof role.storeID !== 'number' || typeof role.stationID !== 'undefined')) ||
                (role.typeCode === UserRole.ADMIN && (typeof role.manager === 'undefined' || typeof role.storeID !== 'undefined' || typeof role.stationID !== 'number')) ||
                (role.typeCode === UserRole.CUSTOMER && (typeof role.manager !== 'undefined' || typeof role.storeID !== 'undefined' || typeof role.stationID !== 'undefined')))) {
            return done(null, false, {
                code: 'D003',
                type: 'signupMessage',
                message: 'Role structure invalid'
            });
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
                    dbUser.user.password = dbUser.generateHash(password);
                    modifySomething_ori = true;
                }
                if ((role.typeCode === UserRole.CLERK || role.typeCode === UserRole.ADMIN) && dbUser.roles.typeList.indexOf(role.typeCode) === -1) {
                    switch (role.typeCode) {
                        case UserRole.CLERK:
                            dbUser.roles.typeList.push(UserRole.CLERK);
                            dbUser.roles.clerk = {
                                storeID: role.storeID,
                                manager: role.manager,
                            };
                            break;
                        case UserRole.ADMIN:
                            dbUser.roles.typeList.push(UserRole.ADMIN);
                            dbUser.roles.admin = {
                                stationID: role.stationID,
                                manager: role.manager
                            };
                            break;
                    }
                    modifySomething_ori = true;
                }
                dbUser.addRole(role.typeCode, role, (err, modifySomething_new, msg) => {
                    if (err) return done(err);
                    if (!modifySomething_ori && !modifySomething_new) {
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
                    sendVerificationCode(phone, done);
                } else {
                    redis.get('user_verifying:' + phone, (err, reply) => {
                        if (err) return done(err);
                        let hasVerified = false;
                        if (options.passVerify !== true) {
                            if (reply === null) return done(null, false, {
                                code: 'D010',
                                type: 'signupMessage',
                                message: 'Verification Code expired'
                            });
                            else if (reply !== verificationCode) return done(null, false, {
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
                            let newUser = new User();
                            newUser.user.phone = phone;
                            newUser.user.password = newUser.generateHash(password);
                            newUser.registerMethod = options.registerMethod;

                            if (typeof roles !== 'undefined') { // v2 api
                                newUser.roles = roles;
                            } else {
                                switch (role.typeCode) { // v1 api
                                    case UserRole.CLERK:
                                        newUser.roles.typeList.push(UserRole.CLERK);
                                        newUser.roles.clerk = {
                                            storeID: role.storeID,
                                            manager: role.manager || false,
                                        };
                                        break;
                                    case UserRole.ADMIN:
                                        newUser.roles.typeList.push(UserRole.ADMIN);
                                        newUser.roles.admin = {
                                            stationID: role.stationID,
                                            manager: role.manager || false
                                        };
                                        break;
                                }
                                rolesToAdd.push({
                                    typeCode: role.typeCode,
                                    options: role
                                });
                            }
                            if (newUser.roles.typeList.indexOf(UserRole.CUSTOMER) === -1) {
                                newUser.roles.typeList.push(UserRole.CUSTOMER);
                                newUser.roles.customer = {
                                    group: UserGroup.GOODTOGO_MEMBER
                                };
                            }
                            rolesToAdd.push({
                                typeCode: UserRole.CUSTOMER,
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
                                    redis.del('user_verifying:' + phone, (err, delReply) => {
                                        if (err && options.passVerify !== true) return done(err);
                                        if (delReply !== 1 && options.passVerify !== true) return done("delReply: " + delReply);
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
        } else if (!(typeof phone === 'string' && isMobilePhone(phone) && typeof line_liff_userID === 'string' && typeof line_channel_userID === 'string')) {
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
                sendVerificationCode(phone, done);
            } else {
                redis.get('user_verifying:' + phone, (err, reply) => {
                    if (err) return done(err);
                    if (options.passVerify !== true) {
                        if (reply === null) return done(null, false, {
                            code: 'D010',
                            type: 'signupMessage',
                            message: 'Verification Code expired'
                        });
                        else if (reply !== verificationCode) return done(null, false, {
                            code: 'D011',
                            type: 'signupMessage',
                            message: "Verification Code isn't correct"
                        });
                    }

                    let userToSave;
                    if (dbUser) { // has NOT verified
                        userToSave = dbUser;
                    } else {
                        let newUser = new User();
                        newUser.user.phone = phone;
                        newUser.user.password = null;
                        newUser.registerMethod = options.registerMethod;
                        newUser.roles.typeList.push(UserRole.CUSTOMER);
                        userToSave = newUser;
                    }

                    userToSave.user.line_liff_userID = line_liff_userID;
                    userToSave.user.line_channel_userID = line_channel_userID;
                    let customerRole;
                    if (worker_id !== null) {
                        userToSave.roles.customer = {
                            group: UserGroup.KUANG_TIEN_STAFF,
                            worker_id
                        };
                        customerRole = {
                            group: UserGroup.KUANG_TIEN_STAFF,
                            extraArg: {
                                worker_id
                            }
                        };
                        userToSave.hasPurchase = true;
                    } else {
                        userToSave.roles.customer = {
                            group: UserGroup.GOODTOGO_MEMBER
                        };
                        customerRole = {
                            group: UserGroup.GOODTOGO_MEMBER
                        };
                    }
                    userToSave.hasVerified = true;
                    userToSave.agreeTerms = true;
                    userToSave.addRole(UserRole.CUSTOMER, customerRole, err => {
                        if (err) return done(err);
                        userToSave.save(function (err) {
                            if (err) return done(err);
                            redis.del('user_verifying:' + phone, (err, delReply) => {
                                if (err && options.passVerify !== true) return done(err);
                                if (delReply !== 1 && options.passVerify !== true) return done("delReply: " + delReply);
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
        var phone = req.body.phone;
        var password = req.body.password;
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
            const typeList = dbUser.roles.typeList;
            Promise
                .all(typeList.map(aRoleType => new Promise((resolve, reject) => {
                    keys.keyPair(function (err, returnKeys) {
                        if (err) return reject(err);
                        UserKeys.findOneAndUpdate({
                            'phone': phone,
                            'clientId': req.signedCookies.uid || req._uid,
                            'roleType': aRoleType
                        }, {
                            'secretKey': returnKeys.secretKey,
                            'userAgent': req.headers['user-agent'],
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
                        return done(null, dbUser, {
                            headers: {
                                Authorization: tokenBuilder(serverSecretKey, keyPairList, dbUser)
                            },
                            body: {
                                type: 'loginMessage',
                                message: 'Authentication succeeded'
                            }
                        });
                    });
                })
                .catch((err) => {
                    if (err) return done(err);
                });
        });
    },
    chanpass: function (req, done) {
        var oriPassword = req.body.oriPassword;
        var newPassword = req.body.newPassword;
        if (typeof oriPassword === 'undefined' || typeof newPassword === 'undefined') {
            return done(null, false, {
                code: 'D007',
                type: 'chanPassMessage',
                message: 'Content not Complete'
            });
        }
        var dbUser = req._user;
        if (!dbUser.validPassword(oriPassword))
            return done(null, false, {
                code: 'D008',
                type: 'chanPassMessage',
                message: 'Wrong password'
            });
        dbUser.user.password = dbUser.generateHash(newPassword);
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
        var phone = req.body.phone;
        var code = req.body.verification_code;
        var newPassword = req.body.new_password;
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
            if (typeof code === 'undefined' || typeof newPassword === 'undefined') {
                if (!(typeof phone === 'string' && isMobilePhone(phone)))
                    return done(null, false, {
                        code: 'D009',
                        type: 'forgotPassMessage',
                        message: 'Phone is not valid'
                    });
                var newCode = keys.getVerificationCode();
                sendCode('+886' + phone.substr(1, 10), '您的好盒器更改密碼驗證碼為：' + newCode + '，請於3分鐘內完成驗證。', function (err, snsMsg) {
                    if (err) return done(err);
                    redis.setex('newPass_verifying:' + phone, 60 * 3, newCode, (err, reply) => {
                        if (err) return done(err);
                        if (reply !== 'OK') return done(reply);
                        done(null, true, {
                            needVerificationCode: true,
                            body: {
                                type: 'forgotPassMessage',
                                message: 'Send Again With Verification Code'
                            }
                        });
                    });
                });
            } else {
                redis.get('newPass_verifying:' + phone, (err, reply) => {
                    if (reply === null) return done(null, false, {
                        code: 'D010',
                        type: 'forgotPassMessage',
                        message: 'Verification Code expired'
                    });
                    else if (reply !== code) return done(null, false, {
                        code: 'D011',
                        type: 'forgotPassMessage',
                        message: "Verification Code isn't correct"
                    });
                    UserKeys.deleteMany({
                        'phone': dbUser.user.phone
                    }, (err) => {
                        if (err) return done(err);
                        dbUser.user.password = dbUser.generateHash(newPassword);
                        dbUser.save(function (err) {
                            if (err) return done(err);
                            redis.del('newPass_verifying:' + phone, (err, delReply) => {
                                if (err) return done(err);
                                if (delReply !== 1) return done("delReply: " + delReply);
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
    logout: function (req, done) {
        var dbKey = req._key;
        var dbUser = req._user;
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
            typeCode: UserRole.BOT,
            scopeID: req.body.scopeID
        };
        const botName = req.body.botName;
        queue.push(doneQtask => {
            User.count({
                'role.typeCode': UserRole.BOT
            }, function (err, botAmount) {
                if (err) return done(err);
                const botID = `bot${intReLength(botAmount + 1, 5)}`;
                const newUser = new User({
                    user: {
                        phone: botID,
                        name: botName
                    },
                    role: role,
                    roles: {
                        typeList: [UserRole.BOT],
                        bot: role
                    },
                    active: true
                });
                newUser.addRole(role.typeCode, role, err => {
                    if (err) return done(err);
                    newUser.save(function (err) {
                        if (err) return done(err);
                        createBotKey(newUser, req.headers['user-agent'], function () {
                            done.apply(null, arguments);
                            return doneQtask();
                        });
                    });
                });
            });
        });
    },
    createBotKey: function (req, done) {
        User.findOne({
            'user.name': req.body.bot,
            'role.typeCode': UserRole.BOT
        }, function (err, theBot) {
            if (err) return done(err);
            if (!theBot)
                return done(null, false, {
                    code: 'D???',
                    type: 'botMessage',
                    message: 'No Bot Find'
                });
            createBotKey(theBot, req.headers['user-agent'], done)
        });
    }
};

function isMobilePhone(phone) {
    var reg = /^09[0-9]{8}$/;
    return reg.test(phone);
}

function isStudentID(phone) {
    var reg = /^[0-9]{7}$/;
    return reg.test(phone);
}

function getStoreName(dbUser) {
    var storeDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    if (typeof dbUser.roles.clerk === 'undefined' || typeof dbUser.roles.clerk.storeID === 'undefined') return undefined;
    var theStore = storeDict[dbUser.roles.clerk.storeID];
    if (theStore) return theStore.name;
    else return "找不到店家";
}

function tokenBuilder(serverSecretKey, userKey, dbUser) {
    var payload;
    if (Array.isArray(userKey)) {
        payload = {
            roles: {
                typeList: dbUser.roles.typeList
            }
        };
        for (var aRole in userKey) {
            payloadBuilder(payload, dbUser, userKey[aRole]);
        }
    } else {
        payload = {
            roles: {
                typeList: [userKey.roleType]
            }
        };
        payloadBuilder(payload, dbUser, userKey);
    }
    var token = jwt.encode(payload, serverSecretKey);
    return token;
}

function payloadBuilder(payload, dbUser, userKey) {
    if (userKey.roleType === UserRole.CUSTOMER) {
        payload.roles.customer = {
            apiKey: userKey.apiKey,
            secretKey: userKey.secretKey,
        };
    } else if (String(userKey.roleType).startsWith(`${UserRole.CLERK}`)) {
        payload.roles[userKey.roleType] = {
            storeID: dbUser.roles.clerk.storeID,
            manager: dbUser.roles.clerk.manager,
            apiKey: userKey.apiKey,
            secretKey: userKey.secretKey,
            storeName: getStoreName(dbUser),
        };
    } else if (userKey.roleType === UserRole.ADMIN) {
        payload.roles.admin = {
            stationID: dbUser.roles.admin.stationID,
            manager: dbUser.roles.admin.manager,
            apiKey: userKey.apiKey,
            secretKey: userKey.secretKey,
        };
    }
}

function createBotKey(theBot, ua, done) {
    keys.apiKey(function (err, returnKeys) {
        if (err) return done(err);
        UserKeys.findOneAndUpdate({
            'phone': theBot.user.phone,
            'roleType': UserRole.BOT,
            'user': theBot._id
        }, {
            'secretKey': returnKeys.secretKey,
            'userAgent': ua,
            '$setOnInsert': {
                'apiKey': returnKeys.apiKey
            }
        }, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }, (err, keyPair) => {
            if (err) return done(err);
            done(null, true, {
                body: {
                    type: 'signupMessage',
                    message: 'Authentication succeeded',
                    keys: {
                        apiKey: returnKeys.apiKey,
                        secretKey: returnKeys.secretKey
                    }
                }
            });
        });
    });
}