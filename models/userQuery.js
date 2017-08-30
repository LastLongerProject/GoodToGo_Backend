var jwt = require('jwt-simple');
var passport = require('passport');
var CustomStrategy = require('passport-custom').Strategy; // load all the things we need
var validateRequest = require('../models/validateRequest');
var User = require('../models/DB/userDB'); // load up the user model
var keys = require('../config/keys')

passport.use('local-signup', new CustomStrategy(function(req, done){
    var phone = req.body['phone'];
    var password = req.body['password'];
    if (typeof phone === 'undefined' || typeof password === 'undefined'){
        return done(null, false, { type:'signupMessage', message: 'Content lost' });
    }
    // asynchronous
    // User.findOne wont fire unless data is sent back
    process.nextTick(function() {
        // find a user whose phone is the same as the forms phone
        // we are checking to see if the user trying to sighup already exists
        User.findOne({'user.phone': phone }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                return done(err);
            // check to see if theres already a user with that phone
            if (user) {
                return done(null, false, { type:'signupMessage', message: 'That phone is already taken' });
            } else {
                keys.apiKey(function(returnedApikey){
                    // if there is no user with that phone, create the user
                    var newUser            = new User();
                    var role               = req.body['role'];
                    // set the user's local credentials
                    newUser.user.phone     = phone;
                    newUser.user.password  = newUser.generateHash(password);
                    newUser.user.apiKey    = returnedApikey;
                    newUser.user.secretKey = keys.secretKey();
                    if (typeof role === 'undefined') {
                        newUser.role.typeCode = 'customer';
                    } else if (role.typeCode === 'clerk') {
                        if (typeof req._permission === 'undefined' || req._permission === false)
                            return done(null, false, { type:'signupMessage', message: 'Permission deny, clerk should be only signup by manager'});
                        newUser.role = role;
                    }
                    newUser.save(function(err) { // save the user
                        if (err) return done(err);
                        var payload = {apiKey: newUser.user.apiKey, secretKey: newUser.user.secretKey, role: {typeCode: newUser.role.typeCode, storeID: newUser.role.clerk.storeID, manager: newUser.role.clerk.manager}};
                        var token = jwt.encode(payload, keys.serverSecretKey());
                        return done(null, true, {headers: {Authorization: token}, body: {type: 'signupMessage', message: 'Authentication succeeded'}});
                    });
                });
            }
        });
    });
}));

passport.use('local-login', new CustomStrategy(function(req, done){ // callback with phone and password
    var phone = req.body['phone'];
    var password = req.body['password'];
    if (typeof phone === 'undefined' || typeof password === 'undefined'){
        return done(null, false, { type:'signupMessage', message: 'Content lost' });
    }
    process.nextTick(function() {
        // find a user whose phone is the same as the forms phone
        // we are checking to see if the user trying to login already exists
        User.findOne({'user.phone': phone }, function(err, dbUser) {
            // if there are any errors, return the error before anything else
            if (err)
                return done(err);
            // if no user is found, return the message
            if (!dbUser)
                return done(null, false, { type:'loginMessage', message: 'No user found.' });
            // if the user is found but the password is wrong
            if (!dbUser.validPassword(password))
                return done(null, false, { type:'loginMessage', message: 'Oops! Wrong password.' }); 
            // all is well, return successful user
            keys.apiKey(function(returnedApikey){
                dbUser.user.apiKey    = returnedApikey;
                dbUser.user.secretKey = keys.secretKey();
                dbUser.save(function(err) { // save the user
                    if (err) return done(err);
                    var payload = {apiKey: dbUser.user.apiKey, secretKey: dbUser.user.secretKey, role: {typeCode: dbUser.role.typeCode, storeID: dbUser.role.clerk.storeID, manager: dbUser.role.clerk.manager}};
                    var token = jwt.encode(payload, keys.serverSecretKey());
                    return done(null, dbUser, {headers: {Authorization: token}, body: {type: 'loginMessage', message: 'Authentication succeeded'}});
                });
            });
        });
    });
}));

passport.use('local-chanpass', new CustomStrategy(function(req, done){ // callback with phone and password
    var oriPassword = req.body['oriPassword'];
    var newPassword = req.body['newPassword'];
    if (typeof oriPassword === 'undefined' || typeof newPassword === 'undefined'){
        return done(null, false, { type:'chanPassMessage', message: 'Content lost' });
    }
    validateRequest(req, req._res, function(dbUser){
        process.nextTick(function() {
            if (!dbUser.validPassword(oriPassword))
                return done(null, false, { type:'chanPassMessage', message: 'Oops! Wrong password.' });
            keys.apiKey(function(returnedApikey){
                dbUser.user.password  = dbUser.generateHash(newPassword);
                dbUser.user.apiKey    = returnedApikey;
                dbUser.user.secretKey = keys.secretKey();
                dbUser.save(function(err) { // save the user
                    if (err) return done(err);
                    var payload = {apiKey: dbUser.user.apiKey, secretKey: dbUser.user.secretKey, role: {typeCode: dbUser.role.typeCode, storeID: dbUser.role.clerk.storeID, manager: dbUser.role.clerk.manager}};
                    var token = jwt.encode(payload, keys.serverSecretKey());
                    return done(null, dbUser, {headers: {Authorization: token}, body: {type: 'chanPassMessage', message: 'Change succeeded'}});
                });
            });
        });
    });
}));

passport.use('local-logout', new CustomStrategy(function(req, done){
    validateRequest(req, req._res, function(dbUser){
        process.nextTick(function() {
            dbUser.user.apiKey = undefined;
            dbUser.user.secretKey = undefined;
            dbUser.save(function (err, updatedUser) {
                if (err) return done(err);
                return done(null, dbUser, { type:'logoutMessage', message: 'Logout succeeded.'});
            });
        });
    })
}));

module.exports = passport;