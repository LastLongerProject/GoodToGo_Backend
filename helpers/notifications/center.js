const debug = require("../debugger")("notification_center");

const NotificationEvent = require("./enums/events");
const SnsEvent = require("./enums/sns/events");
const SnsAppType = require("./enums/sns/appType");
const WebhookEvent = require("./enums/webhook/events");
const SocketEvent = require("./enums/socket/events");

const pushBy = require("./push");

module.exports = {
    emit: function (event, target, data, options = {}) {
        switch (event) {
            case NotificationEvent.CONTAINER_DELIVERY:
                if (target.clerk &&
                    target.clerk.roles &&
                    target.clerk.roles.clerk &&
                    typeof target.clerk.roles.clerk.storeID !== "undefined") {
                    pushBy.sns(SnsEvent.CONTAINER_DELIVERY, SnsAppType.SHOP, target.clerk, data, options).push();
                } else {
                    debug.error(`Clerk Struc Invalid. Clerk: ${JSON.stringify(target.clerk)}`);
                }
                break;
            case NotificationEvent.CONTAINER_RENT:
                if (target.customer) {
                    pushBy.sns(SnsEvent.CONTAINER_RENT, SnsAppType.CUSTOMER, target.customer, data, options).push();
                    pushBy.webhook(WebhookEvent.USER_USAGE_UPDATE_RENT, target.customer, options).push();
                }
                pushBy.socket(SocketEvent.GLOBAL_USAGE_UPDATE, data, options).push();
                break;
            case NotificationEvent.CONTAINER_RETURN:
                if (target.customer) {
                    pushBy.sns(SnsEvent.CONTAINER_RETURN, SnsAppType.CUSTOMER, target.customer, data, options).push();
                    pushBy.webhook(WebhookEvent.USER_USAGE_UPDATE_RETURN, target.customer, options).push();
                }
                break;
            case NotificationEvent.CONTAINER_RETURN_LINE:
                if (target.customer) {
                    pushBy.webhook(WebhookEvent.USER_RETURN_CONTAINER_NEWSYSTEM, target.customer, data, options).push();
                }
                break;
            case NotificationEvent.USER_ALMOST_OVERDUE:
                pushBy.webhook(WebhookEvent.USER_ALMOST_OVERDUE, target, data, options).push();
                break;
            case NotificationEvent.USER_BANNED:
                pushBy.webhook(WebhookEvent.USER_BANNED, target, data, options).push();
                break;
            case NotificationEvent.USER_UNBANNED:
                pushBy.webhook(WebhookEvent.USER_UNBANNED, target, data, options).push();
                break;
            case NotificationEvent.USER_PURCHASED:
                pushBy.webhook(WebhookEvent.USER_PURCHASED, target, data, options).push();
                break;
            case NotificationEvent.USER_STATUS_UPDATE:
                pushBy.webhook(WebhookEvent.USER_STATUS_UPDATE, target, data, options).push();
                break;
        }
    }
};