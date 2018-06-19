var jwt = require('jwt-simple');
var validateRequest = require('../models/validation/validateRequest').JWT;
var UserKeys = require('../models/DB/userKeysDB');
var User = require('../models/DB/userDB');
var keys = require('../config/keys');
var sendCode = require('../models/SNS').sms_now;

module.exports = {
    signup: function(req, done) {
        var role = req.body['role'] || {
            typeCode: 'customer'
        };
        var phone = req.body['phone'];
        var password = req.body['password'];
        var code = req.body['verification_code'];
        var redis = req.app.get('redis');
        if (typeof phone === 'undefined' || (typeof password === 'undefined' && !(typeof req._user !== 'undefined' && role.typeCode === 'clerk'))) {
            return done(null, false, {
                code: 'D001',
                type: 'signupMessage',
                message: 'Content not Complete'
            });
        }
        var stores = req.app.get('store');
        process.nextTick(function() {
            User.findOne({
                'user.phone': phone
            }, function(err, dbUser) {
                if (err)
                    return done(err);
                if (dbUser) {
                    if (dbUser.role.typeCode === 'customer' && role.typeCode === 'clerk') {
                        dbUser.role = role;
                        dbUser.save(function(err) {
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
                    if (req._passCode !== true && typeof code === 'undefined') {
                        if (typeof phone === 'string' && phone.length === 10) {
                            var newCode = keys.getVerificationCode();
                            sendCode('+886' + phone.substr(1, 10), '您的好盒器註冊驗證碼為：' + newCode + '，請於3分鐘內完成驗證。', function(err, snsMsg) {
                                if (err) return done(err);
                                redis.set('user_verifying:' + phone, newCode, (err, reply) => {
                                    if (err) return done(err);
                                    if (reply !== 'OK') return done(reply);
                                    redis.expire('user_verifying:' + phone, 60 * 3, (err, reply) => {
                                        if (err) return done(err);
                                        if (reply !== 1) return done(reply);
                                        done(null, true, {
                                            needCode: true,
                                            body: {
                                                type: 'signupMessage',
                                                message: 'Send Again With Verification Code'
                                            }
                                        });
                                    });
                                });
                            });
                        } else {
                            done(null, false, {
                                code: 'D009',
                                type: 'signupMessage',
                                message: 'Phone is not valid'
                            });
                        }
                    } else {
                        redis.get('user_verifying:' + phone, (err, reply) => {
                            if (reply === null && req._passCode !== true) return done(null, false, {
                                code: 'D010',
                                type: 'signupMessage',
                                message: 'Verification Code expired'
                            });
                            else if (reply !== code && req._passCode !== true) return done(null, false, {
                                code: 'D011',
                                type: 'signupMessage',
                                message: "Verification Code isn't correct"
                            });
                            keys.apiKey(function(err, returnKeys) {
                                if (err) return done(err);
                                if ((role.typeCode === 'clerk' && (typeof role.manager === 'undefined' || typeof role.storeID === 'undefined')) ||
                                    (role.typeCode === 'admin' && (typeof role.manager === 'undefined' || typeof role.storeID !== 'undefined')) ||
                                    (role.typeCode === 'customer' && (typeof role.manager !== 'undefined' || typeof role.storeID !== 'undefined'))) {
                                    return done(null, false, {
                                        code: 'D003',
                                        type: 'signupMessage',
                                        message: 'Role structure invalid'
                                    });
                                }
                                var newUser = new User();
                                newUser.user.phone = phone;
                                newUser.user.password = newUser.generateHash(password);
                                newUser.active = req.body['active'];
                                var newUserKey = new UserKeys();
                                newUserKey.phone = phone;
                                newUserKey.userAgent = req.headers['user-agent'];
                                newUserKey.apiKey = returnKeys.apiKey;
                                newUserKey.secretKey = returnKeys.secretKey;
                                newUserKey.user = newUser._id;
                                newUser.role = role;
                                newUser.save(function(err) {
                                    if (err) return done(err);
                                    newUserKey.save(function(err) {
                                        if (err) return done(err);
                                        var storeName = getStoreName(stores, newUser);
                                        var payload = {
                                            apiKey: returnKeys.apiKey,
                                            secretKey: returnKeys.secretKey,
                                            role: {
                                                typeCode: newUser.role.typeCode,
                                                storeID: newUser.role.storeID,
                                                storeName: storeName,
                                                manager: newUser.role.manager
                                            }
                                        };
                                        var token = jwt.encode(payload, returnKeys.serverSecretKey);
                                        return done(null, true, {
                                            headers: {
                                                Authorization: token
                                            },
                                            body: {
                                                type: 'signupMessage',
                                                message: 'Authentication succeeded'
                                            }
                                        });
                                    });
                                });
                            });
                        });
                    }
                }
            });
        });
    },
    login: function(req, done) {
        var phone = req.body['phone'];
        var password = req.body['password'];
        if (typeof phone === 'undefined' || typeof password === 'undefined') {
            return done(null, false, {
                code: 'D004',
                type: 'loginMessage',
                message: 'Content not Complete'
            });
        }
        var stores = req.app.get('store');
        process.nextTick(function() {
            keys.apiKey(function(err, returnKeys) {
                if (err) return done(err);
                User.findOne({
                    'user.phone': phone
                }, function(err, dbUser) {
                    if (err)
                        return done(err);
                    if (!dbUser)
                        return done(null, false, {
                            code: 'D005',
                            type: 'loginMessage',
                            message: 'No user found'
                        });
                    if (!dbUser.validPassword(password))
                        return done(null, false, {
                            code: 'D006',
                            type: 'loginMessage',
                            message: 'Wrong password'
                        });
                    var newSecretKey = returnKeys.secretKey;
                    UserKeys.findOneAndUpdate({
                        'phone': phone,
                        'userAgent': req.headers['user-agent']
                    }, {
                        'secretKey': newSecretKey,
                        '$setOnInsert': {
                            'apiKey': returnKeys.apiKey,
                            'user': dbUser._id,
                            'userAgent': req.headers['user-agent']
                        }
                    }, {
                        upsert: true,
                        setDefaultsOnInsert: true
                    }, (err, keyPair) => {
                        if (err) return done(err);
                        dbUser.save(function(err) {
                            if (err) return done(err);
                            var storeName = getStoreName(stores, dbUser);
                            var apiKey = (!keyPair) ? returnKeys.apiKey : keyPair.apiKey;
                            var payload = {
                                apiKey: apiKey,
                                secretKey: newSecretKey,
                                role: {
                                    typeCode: dbUser.role.typeCode,
                                    storeID: dbUser.role.storeID,
                                    storeName: storeName,
                                    manager: dbUser.role.manager
                                }
                            };
                            var token = jwt.encode(payload, returnKeys.serverSecretKey);
                            return done(null, dbUser, {
                                headers: {
                                    Authorization: token
                                },
                                body: {
                                    type: 'loginMessage',
                                    message: 'Authentication succeeded'
                                }
                            });
                        });
                    });
                });
            });
        });
    },
    chanpass: function(req, done) {
        var oriPassword = req.body['oriPassword'];
        var newPassword = req.body['newPassword'];
        if (typeof oriPassword === 'undefined' || typeof newPassword === 'undefined') {
            return done(null, false, {
                code: 'D007',
                type: 'chanPassMessage',
                message: 'Content not Complete'
            });
        }
        var stores = req.app.get('store');
        var dbUser = req._user;
        var dbKey = req._key;
        if (!dbUser.validPassword(oriPassword))
            return done(null, false, {
                code: 'D008',
                type: 'chanPassMessage',
                message: 'Wrong password'
            });
        dbUser.user.password = dbUser.generateHash(newPassword);
        keys.secretKey(function(err, returnKeys) {
            dbKey.secretKey = returnKeys.secretKey;
            dbUser.save(function(err) {
                if (err) return done(err);
                dbKey.save(function(err) {
                    if (err) return done(err);
                    var storeName = getStoreName(stores, dbUser);
                    var payload = {
                        apiKey: dbKey.apiKey,
                        secretKey: dbKey.secretKey,
                        role: {
                            typeCode: dbUser.role.typeCode,
                            storeID: dbUser.role.storeID,
                            storeName: storeName,
                            manager: dbUser.role.manager
                        }
                    };
                    var token = jwt.encode(payload, returnKeys.serverSecretKey);
                    return done(null, dbUser, {
                        headers: {
                            Authorization: token
                        },
                        body: {
                            type: 'chanPassMessage',
                            message: 'Change succeeded'
                        }
                    });
                });
            });
        });
    },
    forgotpass: function(req, done) {
        var phone = req.body['phone'];
        var code = req.body['verification_code'];
        var newPassword = req.body['new_password'];
        var redis = req.app.get('redis');
        if (typeof phone === 'undefined') {
            return done(null, false, {
                code: 'D012',
                type: 'forgotPassMessage',
                message: 'Content not Complete'
            });
        }
        User.findOne({
            'user.phone': phone
        }, function(err, dbUser) {
            if (!dbUser) return done(null, false, {
                code: 'D013',
                type: 'forgotPassMessage',
                message: 'No User Found'
            });
            if (typeof code === 'undefined' || typeof newPassword === 'undefined') {
                if (typeof phone === 'string' && phone.length === 10) {
                    var newCode = keys.getVerificationCode();
                    sendCode('+886' + phone.substr(1, 10), '您的好盒器更改密碼驗證碼為：' + newCode + '，請於3分鐘內完成驗證。', function(err, snsMsg) {
                        if (err) return done(err);
                        redis.set('newPass_verifying:' + phone, newCode, (err, reply) => {
                            if (err) return done(err);
                            if (reply !== 'OK') return done(reply);
                            redis.expire('newPass_verifying:' + phone, 60 * 3, (err, reply) => {
                                if (err) return done(err);
                                if (reply !== 1) return done(reply);
                                done(null, true, {
                                    needCode: true,
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
                    UserKeys.remove({
                        'phone': phone
                    }, function(err) {
                        if (err) return done(err);
                        dbUser.user.password = dbUser.generateHash(newPassword);
                        keys.apiKey(function(err, returnKeys) {
                            var newUserKey = new UserKeys();
                            newUserKey.phone = phone;
                            newUserKey.userAgent = req.headers['user-agent'];
                            newUserKey.apiKey = returnKeys.apiKey;
                            newUserKey.secretKey = returnKeys.secretKey;
                            newUserKey.user = dbUser._id;
                            dbUser.save(function(err) {
                                if (err) return done(err);
                                newUserKey.save(function(err) {
                                    if (err) return done(err);
                                    var storeName = getStoreName(stores, dbUser);
                                    var payload = {
                                        apiKey: newUserKey.apiKey,
                                        secretKey: newUserKey.secretKey,
                                        role: {
                                            typeCode: dbUser.role.typeCode,
                                            storeID: dbUser.role.storeID,
                                            storeName: storeName,
                                            manager: dbUser.role.manager
                                        }
                                    };
                                    var token = jwt.encode(payload, returnKeys.serverSecretKey);
                                    return done(null, dbUser, {
                                        headers: {
                                            Authorization: token
                                        },
                                        body: {
                                            type: 'forgotPassMessage',
                                            message: 'Change Password succeeded'
                                        }
                                    });
                                });
                            });
                        });
                    });
                });
            }
        });
    },
    logout: function(req, done) {
        var dbKey = req._key;
        var dbUser = req._user;
        dbKey.remove(function(err, updatedUser) {
            if (err) return done(err);
            return done(null, dbKey, {
                type: 'logoutMessage',
                message: 'Logout succeeded.'
            });
        });
    }
};

function getStoreName(storeList, dbUser) {
    if (typeof dbUser.role.storeID === 'undefined') return undefined;
    var theStore = storeList.find((aStore) => {
        return aStore.ID === dbUser.role.storeID;
    });
    if (theStore) return theStore.name;
    else return "找不到店家";
}