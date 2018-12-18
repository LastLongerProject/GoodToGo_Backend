const debug = require("../debugger")("notification_center");

const NotificationEvent = require("./enums/events");
const SnsEvent = require("./enums/sns/events");
const SnsAppType = require("./enums/sns/appType");
const WebhookEvent = require("./enums/webhook/events");
const SocketEvent = require("./enums/socket/events");

const pushBy = require("./push");

module.exports = {
    emit: function (event, target, data) {
        switch (event) {
            case NotificationEvent.CONTAINER_DELIVERY:
                if (typeof target.storeID !== "undefined") {
                    User.find({
                        'roles.clerk.storeID': target.storeID
                    }, (err, userList) => {
                        if (err) return debug.error(err);
                        userList.forEach(aClerk => pushBy.sns(SnsEvent.CONTAINER_DELIVERY, SnsAppType.SHOP, aClerk, data));
                    });
                }
                break;
            case NotificationEvent.CONTAINER_RENT:
                if (target.customer) {
                    pushBy.sns(SnsEvent.CONTAINER_RENT, SnsAppType.CUSTOMER, target.customer, data);
                    pushBy.webhook(WebhookEvent.USER_USAGE_UPDATE, target.customer);
                }
                pushBy.socket(SocketEvent.GLOBAL_USAGE_UPDATE, data);
                break;
            case NotificationEvent.CONTAINER_RETURN:
                if (target.customer) {
                    pushBy.sns(SnsEvent.CONTAINER_RETURN, SnsAppType.CUSTOMER, target.customer, data);
                    pushBy.webhook(WebhookEvent.USER_USAGE_UPDATE, target.customer);
                }
                break;
        }
    }
};