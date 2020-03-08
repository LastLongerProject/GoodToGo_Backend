const Trade = require('../DB/tradeDB');
const UserOrder = require('../DB/userOrderDB');

const ContainerAction = require("../enums/containerEnum").Action;

module.exports = {
    global_used: function (cb) {
        Trade.count({
            "tradeType.action": ContainerAction.RETURN
        }, function (err, count) {
            if (err) return cb(err);
            cb(null, count + 14642);
        });
    },
    line_user_using: function (dbUser, cb) {
        UserOrder.count({
            "user": dbUser._id,
            "archived": false
        }, cb);
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