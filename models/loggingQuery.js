var Logging = require('../models/DB/loggingDB');

function getDate(int) {
	var tmp = new Date();
	tmp = tmp.setDate(tmp.getDate() + int);
	return tmp;
}

module.exports = {
	withoutAuth : function(req, res, next) {
		process.nextTick(function() {
			var hashID = req.headers['reqid'];
			var reqTime = req.headers['reqtime'];
			if (typeof hashID === 'undefined' || typeof reqTime === 'undefined'){
				newLogging = new Logging({
					'ip' : req.connection.remoteAddress,
					'url' : req.url,
					'method' : req.method,
					'hashID' : null,
					'reqTime' : Date.now(),
					'req.headers' : req.headers,
					'req.body' : req.body
				});
				newLogging.save(function(err) {
					if (err) return next(err);
					return res.status(401).json({type: 'loggingRequest', message: 'Token Invalid'});
				});
			} else if (reqTime <= getDate(-3) || reqTime >= getDate(3)){
				newLogging = new Logging({
					'ip' : req.connection.remoteAddress,
					'url' : req.url,
					'method' : req.method,
					'hashID' : hashID + "-expired",
					'reqTime' : reqTime,
					'req.headers' : req.headers,
					'req.body' : req.body
				});
				newLogging.save(function(err) {
					if (err) return next(err);
					return res.status(400).json({type: 'loggingRequest', message: 'Token Expired'});
				});
			} else {
				Logging.findOne({'hashID': hashID, 'reqTime' : reqTime }, function(err, logging) {
					if (err) return next(err);
					if (logging) {
						newLogging = new Logging({
							'ip' : req.connection.remoteAddress,
							'url' : req.url,
							'method' : req.method,
							'hashID' : hashID + "-replay",
							'reqTime' : reqTime,
							'req.headers' : req.headers,
							'req.body' : req.body
						});
						newLogging.save(function(err) {
							if (err) return next(err);
							return res.status(401).json({type: 'loggingRequest', message: 'Token replay'});
						});
					}
					newLogging = new Logging({
						'ip' : req.connection.remoteAddress,
						'url' : req.url,
						'method' : req.method,
						'hashID' : hashID,
						'reqTime' : reqTime,
						'req.headers' : req.headers,
						'req.body' : req.body
					});
					newLogging.save(function(err) {
						if (err) return next(err);
						return next();
					});
				});
			}
		});
	},
	withAuth : function(req, res, payload, next) {
		process.nextTick(function() {
			var hashID = payload.jti;
			var reqTime = payload.iat;
			if (typeof hashID === 'undefined' || typeof reqTime === 'undefined'){
				newLogging = new Logging({
					'ip' : req.connection.remoteAddress,
					'url' : req.url,
					'method' : req.method,
					'hashID' : null,
					'reqTime' : Date.now(),
					'req.headers' : req.headers,
					'req.body' : req.body
				});
				newLogging.save(function(err) {
					if (err) return next(err);
					return res.status(401).json({type: 'loggingRequest', message: 'Token Invalid'});
				});
			}
			Logging.findOne({'hashID': payload.jti, 'reqTime' : payload.iat }, function(err, logging) {
				if (err) return next(err);
				if (logging) {
					newLogging = new Logging({
						'ip' : req.connection.remoteAddress,
						'url' : req.url,
						'method' : req.method,
						'hashID' : payload.jti + "-replay",
						'reqTime' : payload.iat,
						'req.headers' : req.headers,
						'req.body' : req.body
					});
					newLogging.save(function(err) {
						if (err) return next(err);
						return res.status(401).json({type: 'loggingRequest', message: 'Token replay'});
					});
				} else {
					newLogging = new Logging({
						'ip' : req.connection.remoteAddress,
						'url' : req.url,
						'method' : req.method,
						'hashID' : payload.jti,
						'reqTime' : payload.iat,
						'req.headers' : req.headers,
						'req.body' : req.body,
						'req.payload' : payload
					});
					newLogging.save(function(err) {
						if (err) return next(err);
						return next();
					});
				}
			});
		});
	},
	withToken : function(req, next){}
};
