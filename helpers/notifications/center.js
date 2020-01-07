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
                pushBy.sns(SnsEvent.CONTAINER_DELIVERY, SnsAppType.SHOP, target, data);
                break;
            case NotificationEvent.CONTAINER_RENT:
                pushBy.sns(SnsEvent.CONTAINER_RENT, SnsAppType.CUSTOMER, target, data);
                pushBy.webhook(WebhookEvent.USER_USAGE_UPDATE_RENT, target);
                pushBy.socket(SocketEvent.GLOBAL_USAGE_UPDATE, data);
                break;
            case NotificationEvent.CONTAINER_RETURN:
                pushBy.sns(SnsEvent.CONTAINER_RETURN, SnsAppType.CUSTOMER, target, data);
                pushBy.webhook(WebhookEvent.USER_USAGE_UPDATE_RETURN, target);
                break;
            case NotificationEvent.CONTAINER_RETURN_LINE:
                pushBy.webhook(WebhookEvent.USER_RETURN_CONTAINER_NEWSYSTEM, target, data);
                break;
            case NotificationEvent.USER_ALMOST_OVERDUE:
                pushBy.webhook(WebhookEvent.USER_ALMOST_OVERDUE, target, data);
                break;
            case NotificationEvent.USER_BANNED:
                pushBy.webhook(WebhookEvent.USER_BANNED, target, data);
                break;
            case NotificationEvent.USER_UNBANNED:
                pushBy.webhook(WebhookEvent.USER_UNBANNED, target, data);
                break;
            case NotificationEvent.USER_PURCHASED:
                pushBy.webhook(WebhookEvent.USER_PURCHASED, target, data);
                break;
            case NotificationEvent.USER_STATUS_UPDATE:
                pushBy.webhook(WebhookEvent.USER_STATUS_UPDATE, target, data);
                break;
        }
    }
};