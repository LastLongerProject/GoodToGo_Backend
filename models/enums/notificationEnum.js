module.exports = {
    AppType: Object.freeze({
        CUSTOMER: "customer",
        SHOP: "shop"
    }),
    CenterEvent: Object.freeze({
        CONTAINER_DELIVERY: "container_delivery",
        CONTAINER_RENT: "container_rent",
        CONTAINER_RETURN: "container_return",
        CONTAINER_RETURN_LINE: "container_return_line",
        USER_LAST_CALL: "user_last_call",
        USER_ALMOST_OVERDUE: "user_almost_overdue",
        USER_BANNED: "user_banned",
        USER_UNBANNED: "user_unbanned",
        USER_STATUS_UPDATE: "user_status_update",
        USER_PURCHASED: "user_purchased"
    }),
    SnsEvent: Object.freeze({
        CONTAINER_DELIVERY: "container_delivery",
        CONTAINER_RENT: "container_rent",
        CONTAINER_RETURN: "container_return"
    }),
    SocketEvent: Object.freeze({
        GLOBAL_USAGE_UPDATE: "global_usage_update"
    }),
    WebhookEvent: Object.freeze({
        USER_USAGE_UPDATE_RENT: "user_usage_update_rent",
        USER_USAGE_UPDATE_RETURN: "user_usage_update_return",
        USER_RETURN_CONTAINER_NEWSYSTEM: "user_return_container_newsystem",
        USER_ALMOST_OVERDUE: "user_almost_overdue",
        USER_LAST_CALL: "user_last_call",
        USER_BANNED: "user_banned",
        USER_UNBANNED: "user_unbanned",
        USER_STATUS_UPDATE: "user_status_update",
        USER_PURCHASED: "user_purchased"
    }),
    PostbackAction: Object.freeze({
        BOX_DELIVERY: "BOX_DELIVERY",
        RELOAD_USAGE: "RELOAD_USAGE"
    })
};