const debug = require("../debugger")("notification_center");

const SnsEvent = require("../../models/enums/notificationEnum").SnsEvent;
const SnsAppType = require("../../models/enums/notificationEnum").AppType;
const SocketEvent = require("../../models/enums/notificationEnum").SocketEvent;
const WebhookEvent = require("../../models/enums/notificationEnum").WebhookEvent;
const NotificationEvent = require("../../models/enums/notificationEnum").CenterEvent;

const pushBy = require("./push");

module.exports = {
    emit: function (event, target, data = {}, options = {}) {
        switch (event) {
            case NotificationEvent.CONTAINER_DELIVERY:
                pushBy.sns(SnsEvent.CONTAINER_DELIVERY, SnsAppType.SHOP, target, data, options).push();
                break;
            case NotificationEvent.CONTAINER_RENT:
                pushBy.sns(SnsEvent.CONTAINER_RENT, SnsAppType.CUSTOMER, target, data, options).push();
                pushBy.webhook(WebhookEvent.USER_USAGE_UPDATE_RENT, target, data, options).push();
                pushBy.socket(SocketEvent.GLOBAL_USAGE_UPDATE, data, options).push();
                break;
            case NotificationEvent.CONTAINER_RETURN:
                pushBy.sns(SnsEvent.CONTAINER_RETURN, SnsAppType.CUSTOMER, target, data, options).push();
                pushBy.webhook(WebhookEvent.USER_USAGE_UPDATE_RETURN, target, data, options).push();
                break;
            case NotificationEvent.CONTAINER_RETURN_LINE:
                pushBy.webhook(WebhookEvent.USER_RETURN_CONTAINER_NEWSYSTEM, target, data, options).push();
                break;
            case NotificationEvent.USER_LAST_CALL:
                pushBy.webhook(WebhookEvent.USER_LAST_CALL, target, data, options).push();
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