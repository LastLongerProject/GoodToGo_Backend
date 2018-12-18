const debug = require("../debugger")("notification_preprocessor");

const SnsEvent = require("./enums/sns/events");
const WebhookEvent = require("./enums/webhook/events");
const SocketEvent = require("./enums/socket/events");

module.exports = {
    sns: function (event, user, data) {
        try {
            switch (event) {
                case SnsEvent.CONTAINER_DELIVERY:
                    return {
                        content: {
                            title: "新容器送到囉！",
                            body: `點我簽收 #${data.boxID}`,
                            options: {
                                action: "BOX_DELIVERY"
                            }
                        },
                        errMsgPrefix: `[配送]通知推播失敗：[${user.user.phone}]`
                    };
                case SnsEvent.CONTAINER_RENT:
                    return {
                        content: {
                            title: "借用了容器！",
                            body: data.join("、"),
                            options: {
                                action: "RELOAD_USAGE"
                            }
                        },
                        errMsgPrefix: `[借出]通知推播失敗：[${user}]`
                    };
                case SnsEvent.CONTAINER_RETURN:
                    return {
                        content: {
                            title: "歸還了容器！",
                            body: data.join("、"),
                            options: {
                                action: "RELOAD_USAGE"
                            }
                        },
                        errMsgPrefix: `[歸還]通知推播失敗：[${user}]`
                    };
            }
        } catch (error) {
            debug.error(error);
            return null;
        }
    },
    webhook: function (event, data) {
        let para;
        try {
            switch (event) {
                case WebhookEvent.USER_USAGE_UPDATE:
                    para = data._id;
                    break;
            }
            return {
                event,
                para
            };
        } catch (error) {
            debug.error(error);
            return null;
        }
    },
    socket: function (event, data) {
        try {
            switch (event) {
                case SocketEvent.GLOBAL_USAGE_UPDATE:
                    return data.containerList.length;
            }
        } catch (error) {
            debug.error(error);
            return null;
        }
    }
};