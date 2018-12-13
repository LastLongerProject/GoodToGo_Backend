const debug = require("debug")("goodtogo_backend:notification");

const SNS = require('./aws/SNS');

const notificationHandler = {
    sns: function (content, errMsgPrefix) {
        return function (arn) {
            SNS.sns_publish(arn, content.title, content.body, content.options, (err, data, payload) => {
                if (err) debug(`${errMsgPrefix} Err：${JSON.stringify(err)} Stack：${JSON.stringify(data)}`);
            });
        };
    },
    webhook: function (event) {

    }
};

const pushBy = {
    sns: function (user, appType, content, errMsgPrefix) {
        let sendSns = notificationHandler.sns(content, errMsgPrefix);
        if (user.pushNotificationArn[`${appType}-ios`]) sendSns(user.pushNotificationArn[`${appType}-ios`]);
        // if (user.pushNotificationArn[`${appType}-android`]) sendSns(user.pushNotificationArn[`${appType}-android`]);
    },
    webhook: function (event, para) {

    }
};

const notifications = {
    container_delivery: function (users, data) {
        if (users.clerk) {
            try {
                pushBy.sns(users.clerk, "shop", {
                    title: "新容器送到囉！",
                    body: `點我簽收 #${data.boxID}`,
                    options: {
                        action: "BOX_DELIVERY"
                    }
                }, `[配送]通知推播失敗：[${users.clerk.user.phone}]`);
            } catch (error) {
                debug(error);
            }
        }
    },
    container_rent: function (users, data) {
        if (users.customer) {
            try {
                pushBy.sns(users.customer, "customer", {
                    title: "借用了容器！",
                    body: data.containerList.map(aContainerObj => `#${aContainerObj.id}`).join("、"),
                    options: {
                        action: "RELOAD_USAGE"
                    }
                }, `[借出]通知推播失敗：[${users.customer.user.phone}]`);
                pushBy.webhook("container_rent", users.customer);
            } catch (error) {
                debug(error);
            }
        }
    },
    container_return: function (users, data) {
        if (users.customer) {
            try {
                pushBy.sns(users.customer, "customer", {
                    title: "歸還了容器！",
                    body: data.containerList.map(aContainerObj => `#${aContainerObj.id}`).join("、"),
                    options: {
                        action: "RELOAD_USAGE"
                    }
                }, `[歸還]通知推播失敗：[${users.customer.user.phone}]`);
                pushBy.webhook("container_return", users.customer);
            } catch (error) {
                debug(error);
            }
        }
    }
};

module.exports = {
    emit: function (event, users, data) {
        if (notifications[event]) notifications[event](users, data);
    }
};