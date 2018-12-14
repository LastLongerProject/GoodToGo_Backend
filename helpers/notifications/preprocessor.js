const debug = require("debug")("goodtogo_backend:notification_preprocessor");

const SnsEvent = require("./enums/snsEvents");

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
                            body: data.containerList.map(aContainerObj => `#${aContainerObj.id}`).join("、"),
                            options: {
                                action: "RELOAD_USAGE"
                            }
                        },
                        errMsgPrefix: `[借出]通知推播失敗：[${user.user.phone}]`
                    };
                case SnsEvent.CONTAINER_RETURN:
                    return {
                        content: {
                            title: "歸還了容器！",
                            body: data.containerList.map(aContainerObj => `#${aContainerObj.id}`).join("、"),
                            options: {
                                action: "RELOAD_USAGE"
                            }
                        },
                        errMsgPrefix: `[歸還]通知推播失敗：[${user.user.phone}]`
                    };
            }
        } catch (error) {
            debug(error);
            return null;
        }
    },
    webhook: function (params) {

    }
};