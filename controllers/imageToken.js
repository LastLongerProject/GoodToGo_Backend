const jwt = require('jwt-simple');

const keys = require('../config/keys');

module.exports = {
    generateToken: function (done) {
        keys.serverSecretKey((err, key) => {
            if (err) return done(err);
            const date = new Date();
            const payload = {
                'iat': Date.now(),
                'exp': date.setMinutes(date.getMinutes() + 5)
            };
            const token = jwt.encode(payload, key);
            done(null, token);
        });
    }
}