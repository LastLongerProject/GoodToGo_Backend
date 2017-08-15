var express = require('express');
var router = express.Router();

// module.exports = function(passport) {

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    // app.get('/', function(req, res) {
    //     res.render('index.ejs'); // load the index.ejs file
    // });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    router.get('/login', function(req, res) {

        // render the page and pass in any flash data if it exists
        // res.render('login.ejs', { message: req.flash('loginMessage') }); 
    });

    // process the login form
    // app.post('/login', do all our passport stuff here);

    // process the login form
    router.post('/login', function(req, res, next) {
        req.app.get('passport').authenticate('local-login', function(err, user, info) {
            if (err) {
                return next(err); // will generate a 500 error
            }
            // Generate a JSON response reflecting authentication status
            if (! user) {
                return res.send(info);
            }
            // ***********************************************************************
            // "Note that when using a custom callback, it becomes the application's
            // responsibility to establish a session (by calling req.login()) and send
            // a response."
            // Source: http://passportjs.org/docs
            // ***********************************************************************
            req.login(user, { session: false } , loginErr => {
                if (loginErr) {
                    return next(loginErr);
                }
                return res.json({ type : 'success', message : 'authentication succeeded' });
            });      
        })(req, res, next);
    });

    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    // router.get('/signup', function(req, res) {

        // render the page and pass in any flash data if it exists
        // res.render('signup.ejs', { message: req.flash('signupMessage') });

    // });

    // process the signup form
    // app.post('/signup', do all our passport stuff here);
    router.post('/signup', function(req, res, next) {
        req.app.get('passport').authenticate('local-signup', { session: false } , function(err, user, info) {
            if (err) {
                return next(err); // will generate a 500 error
            }
            // Generate a JSON response reflecting authentication status
            if (! user) {
                return res.send(info);
            }
            // ***********************************************************************
            // "Note that when using a custom callback, it becomes the application's
            // responsibility to establish a session (by calling req.login()) and send
            // a response."
            // Source: http://passportjs.org/docs
            // ***********************************************************************
            req.login(user, { session: false } , SignUpErr => {
                if (SignUpErr) {
                    return next(SignUpErr);
                }
                return res.json({ type : 'success', message : 'authentication succeeded' });
            });      
        })(req, res, next);
    });

    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    router.get('/profile', isLoggedIn, function(req, res) {
        // res.render('profile.ejs', {
        //     user : req.user // get the user out of session and pass to template
        // });
    });

    // =====================================
    // LOGOUT ==============================
    // =====================================
    router.get('/logout', function(req, res) {
        // req.logout();
    // res.redirect('/');
    });
// };
// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    // res.redirect('/');
}

module.exports = router;