const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('notification_testing');
const fs = require('fs');

const validateRequest = require('../middlewares/validation/authorization/validateRequest').JWT;
const checkRoleIsAdmin = require('../middlewares/validation/authorization/validateRequest').checkRoleIsAdmin;

const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../models/enums/notificationEnum').CenterEvent;

const rootDir = require("../config/config").staticFileDir;

const getFakeNotificationContext = function (cb) {
    fs.readFile(rootDir + "/assets/json/fakeNotificationContext.json", (err, fackContext) => {
        if (err) return cb(err);
        return cb(null, JSON.parse(fackContext || "{}"));
    });
};

router.post('/all', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
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

router.post('/event/:eventName', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
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


module.exports = router;