const debug = require("../debugger")("notification_preprocessor");

const SnsEvent = require("./enums/sns/events");
const WebhookEvent = require("./enums/webhook/events");
const SocketEvent = require("./enums/socket/events");
const DataCacheFactory = require("../../models/dataCacheFactory");

function containerFormatter(data) {
    let containerType = DataCacheFactory.get('containerType');
    let formattedContainer = {};
    let amount = 0;
    for (let container of data.containerList) {
        let key = containerType[container.typeCode].name;
        if (!formattedContainer[key]) formattedContainer[key] = [];
        formattedContainer[key].push("#" + container.ID);
        amount++;
    }
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
    webhook: function (event, data) {
        let para;
        try {
            switch (event) {
                case WebhookEvent.USER_USAGE_UPDATE_RENT:
                    para = data.user.phone;
                    break;
                case WebhookEvent.USER_USAGE_UPDATE_RETURN:
                    para = data.user.phone;
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