const fs = require("fs");
const debug = require('../helpers/debugger')('bonusPointActivity');

const config = require("../config/config");

const PointLog = require('../models/DB/pointLogDB');
const computeDaysOverDue = require('../models/computed/dueStatus').daysOverDue;

module.exports = {
    calculatePoint: function (dbUser, userOrders, cb) {
        scanBonusPointActivity(dbUser, userOrders, cb);
    },
    sendPoint: function (point, toUser, logContext) {
        let newPointLog = new PointLog({
            user: toUser._id,
            title: logContext.title,
            body: logContext.body,
            quantityChange: point
        });
        toUser.point += point;
        toUser.save((err) => {
            if (err) return debug.error(err);
            newPointLog.save((err) => {
                if (err) return debug.error(err);
            });
        });
    }
};

function scanBonusPointActivity(dbUser, userOrders, cb) {
    const returnAmount = userOrders.length;
    const noBonusReply = {
        point: returnAmount,
        bonusPointActivity: null
    };
    fs.readFile(`${config.staticFileDir}/assets/json/bonusPointActivity.json`, (err, data) => {
        if (err) return cb(err, noBonusReply);
        const activityDict = JSON.parse(data);
        const activityType = "DOUBLE_POINT";
        const activityDetail = activityDict[activityType];
        if (!bonusPointActivityLogic[activityType] || !activityDetail)
            return cb(null, noBonusReply);
        const now = Date.now();
        let overdueReturn = 0;
        const totalPoint = userOrders.map(aUserOrder => {
            const daysOverDue = computeDaysOverDue(aUserOrder.orderTime, dbUser.getPurchaseStatus(), now);
            if (daysOverDue > 0) {
                overdueReturn++;
                return 0;
            }
            return 1;
            /*
            const storeIDOfRent = aUserOrder.storeID;
            const rentTime = aUserOrder.orderTime;
            const activityDetailOfStore = activityDetail.store[storeIDOfRent];
            if (!activityDetailOfStore ||
                activityDetailOfStore.startTime > rentTime ||
                ((rentTime - activityDetailOfStore.startTime) > activityDetailOfStore.duration))
                return 1;
            return bonusPointActivityLogic[activityType](1);
            */
        }).reduce((a, b) => a + b, 0);
        return cb(null, {
            point: totalPoint,
            bonusPointActivity: totalPoint > returnAmount ? {
                name: activityDetail.name,
                txt: activityDetail.txtForPointLog
            } : null,
            overdueReturn
        });
    });
}

const bonusPointActivityLogic = Object.freeze({
    DOUBLE_POINT: function (quantity) {
        return quantity * 2;
    }
});