const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('notification_testing');
const fs = require('fs');

const validateRequest = require('../middlewares/validation/validateRequest').JWT;
const regAsAdminManager = require('../middlewares/validation/validateRequest').regAsAdminManager;

const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../helpers/notifications/enums/events');

const rootDir = require("../config/config").rootDir;

const getFakeNotificationContext = function (cb) {
    fs.readFile(rootDir + "/assets/json/fakeNotificationContext.json", (err, fackContext) => {
        if (err) return cb(err);
        return cb(null, JSON.parse(fackContext || "{}"));
    });
};

router.post('/all', regAsAdminManager, validateRequest, function (req, res, next) {
    getFakeNotificationContext((err, fakeNotificationContext) => {
        if (err) return next(err);
        let result = Object.keys(fakeNotificationContext).map(event => {
            if (!NotificationEvent[event]) return `[${event}] Fail with no Matched Event`;
            NotificationCenter.emit(NotificationEvent[event], fakeNotificationContext[event].target, fakeNotificationContext[event].data);
            return `[${event}] Emit!`;
        });
        res.json({
            result
        });
    });
});

router.post('/event/:eventName', regAsAdminManager, validateRequest, function (req, res, next) {
    getFakeNotificationContext((err, fakeNotificationContext) => {
        if (err) return next(err);
        const event = req.params.eventName || "null";
        let result;
        if (!NotificationEvent[event] || !fakeNotificationContext[event]) {
            result = `[${event}] Fail with no Matched Event`;
        } else {
            NotificationCenter.emit(NotificationEvent[event], fakeNotificationContext[event].target, fakeNotificationContext[event].data);
            result = `[${event}] Emit!`;
        }
        res.json({
            result
        });
    });
});


module.exports = router;