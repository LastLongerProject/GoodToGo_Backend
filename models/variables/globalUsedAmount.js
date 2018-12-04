const Trade = require('../DB/tradeDB');

module.exports = function (cb) {
    Trade.count({
        "tradeType.action": "Return"
    }, function (err, count) {
        if (err) return cb(err);
        cb(null, count + 14642);
    });
};