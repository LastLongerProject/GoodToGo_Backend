const fs = require("fs");
const debug = require('../helpers/debugger')('bonusPointActivity');
const computeDaysOfUsing = require("../helpers/tools").computeDaysOfUsing;

const config = require("../config/config");

const PointLog = require('../models/DB/pointLogDB');
const DueDays = require('../models/enums/userEnum').DueDays;

module.exports = {
    calculatePoint: function (dbUser, userOrders, cb) {
        if (!dbUser.hasPurchase) return cb(null, null);
        scanBonusPointActivity(dbUser, userOrders, cb);
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
        const totalPoint = userOrders.map(aUserOrder => {
            const storeIDOfRent = aUserOrder.storeID;
            const rentTime = aUserOrder.orderTime;
            const activityDetailOfStore = activityDetail.store[storeIDOfRent];
            const daysOverDue = computeDaysOfUsing(aUserOrder.orderTime, now) - DueDays[dbUser.getPurchaseStatus()];
            if (daysOverDue > 0) return 0;
            if (!activityDetailOfStore ||
                activityDetailOfStore.startTime > rentTime ||
                ((rentTime - activityDetailOfStore.startTime) > activityDetailOfStore.duration))
                return 1;
            return bonusPointActivityLogic[activityType](1);
        }).reduce((a, b) => a + b, 0);
        return cb(null, {
            point: totalPoint,
            bonusPointActivity: totalPoint > returnAmount ? {
                name: activityDetail.name,
                txt: activityDetail.txtForPointLog
            } : null
        });
    });
}

const bonusPointActivityLogic = Object.freeze({
    DOUBLE_POINT: function (quantity) {
        return quantity * 2;
    }
});