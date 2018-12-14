const NotificationEvent = require("./enums/events");
const SnsEvent = require("./enums/snsEvents");
const SnsAppType = require("./enums/snsAppType");

const pushBy = require("./push");

module.exports = {
    emit: function (event, users, data) {
        switch (event) {
            case NotificationEvent.CONTAINER_DELIVERY:
                if (users.clerk) {
                    pushBy.sns(SnsEvent.CONTAINER_DELIVERY, SnsAppType.SHOP, users.clerk, data);
                }
                break;
            case NotificationEvent.CONTAINER_RENT:
                if (users.customer) {
                    pushBy.sns(SnsEvent.CONTAINER_RENT, SnsAppType.CUSTOMER, users.customer, data);
                    pushBy.webhook("container_usage_update", users.customer);
                }
                break;
            case NotificationEvent.CONTAINER_RETURN:
                if (users.customer) {
                    pushBy.sns(SnsEvent.CONTAINER_RETURN, SnsAppType.CUSTOMER, users.customer, data);
                    pushBy.webhook("container_usage_update", users.customer);
                }
                break;
        }
    }
};