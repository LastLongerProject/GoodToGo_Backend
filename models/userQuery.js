var jwt = require('jwt-simple');
var validateRequest = require('../models/validation/validateRequest').JWT;
var UserKeys = require('../models/DB/userKeysDB');
var User = require('../models/DB/userDB');
var keys = require('../config/keys');
var sendCode = require('../models/sendSNS').sms_now;

module.exports = {
    signup: function(req, done) {
        var role = req.body['role'] || { typeCode: 'customer' };
        var phone = req.body['phone'];
        var password = req.body['password'];
        var code = req.body['verification_code'];
        var redis = req.app.get('redis');
        if (typeof phone === 'undefined' || (typeof password === 'undefined' && !(typeof req._user !== 'undefined' && role.typeCode === 'clerk'))) {
            return done(null, false, { code: 'D001', type: 'signupMessage', message: 'Content not Complete' });
        }
        var stores = req.app.get('store');
        process.nextTick(function() {
            User.findOne({ 'user.phone': phone }, function(err, dbUser) {
                if (err)
                    return done(err);
                if (dbUser) {
                    if (dbUser.role.typeCode === 'customer' && role.typeCode === 'clerk') {
                        dbUser.role = role;
                        dbUser.save(function(err) {
                            if (err) return done(err);
                            return done(null, dbUser, { body: { type: 'signupMessage', message: 'Authentication succeeded' } });
                        });
                    } else {
                        return done(null, false, { code: 'D002', type: 'signupMessage', message: 'That phone is already taken' });
                    }
                } else {
                    if (req._passCode !== true && typeof code === 'undefined') {
                        if (typeof phone === 'string' && phone.length === 10) {
                            var newCode = keys.getVerificationCode();
                            sendCode('+886' + phone.substr(1, 10), '您的好盒器驗證碼為：' + newCode + '，請於3分鐘內完成驗證。', function(err, snsMsg) {
                                if (err) return done(err);
                                redis.set('user_verifying:' + phone, newCode, (err, reply) => {
                                    if (err) return done(err);
                                    if (reply !== 'OK') return done(reply);
                                    redis.expire('user_verifying:' + phone, 60 * 3, (err, reply) => {
                                        if (err) return done(err);
                                        if (reply !== 1) return done(reply);
                                        done(null, true, { needCode: true, body: { type: 'signupMessage', message: 'Send Again With Verification Code' } });
                                    });
                                });
                            });
                        } else {
                            done(null, false, { code: 'D009', type: 'signupMessage', message: 'Phone is not valid' });
                        }
                    } else {
                        redis.get('user_verifying:' + phone, (err, reply) => {
                            if (reply === null && req._passCode !== true) return done(null, false, { code: 'D010', type: 'signupMessage', message: 'Verification Code expired' });
                            else if (reply !== code && req._passCode !== true) return done(null, false, { code: 'D011', type: 'signupMessage', message: "Verification Code isn't correct" });
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
                                // newUser.save(function(err) {
                                //     if (err) return done(err);
                                //     newUserKey.save(function(err) {
                                //         if (err) return done(err);
                                var storeName = (typeof newUser.role.storeID !== 'undefined') ? ((stores[(newUser.role.storeID)]) ? stores[(newUser.role.storeID)].name : "找不到店家") : undefined;
                                var payload = { apiKey: returnKeys.apiKey, secretKey: returnKeys.secretKey, role: { typeCode: newUser.role.typeCode, storeID: newUser.role.storeID, storeName: storeName, manager: newUser.role.manager } };
                                var token = jwt.encode(payload, returnKeys.serverSecretKey);
                                return done(null, true, { headers: { Authorization: token }, body: { type: 'signupMessage', message: 'Authentication succeeded' } });
                                //     });
                                // });
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
            return done(null, false, { code: 'D004', type: 'loginMessage', message: 'Content not Complete' });
        }
        var stores = req.app.get('store');
        process.nextTick(function() {
            keys.apiKey(function(err, returnKeys) {
                if (err) return done(err);
                User.findOne({ 'user.phone': phone }, function(err, dbUser) {
                    if (err)
                        return done(err);
                    if (!dbUser)
                        return done(null, false, { code: 'D005', type: 'loginMessage', message: 'No user found' });
                    if (!dbUser.validPassword(password))
                        return done(null, false, { code: 'D006', type: 'loginMessage', message: 'Wrong password' });
                    var newSecretKey = returnKeys.secretKey;
                    UserKeys.findOneAndUpdate({ 'phone': phone, 'userAgent': req.headers['user-agent'] }, {
                        'secretKey': newSecretKey,
                        '$setOnInsert': { 'apiKey': returnKeys.apiKey, 'user': dbUser._id, 'userAgent': req.headers['user-agent'] }
                    }, {
                        upsert: true,
                        setDefaultsOnInsert: true
                    }, (err, keyPair) => {
                        if (err) return done(err);
                        dbUser.save(function(err) {
                            if (err) return done(err);
                            var storeName = (typeof dbUser.role.storeID !== 'undefined') ? ((stores[(dbUser.role.storeID)]) ? stores[(dbUser.role.storeID)].name : "找不到店家") : undefined;
                            var payload;
                            if (!keyPair) {
                                payload = { apiKey: returnKeys.apiKey, secretKey: newSecretKey, role: { typeCode: dbUser.role.typeCode, storeID: dbUser.role.storeID, storeName: storeName, manager: dbUser.role.manager } };
                            } else {
                                payload = { apiKey: keyPair.apiKey, secretKey: newSecretKey, role: { typeCode: dbUser.role.typeCode, storeID: dbUser.role.storeID, storeName: storeName, manager: dbUser.role.manager } };
                            }
                            var token = jwt.encode(payload, returnKeys.serverSecretKey);
                            return done(null, dbUser, { headers: { Authorization: token }, body: { type: 'loginMessage', message: 'Authentication succeeded' } });
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
            return done(null, false, { code: 'D007', type: 'chanPassMessage', message: 'Content not Complete' });
        }
        var stores = req.app.get('store');
        var dbUser = req._user;
        var dbKey = req._key;
        if (!dbUser.validPassword(oriPassword))
            return done(null, false, { code: 'D008', type: 'chanPassMessage', message: 'Wrong password' });
        dbUser.user.password = dbUser.generateHash(newPassword);
        keys.secretKey(function(err, returnKeys) {
            dbKey.secretKey = returnKeys.secretKey;
            dbUser.save(function(err) {
                if (err) return done(err);
                dbKey.save(function(err) {
                    if (err) return done(err);
                    var storeName = (typeof dbUser.role.storeID !== 'undefined') ? ((stores[(dbUser.role.storeID)]) ? stores[(dbUser.role.storeID)].name : "找不到店家") : undefined;
                    var payload = { apiKey: dbKey.apiKey, secretKey: dbKey.secretKey, role: { typeCode: dbUser.role.typeCode, storeID: dbUser.role.storeID, storeName: storeName, manager: dbUser.role.manager } };
                    var token = jwt.encode(payload, returnKeys.serverSecretKey);
                    return done(null, dbUser, { headers: { Authorization: token }, body: { type: 'chanPassMessage', message: 'Change succeeded' } });
                });
            });
        });
    },
    logout: function(req, done) {
        var dbKey = req._key;
        var dbUser = req._user;
        dbKey.remove(function(err, updatedUser) {
            if (err) return done(err);
            return done(null, dbKey, { type: 'logoutMessage', message: 'Logout succeeded.' });
        });
    }
};