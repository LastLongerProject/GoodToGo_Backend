const fs = require("fs");

const NotificationPreprocess = require("./preprocessor");
const NotificationSender = require("./sender");
const webhookThrottle = require("./lib/webhookThrottle")(NotificationSender.webhook);

const PushType = require("../../models/enums/notificationEnum").PushType;
const WebhookEvent = require("../../models/enums/notificationEnum").WebhookEvent;
const Notification = require("../../models/DB/notificationDB");

const debug = require("../debugger")("notification_push");

const config = require("../../config/config");

class Pusher {
    constructor(pushType, preprocessedMsg, options) {
        this.pushType = pushType;
        this.preprocessedMsg = preprocessedMsg;
        this.options = options;
    }

    static inSilentMode() {
        const now = new Date();
        const hour = parseInt(now.toLocaleString('zh-TW', {
            timeZone: 'Asia/Taipei',
            hour: "2-digit",
            hour12: false
        }).slice(0, 2));
        return hour >= 22 || hour < 10;
    }

    push() {
        if (this.preprocessedMsg === null) return null;
        const ignoreSilentMode = this.options.ignoreSilentMode || false;
        if (!ignoreSilentMode && Pusher.inSilentMode()) {
            this.suspend();
        } else {
            this.send();
        }
    }

    suspend() {
        const thisPusher = this;
        const storeNotificationToDB = function () {
            const newNotification = new Notification(thisPusher);
            newNotification.save(err => {
                if (err) return debug.error(err);
            });
        };
        if (this.pushType === PushType.WEBHOOK &&
            (this.preprocessedMsg.event === WebhookEvent.USER_STATUS_UPDATE || this.preprocessedMsg.event === WebhookEvent.USER_ALMOST_OVERDUE ||
                this.preprocessedMsg.event === WebhookEvent.USER_BANNED || this.preprocessedMsg.event === WebhookEvent.USER_UNBANNED)) {
            Notification.deleteMany({
                "pushType": PushType.WEBHOOK,
                "preprocessedMsg.para.lineID": this.preprocessedMsg.para.lineID,
                "preprocessedMsg.event": this.preprocessedMsg.event
            }, err => {
                if (err) return debug.error(err);
                storeNotificationToDB();
            });
        } else {
            storeNotificationToDB();
        }
    }

    send() {
        throw new Error("send() undefined");
    }
}

class SnsPusher extends Pusher {
    constructor(preprocessedMsg, options) {
        super(PushType.SNS, preprocessedMsg, options);
    }

    send() {
        let sender = NotificationSender.sns(this.preprocessedMsg);
        for (let key in this.options.arn) {
            if (key.indexOf(this.options.appType) !== -1) {
                sender(this.options.arn[key]);
            }
        }
    }
}

class WebhookPusher extends Pusher {
    constructor(preprocessedMsg, options) {
        super(PushType.WEBHOOK, preprocessedMsg, options);
    }

    send() {
        fs.readFile(`${config.staticFileDir}/assets/json/webhook_submission.json`, (err, webhookSubmission) => {
            if (err)
                return debug.error(err);
            webhookSubmission = JSON.parse(webhookSubmission);
            webhookSubmission.client.forEach(aClient => {
                if ((typeof aClient.event_listened === "string" && aClient.event_listened === "all") ||
                    (Array.isArray(aClient.event_listened) && aClient.event_listened.indexOf(this.options.event) !== -1)) {
                    webhookThrottle(aClient.url, this.preprocessedMsg);
                }
            });
        });
    }
}

class SocketPusher extends Pusher {
    constructor(preprocessedMsg, options) {
        super(PushType.SOCKET, preprocessedMsg, options);
    }

    send() {
        NotificationSender.socket(this.preprocessedMsg)(this.options.event);
    }
}

function reload(notification) {
    switch (notification.pushType) {
        case PushType.SNS:
            new SnsPusher(notification.preprocessedMsg, notification.options).push();
            break;
        case PushType.WEBHOOK:
            new WebhookPusher(notification.preprocessedMsg, notification.options).push();
            break;
        case PushType.SOCKET:
            new SocketPusher(notification.preprocessedMsg, notification.options).push();
            break;
    }
}

module.exports = {
    sns: function (event, appType, user, data, options) {
        const preprocessedMsg = NotificationPreprocess.sns(event, user, data);
        Object.assign(options, {
            appType,
            arn: user.pushNotificationArn
        });
        return new SnsPusher(preprocessedMsg, options);
    },
    webhook: function (event, user, data, options) {
        const preprocessedMsg = NotificationPreprocess.webhook(event, user, data)
        Object.assign(options, {
            event
        });
        return new WebhookPusher(preprocessedMsg, options);
    },
    socket: function (event, data, options) {
        const preprocessedMsg = NotificationPreprocess.socket(event, data);
        Object.assign(options, {
            event
        });
        return new SocketPusher(preprocessedMsg, options);
    },
    reloadSuspendedNotifications: function (cb) {
        if (!Pusher.inSilentMode()) {
            Notification.find((err, notifications) => {
                if (err) return cb(err);
                notifications.forEach(reload);
                Notification.deleteMany({}, err => {
                    if (err) return cb(err);
                    debug.log("Suspended Notifications Reloaded")
                    cb(null);
                });
            });
        }
    }
};