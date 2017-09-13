var jwt = require('jwt-simple');
var logging = require('../models/loggingQuery').imageLog;
var loggingERR = require('../models/loggingQuery').logERR;
var keys = require('../config/keys');

module.exports = function(req, res, jwtToken, next) {
    if (jwtToken) {
        var decoded;
        try {
            decoded = jwt.decode(jwtToken, keys.serverSecretKey());
        } catch (err) {}
        logging(req, res, decoded, function(err) {
            if (typeof err !== 'undefined') {
                err.status = 500;
                return next(err);
            } else if (typeof decoded.exp === 'undefined') {
                return res.status(401).json({ type: 'validatingToken', message: 'Token Invalid' });
            } else if (decoded.exp <= Date.now()) {
                return res.status(400).json({ type: 'validatingToken', message: 'Token Expired' });
            }
            next({});
        });
    } else {
        loggingERR(jwtToken, null, req, res, function(err) {
            if (typeof err !== 'undefined') { err.status = 500; return next(err); }
            return res.status(500).json({ type: 'validatingToken', message: 'Unexpect Error: logic err' });
        });
    }
};