const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('notification_testing');
const fs = require('fs');

const validateRequest = require('../middlewares/validation/validateRequest').JWT;
const regAsAdminManager = require('../middlewares/validation/validateRequest').regAsAdminManager;

const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../helpers/notifications/enums/events');

const rootDir = require("../config/config").rootDir;

const fakeNotificationContext = JSON.parse(
    fs.readFileSync(rootDir + "/assets/json/fakeNotificationContext.json") || "{}"
);

router.post('/all', regAsAdminManager, validateRequest, function (req, res) {
    let result = Object.keys(fakeNotificationContext).map(event => {
        if (!NotificationEvent[event]) return `[${event}] Fail with no Matched Event`;
        NotificationCenter.emit(NotificationEvent[event], fakeNotificationContext[event].target, fakeNotificationContext[event].data);
        return `[${event}] Emit!`;
    });
    res.json({
        result
    });
});

router.post('/event/:eventName', regAsAdminManager, validateRequest, function (req, res) {
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


module.exports = router;