const Trade = require('../DB/tradeDB');
const Container = require('../DB/containerDB');

module.exports = {
    global: function (cb) {
        Trade.count({
            "tradeType.action": "Return"
        }, function (err, count) {
            if (err) return cb(err);
            cb(null, count + 14642);
        });
    },
    user: function (dbUser, cb) {
        Container.count({
            "conbineTo": dbUser.user.phone,
            "statusCode": 2
        }, cb);
    }
};