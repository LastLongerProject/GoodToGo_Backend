const jwt = require('jwt-simple');
const queue = require('queue')({
    concurrency: 1,
    autostart: true
});

const sendCode = require("../helpers/aws/SNS").sms_now;
const intReLength = require('@lastlongerproject/toolkit').intReLength;
const keys = require('../config/keys');
const redis = require("../models/redis");
const User = require('../models/DB/userDB');
const UserKeys = require('../models/DB/userKeysDB');
const DataCacheFactory = require("../models/dataCacheFactory");
const UserRole = require('../models/enums/userEnum').UserRole;

function sendVerificationCode(phone, done) {
    var newCode = keys.getVerificationCode();
    sendCode('+886' + phone.substr(1, 10), '您的好盒器註冊驗證碼為：' + newCode + '，請於3分鐘內完成驗證。', function (err, snsMsg) {
        if (err) return done(err);
        redis.set('user_verifying:' + phone, newCode, (err, reply) => {
            if (err) return done(err);
            if (reply !== 'OK') return done(reply);
            redis.expire('user_verifying:' + phone, 60 * 3, (err, reply) => {
                if (err) return done(err);
                if (reply !== 1) return done(reply);
                done(null, true, {
                    needVerificationCode: true,
                    body: {
                        type: 'signupMessage',
                        message: 'Send Again With Verification Code'
                    }
                });
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

        if (typeof phone === 'undefined' ||
            (typeof password === 'undefined' &&
                !(typeof req._user !== 'undefined' && role.typeCode === UserRole.CLERK))) {
            return done(null, false, {
                code: 'D001',
                type: 'signupMessage',
                message: 'Content not Complete'
            });
        } else if (!(typeof phone === 'string' && (isMobilePhone(phone) || isStudentID(phone)))) {
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
        User.findOne({
            'user.phone': phone
        }, function (err, dbUser) {
            if (err)
                return done(err);
            if (dbUser && dbUser.hasVerified) {
                if (dbUser.user.password === null) {
                    dbUser.user.password = dbUser.generateHash(password);
                    dbUser.save(function (err) {
                        if (err) return done(err);
                        return done(null, dbUser, {
                            body: {
                                type: 'signupMessage',
                                message: 'Authentication succeeded'
                            }
                        });
                    });
                } else if ((role.typeCode === UserRole.CLERK || role.typeCode === UserRole.ADMIN) && dbUser.roles.typeList.indexOf(role.typeCode) === -1) {
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
                    dbUser.save(function (err) {
                        if (err) return done(err);
                        return done(null, dbUser, {
                            body: {
                                type: 'signupMessage',
                                message: 'Authentication succeeded'
                            }
                        });
                    });
                } else {
                    return done(null, false, {
                        code: 'D002',
                        type: 'signupMessage',
                        message: 'That phone is already taken'
                    });
                }
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
                                newUser.roles.typeList.push(UserRole.CUSTOMER);
                            }
                            userToSave = newUser;
                        }

                        userToSave.hasVerified = hasVerified;
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
                    });
                }
            }
        });
    },
    signupLineUser: function (req, done) {
        const phone = req.body.phone.replace(/tel:|-/g, "");
        const verificationCode = req.body.verification_code;
        const lineId = req.body.lineId;
        let options = req._options || {};

        if (typeof phone === 'undefined' || typeof lineId === 'undefined') {
            return done(null, false, {
                code: 'D001',
                type: 'signupMessage',
                message: 'Content not Complete'
            });
        } else if (!(typeof phone === 'string' && isMobilePhone(phone) && typeof lineId === 'string')) {
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
            } else {
                if (typeof verificationCode === 'undefined') {
                    sendVerificationCode(phone, done);
                } else {
                    redis.get('user_verifying:' + phone, (err, reply) => {
                        if (err) return done(err);
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

                        userToSave.user.lineId = lineId;
                        userToSave.hasVerified = true;
                        userToSave.agreeTerms = true;
                        userToSave.save(function (err) {
                            if (err) return done(err);
                            redis.del('user_verifying:' + phone, (err, delReply) => {
                                if (err) return done(err);
                                if (delReply !== 1) return done("delReply: " + delReply);
                                return done(null, true, {
                                    body: {
                                        type: 'signupMessage',
                                        message: 'Authentication succeeded'
                                    }
                                });
                            });
                        });
                    });
                }
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
        process.nextTick(function () {
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
                var funcList = [];
                var typeList = dbUser.roles.typeList;
                for (var i = 0; i < typeList.length; i++) {
                    funcList.push(new Promise((resolve, reject) => {
                        var thisCtr = i;
                        keys.keyPair(function (err, returnKeys) {
                            if (err) return reject(err);
                            UserKeys.findOneAndUpdate({
                                'phone': phone,
                                'clientId': req.signedCookies.uid || req._uid,
                                'roleType': typeList[thisCtr]
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
                    }));
                }
                Promise
                    .all(funcList)
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
                if (typeof phone === 'string' && isMobilePhone(phone)) {
                    var newCode = keys.getVerificationCode();
                    sendCode('+886' + phone.substr(1, 10), '您的好盒器更改密碼驗證碼為：' + newCode + '，請於3分鐘內完成驗證。', function (err, snsMsg) {
                        if (err) return done(err);
                        redis.set('newPass_verifying:' + phone, newCode, (err, reply) => {
                            if (err) return done(err);
                            if (reply !== 'OK') return done(reply);
                            redis.expire('newPass_verifying:' + phone, 60 * 3, (err, reply) => {
                                if (err) return done(err);
                                if (reply !== 1) return done(reply);
                                done(null, true, {
                                    needVerificationCode: true,
                                    body: {
                                        type: 'forgotPassMessage',
                                        message: 'Send Again With Verification Code'
                                    }
                                });
                            });
                        });
                    });
                } else {
                    done(null, false, {
                        code: 'D009',
                        type: 'forgotPassMessage',
                        message: 'Phone is not valid'
                    });
                }
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
        var role = {
            typeCode: 'bot',
            scopeID: req.body.scopeID
        };
        var botName = req.body.botName;
        queue.push(doneQtask => {
            User.count({
                'role.typeCode': UserRole.BOT
            }, function (err, botAmount) {
                if (err) return done(err);
                var botID = `bot${intReLength(botAmount + 1, 5)}`;
                keys.apiKey(function (err, returnKeys) {
                    if (err) return done(err);
                    var newUser = new User({
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
                    var newUserKey = new UserKeys({
                        phone: botID,
                        apiKey: returnKeys.apiKey,
                        secretKey: returnKeys.secretKey,
                        clientId: req.signedCookies.uid,
                        userAgent: req.headers['user-agent'],
                        roleType: UserRole.BOT,
                        user: newUser._id
                    });
                    newUser.save(function (err) {
                        if (err) return done(err);
                        newUserKey.save(function (err) {
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
            keys.apiKey(function (err, returnKeys) {
                if (err) return done(err);
                UserKeys.findOneAndUpdate({
                    'phone': theBot.user.phone,
                    'roleType': UserRole.BOT,
                    'user': theBot._id
                }, {
                    'secretKey': returnKeys.secretKey,
                    'userAgent': req.headers['user-agent'],
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
    var storeDict = DataCacheFactory.get('store');
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