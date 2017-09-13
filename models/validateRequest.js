var jwt = require('jwt-simple');
var validateUser = require('../config/keys').validateUser;
var logging = require('../models/loggingQuery').withAuth;
var loggingERR = require('../models/loggingQuery').logERR;

function validateURL(req, res, next, dbUser) { // Authorize the user to see if s/he can access our resources
    if (dbUser) {
        if (((req.url.indexOf('/logout') >= 0 || req.url.indexOf('/data') >= 0) && dbUser.role.typeCode === 'customer') ||
            ((req.url.indexOf('/status') >= 0 || req.url.indexOf('/getUser') >= 0) && dbUser.role.typeCode === 'clerk') ||
            ((req.url.indexOf('/clerk') >= 0) && dbUser.role.typeCode === 'clerk' && dbUser.role.clerk.manager === true) ||
            ((req.url.indexOf('/rent') >= 0 || req.url.indexOf('/return') >= 0 || req.url.indexOf('/modifypassword') >= 0) && dbUser.role.typeCode === 'clerk' || dbUser.role.typeCode === 'customer')) {
            next(dbUser); // To move to next middleware
        } else {
            res.status(403).json({ type: 'validatingUser', message: 'Not Authorized' });
            return;
        }
    }
}

function iatGetDate(int) {
    var tmp = new Date();
    tmp = tmp.setDate(tmp.getDate() + int);
    return tmp;
}

module.exports = function(req, res, next, targetKey = null) {
    var jwtToken = req.headers['authorization'];
    var key = targetKey || req.headers['apikey'];

    if (jwtToken && key) {
        validateUser(key, next, function(dbUser) { // The key would be the logged in user's username
            if (typeof dbUser === 'undefined' || dbUser === null) {
                // No user with this name exists, respond back with a 401
                res.status(401).json({ type: 'validatingUser', message: 'Invalid User' });
                return;
            }
            if (targetKey === null) {
                var decoded;
                try {
                    decoded = jwt.decode(jwtToken, dbUser.user.secretKey);
                } catch (err) {}
                logging(req, res, decoded, function(err) {
                    if (typeof err !== 'undefined') { err.status = 500; return next(err); } else if (typeof decoded.exp === 'undefined') {
                        return res.status(401).json({ type: 'validatingUser', message: 'Token Invalid' });
                    } else if (decoded.exp <= Date.now() || decoded.iat >= iatGetDate(7) || decoded.iat <= iatGetDate(-7)) {
                        return res.status(400).json({ type: 'validatingUser', message: 'Token Expired' });
                    }
                    validateURL(req, res, next, dbUser);
                });
            } else {
                validateURL(req, res, next, dbUser);
            }
        });
    } else {
        loggingERR(jwtToken, key, req, res, function(err) {
            if (typeof err !== 'undefined') { err.status = 500; return next(err); }
            return res.status(500).json({ type: 'validatingUser', message: 'Unexpect Error: logic err' });
        });
    }
};