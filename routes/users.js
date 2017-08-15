var express = require('express');
var router = express.Router();

router.post('/signup', function(req, res, next) {
    req.app.get('passport').authenticate('local-signup', { session: false } , function(err, user, info) {
        if (err) {
            return next(err); // will generate a 500 error
        }
        // Generate a JSON response reflecting authentication status
        if (!user) {
            return res.send(info);
        }
        req.login(user, { session: false } , SignUpErr => {
            if (SignUpErr) {
                return next(SignUpErr);
            }
            return res.send(info);
        });      
    })(req, res, next);
});
router.post('/login', function(req, res, next) {
    req.app.get('passport').authenticate('local-login', function(err, user, info) {
        if (err) {
            return next(err); // will generate a 500 error
        }
        // Generate a JSON response reflecting authentication status
        if (!user) {
            return res.send(info);
        }
        req.login(user, { session: false } , loginErr => {
            if (loginErr) {
                return next(loginErr);
            }
            return res.setHeader('Authorization', info.headers.Authorization).send(info.body);
        });      
    })(req, res, next);
});
    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    // app.get('/', function(req, res) {
    //     res.render('index.ejs'); // load the index.ejs file
    // });

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

module.exports = router;