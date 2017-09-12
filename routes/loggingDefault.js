var express = require('express');
var router = express.Router();
var logging = require('../models/loggingQuery').withoutAuth;
var logRed = require('../models/loggingQuery').redirect;

var passLogging = false;

router.all('/images/:id', function(req, res, next){
	passLogging = true;
	logRed(req, res, function(err){
		if (err) return next(err);
		next();
	});
});

router.all('/containers/:id', function(req, res, next){
	passLogging = true;
	logRed(req, res, function(err){
		if (err) return next(err);
		next();
	});
});

router.all('/getStores', function(req, res, next){
	passLogging = true;
	loggRed(req, res, function(err){
		if (err) return next(err);
		next();
	});
})

router.all('/*', function(req, res, next) {
	if ((typeof req.headers['authorization'] === 'undefined') && !passLogging){
		passLogging = false;
		logging(req, res, function(err){
			if (err) return next(err);
			next();
		});
	} else {
		passLogging = false;
		next();
	}
});

module.exports = router;