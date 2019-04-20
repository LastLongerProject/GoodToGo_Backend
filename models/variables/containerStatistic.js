const Trade = require('../DB/tradeDB');
const Container = require('../DB/containerDB');
const UserOrder = require('../DB/userOrderDB');

module.exports = {
    global_used: function (cb) {
        Trade.count({
            "tradeType.action": "Return"
        }, function (err, count) {
            if (err) return cb(err);
            cb(null, count + 14642);
        });
    },
    user_using: function (dbUser, extraCondition, cb) {
        const condition = Object.assign({
            "conbineTo": dbUser.user.phone,
            "statusCode": 2
        }, extraCondition);
        Container.count(condition, cb);
    },
    all_stores_booked: function (cb) {
        UserOrder.aggregate([{
            '$match': {
                'containerID': null
            }
        }, {
            '$group': {
                '_id': '$storeID',
                'amount': {
                    '$sum': 1
                }
            }
        }, {
            '$sort': {
                '_id': 1
            }
        }], cb);
    }
};