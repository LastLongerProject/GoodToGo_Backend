const fs = require("fs");
const debug = require('../helpers/debugger')('bonusPointActivity');

const config = require("../config/config");

const PointLog = require('../models/DB/pointLogDB');

module.exports = {
    getAndSendPoint: function (dbUser, userOrders, cb) {
        if (!dbUser.hasPurchase) return cb(null, null, null);
        scanBonusPointActivity(userOrders, cb);
    },
    sendPoint: function (point, toUser, logContext) {
        let newPointLog = new PointLog({
            user: toUser._id,
            title: logContext.title,
            body: logContext.body,
            quantityChange: point
        });
        newPointLog.save((err) => {
            if (err) debug.error(err);
        });
        toUser.point += point;
        toUser.save((err) => {
            if (err) debug.error(err);
        });
    }
};

function scanBonusPointActivity(userOrders, cb) {
    fs.readFile(`${config.staticFileDir}/assets/json/bonusPointActivity.json`, (err, data) => {
        const returnAmount = userOrders.length;
        if (err) return cb(err, returnAmount, null);
        const activityDict = JSON.parse(data);
        const activityType = "DOUBLE_POINT";
        const activityDetail = activityDict[activityType];
        if (!bonusPointActivityLogic[activityType] || !activityDetail)
            return cb(null, returnAmount, null);
        const totalPoint = userOrders.map(aUserOrder => {
            const storeIDOfRent = aUserOrder.storeID;
            const rentTime = aUserOrder.orderTime;
            const activityDetailOfStore = activityDetail.store[storeIDOfRent];
            if (!activityDetailOfStore ||
                activityDetailOfStore.startTime > rentTime ||
                ((rentTime - activityDetailOfStore.startTime) > activityDetailOfStore.duration))
                return 1;
            return bonusPointActivityLogic[activityType](1);
        }).reduce((a, b) => a + b, 0);
        return cb(null, totalPoint, totalPoint === returnAmount ? null : `${activityDetail.name}`);
    });
}

const bonusPointActivityLogic = Object.freeze({
    DOUBLE_POINT: function (quantity) {
        return quantity * 2;
    }
});