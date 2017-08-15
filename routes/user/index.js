var express = require('express');
var router = express.Router();

    // =====================================
    // SIGNUP ==============================
    // =====================================
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
    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    // app.get('/', function(req, res) {
    //     res.render('index.ejs'); // load the index.ejs file
    // });

    // =====================================
    // LOGIN ===============================
    // =====================================
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
            return res.send(info);
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