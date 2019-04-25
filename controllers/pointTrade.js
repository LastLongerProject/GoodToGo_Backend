const fs = require("fs");
const debug = require('../helpers/debugger')('bonusPointActivity');

const config = require("../config/config");

const PointLog = require('../models/DB/pointLogDB');

module.exports = {
    getAndSendPoint: function (dbUser, quantity, cb) {
        if (!dbUser.hasPurchase) return cb(null, null);
        scanBonusPointActivity(quantity, point => cb(null, point));
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

function scanBonusPointActivity(quantity, cb) {
    fs.readFile(`${config.staticFileDir}/assets/json/bonusPointActivity.json`, (err, data) => {
        if (err) return cb(err, quantity, null);
        const activityDict = JSON.parse(data);
    });
}

const bonusPointActivityLogic = Object.freeze({
    DOUBLE_POINT: function (quantity) {
        return quantity * 2;
    }
});