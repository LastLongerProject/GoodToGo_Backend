const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('notification_testing');
const fs = require('fs');

const validateRequest = require('../middlewares/validation/authorization/validateRequest').JWT;
const checkRoleIsAdmin = require('../middlewares/validation/authorization/validateRequest').checkRoleIsAdmin;

const tradeCallback = require('../controllers/tradeCallback');

const tasks = require('../helpers/tasks');
const NotificationCenter = require('../helpers/notifications/center');

const Trade = require('../models/DB/tradeDB');
const User = require('../models/DB/userDB.js');
const Container = require('../models/DB/containerDB');
const NotificationEvent = require('../models/enums/notificationEnum').CenterEvent;

const rootDir = require("../config/config").staticFileDir;

const getFakeNotificationContext = function (cb) {
    fs.readFile(rootDir + "/assets/json/fakeNotificationContext.json", (err, fackContext) => {
        if (err) return cb(err);
        return cb(null, JSON.parse(fackContext || "{}"));
    });
};

router.post('/notificationTest/all', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    getFakeNotificationContext((err, fakeNotificationContext) => {
        if (err) return next(err);
        const ignoreSilentMode = req.query.ignoreSilentMode || false;
        let result = Object.keys(fakeNotificationContext).map(event => {
            if (!NotificationEvent[event]) return `[${event}] Fail with no Matched Event`;
            NotificationCenter.emit(NotificationEvent[event], fakeNotificationContext[event].target, fakeNotificationContext[event].data, {
                ignoreSilentMode
            });
            return `[${event}] Emit!`;
        });
        res.json({
            result
        });
    });
});

router.post('/notificationTest/event/:eventName', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    getFakeNotificationContext((err, fakeNotificationContext) => {
        if (err) return next(err);
        const event = req.params.eventName || "null";
        const ignoreSilentMode = req.query.ignoreSilentMode || false;
        let result;
        if (!NotificationEvent[event] || !fakeNotificationContext[event]) {
            result = `[${event}] Fail with no Matched Event`;
        } else {
            NotificationCenter.emit(NotificationEvent[event], fakeNotificationContext[event].target, fakeNotificationContext[event].data, {
                ignoreSilentMode
            });
            result = `[${event}] Emit!`;
        }
        res.json({
            result
        });
    });
});

router.post('/reloadSuspendedNotifications', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    tasks.reloadSuspendedNotifications((err, results) => {
        if (err) return next(err);
        res.json({
            success: true,
            results
        });
    });
});

router.post('/tradeCallback/return/all', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    tasks.solveUnusualUserOrder((err, results) => {
        if (err) return next(err);
        res.json({
            success: true,
            msg: "Try To Fix Following User Order",
            results
        });
    });
});

router.post('/tradeCallback/return/:container/:userPhone', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    const containerID = req.params.container;
    const userPhone = req.params.userPhone;
    Trade.findOne({
        "container.id": containerID,
        "oriUser.phone": userPhone,
        "tradeType.action": "Return"
    }, {}, {
        sort: {
            tradeTime: -1
        }
    }, function (err, theTrade) {
        if (err) return next(err);
        if (!theTrade)
            return res.status(403).json({
                success: false,
                msg: "Can't find that trade"
            });
        User.findOne({
            "user.phone": theTrade.oriUser.phone
        }, (err, oriUser) => {
            if (err) return next(err);
            if (!oriUser)
                return res.status(403).json({
                    success: false,
                    msg: "Can't find oriUser"
                });
            User.findOne({
                "user.phone": theTrade.newUser.phone
            }, (err, newUser) => {
                if (err) return next(err);
                if (!newUser)
                    return res.status(403).json({
                        success: false,
                        msg: "Can't find newUser"
                    });
                Container.findOne({
                    "ID": theTrade.container.id
                }, (err, theContainer) => {
                    if (err) return next(err);
                    if (!theContainer)
                        return res.status(403).json({
                            success: false,
                            msg: "Can't find theContainer"
                        });
                    const tradeDetail = {
                        oriUser,
                        newUser,
                        container: theContainer
                    };
                    tradeCallback.return([tradeDetail], {
                        storeID: theTrade.newUser.storeID
                    });
                    res.json({
                        success: true,
                        msg: "Doing task"
                    });
                });
            });
        });
    });
});

module.exports = router;