// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;

// load up the user model
var User            = require('../models/userDB');

// expose this function to our app using module.exports
module.exports = function(passport) {

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with phone
        usernameField : 'phone',
        passwordField : 'password'
    },
    function(phone, password, done) {

        // asynchronous
        // User.findOne wont fire unless data is sent back
        process.nextTick(function() {

        // find a user whose phone is the same as the forms phone
        // we are checking to see if the user trying to login already exists
        User.findOne({ 'user.phone' :  phone }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                return done(err);

            // check to see if theres already a user with that phone
            if (user) {
                return done(null, false, { type:'signupMessage',  message: 'That phone is already taken.' });
            } else {

                // if there is no user with that phone
                // create the user
                var newUser            = new User();

                // set the user's local credentials
                newUser.user.phone    = phone;
                newUser.user.password = newUser.generateHash(password);

                // save the user
                newUser.save(function(err) {
                    if (err)
                        throw err;
                    return done(null, newUser);
                });
            }

        });    

        });

    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with phone
        usernameField : 'phone',
        passwordField : 'password'
    },
    function(phone, password, done) { // callback with phone and password from our form

        // find a user whose phone is the same as the forms phone
        // we are checking to see if the user trying to login already exists
        User.findOne({ 'user.phone' :  phone }, function(err, user) {
            // if there are any errors, return the error before anything else
            if (err)
                return done(err);

            // if no user is found, return the message
            if (!user)
                return done(null, false, { type:'loginMessage',  message: 'No user found.' }); // req.flash is the way to set flashdata using connect-flash

            // if the user is found but the password is wrong
            if (!user.validPassword(password))
                return done(null, false, { type:'loginMessage',  message: 'Oops! Wrong password.' }); // create the loginMessage and save it to session as flashdata

            // all is well, return successful user
            return done(null, user);
        });

    }));

};