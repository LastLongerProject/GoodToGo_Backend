var jwt = require('jwt-simple');
var User = require('../models/DB/userDB'); // load up the user model
var logging = require('../models/loggingQuery').withAuth;
var loggingERR = require('../models/loggingQuery').logERR;

function iatGetDate(int) {
    var tmp = new Date();
    tmp = tmp.setDate(tmp.getDate() + int);
    return tmp;
}

module.exports = function(req, res, next) {
    var jwtToken = req.headers['authorization'];
    var key = req.headers['apikey'];

    if (jwtToken && key) {
        process.nextTick(function() {
            User.findOne({ 'user.apiKey': key }, function(err, dbUser) {
                if (err)
                    return next(err);
                if (typeof dbUser === 'undefined' || dbUser === null)
                    return res.status(401).json({ type: 'validatingUser', message: 'Invalid User' });
                if (!dbUser.active)
                    return res.status(401).json({ type: 'validatingUser', message: 'User has Banned' });
                var decoded;
                try {
                    decoded = jwt.decode(jwtToken, dbUser.user.secretKey);
                } catch (err) {}
                logging(req, res, decoded, function(err) {
                    if (typeof err !== 'undefined') { err.status = 500; return next(err); } else if (typeof decoded.exp === 'undefined') {
                        return res.status(401).json({ type: 'validatingUser', message: 'Token Invalid' });
                    } else if (decoded.exp <= Date.now() || decoded.iat >= iatGetDate(1) || decoded.iat <= iatGetDate(-1)) {
                        return res.status(400).json({ type: 'validatingUser', message: 'Token Expired' });
                    }
                    res._payload = decoded;
                    if (dbUser) {
                        if ((req.url.indexOf('/logout') >= 0 || req.url.indexOf('/data') >= 0 || req.url.indexOf('/rent') >= 0 || req.url.indexOf('/return') >= 0 || req.url.indexOf('/modifypassword') >= 0) ||
                            ((req.url.indexOf('/get') >= 0 || req.url.indexOf('/status') >= 0 || req.url.indexOf('/getUser') >= 0 || req.url.indexOf('/history') >= 0 || req.url.indexOf('/favorite') >= 0) && dbUser.role.typeCode === 'clerk') ||
                            ((req.url.indexOf('/clerk') >= 0) && dbUser.role.typeCode === 'clerk' && dbUser.role.clerk.manager === true)) {
                            next(dbUser); // To move to next middleware
                        } else {
                            res.status(403).json({ type: 'validatingUser', message: 'Not Authorized' });
                            return;
                        }
                    }
                });
            });
        });
    } else {
        loggingERR(jwtToken, key, req, res, function(err) {
            if (typeof err !== 'undefined') { err.status = 500; return next(err); }
            return res.status(500).json({ type: 'validatingUser', message: 'Unexpect Error: logic err' });
        });
    }
};