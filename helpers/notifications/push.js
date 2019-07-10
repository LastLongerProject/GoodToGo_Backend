const fs = require("fs");

const NotificationPreprocess = require("./preprocessor");
const NotificationSender = require("./sender");

const debug = require("../debugger")("notification_push");

const config = require("../../config/config");

module.exports = {
    sns: function (event, appType, user, data) {
        let sender = NotificationSender.sns(NotificationPreprocess.sns(event, user, data));
        for (let key in user.pushNotificationArn) {
            if (key.indexOf(appType) !== -1) {
                sender(user.pushNotificationArn[key]);
            }
        }
    },
    webhook: function (event, user, data) {
        fs.readFile(`${config.staticFileDir}/assets/json/webhook_submission.json`, (err, webhookSubmission) => {
            if (err) return debug.error(err);
            let sender = NotificationSender.webhook(NotificationPreprocess.webhook(event, user, data));
            webhookSubmission = JSON.parse(webhookSubmission);
            webhookSubmission.client.forEach(aClient => {
                if ((typeof aClient.event_listened === "string" && aClient.event_listened === "all") ||
                    (Array.isArray(aClient.event_listened) && aClient.event_listened.indexOf(event) !== -1)) {
                    sender(aClient.url);
                }
            });
        });
    },
    socket: function (event, data) {
        NotificationSender.socket(NotificationPreprocess.socket(event, data))(event);
    }
};