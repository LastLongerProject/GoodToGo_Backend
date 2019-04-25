const debug = require("../debugger")("notification_preprocessor");

const SnsEvent = require("./enums/sns/events");
const WebhookEvent = require("./enums/webhook/events");
const SocketEvent = require("./enums/socket/events");
const DataCacheFactory = require("../../models/dataCacheFactory");

function containerFormatter(data) {
    let containerType = DataCacheFactory.get('containerType');
    let formattedContainer = {};
    let amount = 0;
    data.containerList.forEach(container => {
        try {
            let key = containerType[container.typeCode].name;
            if (!formattedContainer[key]) formattedContainer[key] = [];
            formattedContainer[key].push("#" + container.ID);
            amount++;
        } catch (error) {
            debug.error(`ERR: ${error}`);
            return;
        }
    });
    let IDlist = Object.keys(formattedContainer).map(key => {
        return `${key}（${formattedContainer[key].join("、")}）`;
    });
    return {
        amount,
        IDlist
    };
}

module.exports = {
    sns: function (event, user, data) {
        let formattedData;
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
                    }
                case SnsEvent.CONTAINER_RENT:
                    formattedData = containerFormatter(data);
                    return {
                        content: {
                            title: `借用了${formattedData.amount}個容器！`,
                            body: formattedData.IDlist.join('、'),
                            options: {
                                action: "RELOAD_USAGE"
                            }
                        },
                        errMsgPrefix: `[借出]通知推播失敗：[${user.user.phone}]`
                    };

                case SnsEvent.CONTAINER_RETURN:
                    formattedData = containerFormatter(data);
                    return {
                        content: {
                            title: `歸還了${formattedData.amount}個容器！`,
                            body: formattedData.IDlist.join("、"),
                            options: {
                                action: "RELOAD_USAGE"
                            }
                        },
                        errMsgPrefix: `[歸還]通知推播失敗：[${user.user.phone}]`
                    };
            }
        } catch (error) {
            debug.error(error);
            return null;
        }
    },
    webhook: function (event, target, data) {
        let para;
        try {
            switch (event) {
                case WebhookEvent.USER_USAGE_UPDATE_RENT:
                case WebhookEvent.USER_USAGE_UPDATE_RETURN:
                    para = target.user.phone;
                    break;
                case WebhookEvent.USER_RETURN_CONTAINER_FREE_USER:
                case WebhookEvent.USER_RETURN_CONTAINER_PURCHASED_USER:
                    para = {
                        lineID: target.user.line_channel_userID,
                        amount: data.amount,
                        point: data.point
                    };
                    break;
                case WebhookEvent.USER_ALMOST_OVERDUE:
                case WebhookEvent.USER_BANNED:
                case WebhookEvent.USER_UNBANNED:
                    para = {
                        lineID: target.user.line_channel_userID,
                        bannedTimes: data.bannedTimes
                    };
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