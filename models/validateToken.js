var jwt = require('jwt-simple');
var keys = require('../config/keys');

module.exports = function(req, res, jwtToken, next) {
    var decoded;
    try {
        decoded = jwt.decode(jwtToken, keys.serverSecretKey());
    } catch (err) {}
    if (!decoded) {
        return res.status(401).json({ code: 'C001', type: 'validatingToken', message: 'Token Invalid' });
    } else if (!decoded.iat || !decoded.exp) {
        return res.status(401).json({ code: 'C002', type: 'validatingToken', message: 'Token Payload Invalid' });
    } else if (decoded.exp <= Date.now()) {
        return res.status(401).json({ code: 'C003', type: 'validatingToken', message: 'Token Expired' });
    }
    next();
};