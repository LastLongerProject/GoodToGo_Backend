var jwt = require('jwt-simple');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy; // load all the things we need
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
                // if there is no user with that phone, create the user
                var newUser            = new User();
                var role               = req.body['role'];
                // set the user's local credentials
                newUser.user.phone     = phone;
                newUser.user.password  = newUser.generateHash(password);
                newUser.user.apiKey    = keys.apiKey();
                newUser.user.secretKey = keys.secretKey();
                if (typeof role === 'undefined') {
                    newUser.role.typeCode = 'customer';
                } else if (role.typeCode === 'clerk') {
                    newUser.role = role;
                }
                newUser.save(function(err) { // save the user
                    if (err) return done(err);
                    var token = jwt.encode({apiKey: newUser.user.apiKey, secretKey: newUser.user.secretKey, role: newUser.user.role}, keys.serverSecretKey());
                    return done(null, true, {headers: {Authorization: token}, body: {type: 'signupMessage', message: 'Authentication succeeded'}});
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
        User.findOne({'user.phone': phone }, function(err, user) {
            // if there are any errors, return the error before anything else
            if (err)
                return done(err);
            // if no user is found, return the message
            if (!user)
                return done(null, false, { type:'loginMessage', message: 'No user found.' });
            // if the user is found but the password is wrong
            if (!user.validPassword(password))
                return done(null, false, { type:'loginMessage', message: 'Oops! Wrong password.' }); 
            // all is well, return successful user
            user.user.apiKey    = keys.apiKey();
            user.user.secretKey = keys.secretKey();
            user.save(function(err) { // save the user
                if (err) return done(err);
            });
            var token = jwt.encode({apiKey: user.user.apiKey, secretKey: user.user.secretKey, role: user.user.role}, keys.serverSecretKey());
            return done(null, user, {headers: {Authorization: token}, body: {type: 'loginMessage', message: 'Authentication succeeded'}});
        });
    });
}));

passport.use('local-logout', new CustomStrategy(function(req, done){
    validateRequest(req, req._res, function(dbUser){
        process.nextTick(function() {
            User.findOne({'user.phone': dbUser.user.phone }, function(err, user) {
                if (err)
                    return done(err);
                if (!user)
                    return done(null, false, { type:'logoutMessage', message: 'No user found.'});
                user.user.apiKey = undefined;
                user.user.secretKey = undefined;
                user.save(function (err, updatedUser) {
                    if (err) return done(err);
                    return done(null, user, { type:'logoutMessage', message: 'Logout succeeded.'});
                });
            });
        });
    })
}));

module.exports = passport;