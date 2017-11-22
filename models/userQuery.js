var fs = require('fs');
var jwt = require('jwt-simple');
var passport = require('passport');
var CustomStrategy = require('passport-custom').Strategy;
var validateRequest = require('../models/validateRequest').JWT;
var User = require('../models/DB/userDB');
var keys = require('../config/keys');

var stores;
fs.readFile("./assets/json/googlePlaceIDs.json", 'utf8', function(err, data) {
    if (err) throw err;
    stores = JSON.parse(data);
});

passport.use('local-signup', new CustomStrategy(function(req, done) {
    var role = req.body['role'] || { typeCode: 'customer' };
    var phone = req.body['phone'];
    var password = req.body['password'];
    if (typeof phone === 'undefined' || typeof password === 'undefined') {
        return done(null, false, { code: 'D001', type: 'signupMessage', message: 'Content not Complete' });
    }
    process.nextTick(function() {
        User.findOne({ 'user.phone': phone }, function(err, dbUser) {
            if (err)
                return done(err);
            if (dbUser) {
                if (dbUser.role.typeCode === 'customer' && role.typeCode === 'clerk') {
                    dbUser.role = role;
                    if (!dbUser.user.secretKey) dbUser.user.secretKey = keys.secretKey();
                    dbUser.save(function(err) {
                        var storeName = (typeof dbUser.role.storeID !== 'undefined') ? stores.IDlist[(dbUser.role.storeID)].name : undefined;
                        var payload = { apiKey: dbUser.user.apiKey, secretKey: dbUser.user.secretKey, role: { typeCode: dbUser.role.typeCode, storeID: dbUser.role.storeID, storeName: storeName, manager: dbUser.role.manager } };
                        var token = jwt.encode(payload, keys.serverSecretKey());
                        return done(null, true, { headers: { Authorization: token }, body: { type: 'signupMessage', message: 'Authentication succeeded' } });
                    });
                } else {
                    return done(null, false, { code: 'D002', type: 'signupMessage', message: 'That phone is already taken' });
                }
            } else {
                keys.apiKey(function(returnedApikey) {
                    var newUser = new User();
                    newUser.user.phone = phone;
                    newUser.user.password = newUser.generateHash(password);
                    newUser.user.apiKey = returnedApikey;
                    newUser.user.secretKey = keys.secretKey();
                    newUser.active = req.body['active'];
                    if (role.typeCode === 'admin' || role.typeCode === 'customer') {
                        newUser.role = role;
                    } else if (role.typeCode === 'clerk') {
                        if ((typeof req._permission === 'undefined' || req._permission === false) && role.manager !== true)
                            return done(null, false, {
                                code: 'D003',
                                type: 'signupMessage',
                                message: 'Permission deny, clerk should be only signup by manager'
                            });
                        newUser.role = role;
                    }
                    newUser.save(function(err) {
                        if (err) return done(err);
                        var storeName = (typeof dbUser.role.storeID !== 'undefined') ? stores.IDlist[(dbUser.role.storeID)].name : undefined;
                        var payload = { apiKey: dbUser.user.apiKey, secretKey: dbUser.user.secretKey, role: { typeCode: dbUser.role.typeCode, storeID: dbUser.role.storeID, storeName: storeName, manager: dbUser.role.manager } };
                        var token = jwt.encode(payload, keys.serverSecretKey());
                        return done(null, true, { headers: { Authorization: token }, body: { type: 'signupMessage', message: 'Authentication succeeded' } });
                    });
                });
            }
        });
    });
}));

passport.use('local-login', new CustomStrategy(function(req, done) {
    var phone = req.body['phone'];
    var password = req.body['password'];
    if (typeof phone === 'undefined' || typeof password === 'undefined') {
        return done(null, false, { code: 'D004', type: 'loginMessage', message: 'Content not Complete' });
    }
    process.nextTick(function() {
        User.findOne({ 'user.phone': phone }, function(err, dbUser) {
            if (err)
                return done(err);
            if (!dbUser)
                return done(null, false, { code: 'D005', type: 'loginMessage', message: 'No user found' });
            if (!dbUser.validPassword(password))
                return done(null, false, { code: 'D006', type: 'loginMessage', message: 'Wrong password' });
            dbUser.user.secretKey = keys.secretKey();
            dbUser.save(function(err) {
                if (err) return done(err);
                var storeName;
                // var storeName = (typeof dbUser.role.storeID !== 'undefined') ? stores.IDlist[(dbUser.role.storeID)].name : undefined;
                var payload = { apiKey: dbUser.user.apiKey, secretKey: dbUser.user.secretKey, role: { typeCode: dbUser.role.typeCode, storeID: dbUser.role.storeID, storeName: storeName, manager: dbUser.role.manager } };
                var token = jwt.encode(payload, keys.serverSecretKey());
                return done(null, dbUser, { headers: { Authorization: token }, body: { type: 'loginMessage', message: 'Authentication succeeded' } });
            });
        });
    });
}));

passport.use('local-chanpass', new CustomStrategy(function(req, done) {
    var oriPassword = req.body['oriPassword'];
    var newPassword = req.body['newPassword'];
    if (typeof oriPassword === 'undefined' || typeof newPassword === 'undefined') {
        return done(null, false, { code: 'D007', type: 'chanPassMessage', message: 'Content not Complete' });
    }
    validateRequest(req, req._res, function() {
        var dbUser = req._user;
        if (dbUser.status) return done(dbUser);
        process.nextTick(function() {
            if (!dbUser.validPassword(oriPassword))
                return done(null, false, { code: 'D008', type: 'chanPassMessage', message: 'Wrong password' });
            dbUser.user.password = dbUser.generateHash(newPassword);
            dbUser.user.secretKey = keys.secretKey();
            dbUser.save(function(err) {
                if (err) return done(err);
                var storeName = (typeof dbUser.role.storeID !== 'undefined') ? stores.IDlist[(dbUser.role.storeID)].name : undefined;
                var payload = { apiKey: dbUser.user.apiKey, secretKey: dbUser.user.secretKey, role: { typeCode: dbUser.role.typeCode, storeID: dbUser.role.storeID, storeName: storeName, manager: dbUser.role.manager } };
                var token = jwt.encode(payload, keys.serverSecretKey());
                return done(null, dbUser, { headers: { Authorization: token }, body: { type: 'chanPassMessage', message: 'Change succeeded' } });
            });
        });
    });
}));

passport.use('local-logout', new CustomStrategy(function(req, done) {
    validateRequest(req, req._res, function() {
        var dbUser = req._user;
        if (dbUser.status) return done(dbUser);
        process.nextTick(function() {
            dbUser.user.secretKey = undefined;
            dbUser.save(function(err, updatedUser) {
                if (err) return done(err);
                return done(null, dbUser, { type: 'logoutMessage', message: 'Logout succeeded.' });
            });
        });
    })
}));

module.exports = passport;