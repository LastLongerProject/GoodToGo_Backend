var express = require('express');
var router = express.Router();
var logging = require('../models/loggingQuery').withoutAuth;
var logRed = require('../models/loggingQuery').redirect;

var passLoggingWithoutAuth = true;
/*
router.all('/images/*', function(req, res, next) {
    passLoggingWithoutAuth = true;
    next();
});*/
/*
router.all('/containers/:id', function(req, res, next) {
    passLoggingWithoutAuth = true;
    logRed(req, res, function(err) {
        if (err) return next(err);
        next();
    });
});*/

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
        // passLoggingWithoutAuth = false;
        next();
    }
});

module.exports = router;