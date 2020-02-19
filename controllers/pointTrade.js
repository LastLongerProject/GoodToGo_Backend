const fs = require("fs");
const debug = require('../helpers/debugger')('bonusPointActivity');

const config = require("../config/config");

const PointLog = require('../models/DB/pointLogDB');
const DueStatus = require('../models/enums/userEnum').DueStatus;
const getDueStatus = require('../models/computed/dueStatus').dueStatus;

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
    const activityType = null;
    fs.readFile(`${config.staticFileDir}/assets/json/bonusPointActivity.json`, (err, data) => {
        let activityDict = null;
        let activityDetail = null;
        if (!err && activityType !== null && typeof data === "string") {
            activityDict = JSON.parse(data);
            if (activityDict.hasOwnProperty(activityType) && bonusPointActivityLogic[activityType]) {
                activityDetail = activityDict[activityType];
            }
        }
        let overdueReturn = 0;
        const now = Date.now();
        const totalPoint = userOrders.map(aUserOrder => {
            let basePoint;
            const dueStatus = getDueStatus(aUserOrder.orderTime, dbUser.getPurchaseStatus(), now);
            if (dueStatus === DueStatus.OVERDUE || dueStatus === DueStatus.LAST_CALL) {
                overdueReturn++;
                basePoint = 0;
            } else {
                basePoint = 1;
            }
            let fixedPoint = basePoint;
            if (activityDetail !== null) {
                const storeIDOfRent = aUserOrder.storeID;
                const rentTime = aUserOrder.orderTime;
                const activityDetailOfStore = activityDetail.store[storeIDOfRent];
                if (activityDetailOfStore &&
                    activityDetailOfStore.startTime < rentTime &&
                    ((rentTime - activityDetailOfStore.startTime) < activityDetailOfStore.duration)) {
                    fixedPoint = bonusPointActivityLogic[activityType](basePoint);
                }
            }
            return fixedPoint;
        }).reduce((a, b) => a + b, 0);
        return cb(null, {
            point: totalPoint,
            bonusPointActivity: activityDetail !== null ? {
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