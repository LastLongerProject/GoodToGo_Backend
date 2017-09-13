var express = require('express');
var router = express.Router();
var logging = require('../models/loggingQuery').withoutAuth;
var logRed = require('../models/loggingQuery').redirect;

var passLoggingWithoutAuth = true;

router.all('/users/signup', function(req, res, next) {
    passLoggingWithoutAuth = false;
    next();
});

router.all('/users/login', function(req, res, next) {
    passLoggingWithoutAuth = false;
    next();
});

router.all('/stores/list', function(req, res, next) {
    passLoggingWithoutAuth = false;
    next();
});

router.all('/*', function(req, res, next) {
    if (!passLoggingWithoutAuth) {
        passLoggingWithoutAuth = true;
        logging(req, res, function(err) {
            if (err) return next(err);
            next();
        });
    } else {
        next();
    }
});

module.exports = router;