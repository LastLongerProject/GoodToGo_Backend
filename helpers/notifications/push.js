const NotificationPreprocess = require("./preprocessor");
const NotificationSender = require("./sender");

module.exports = {
    sns: function (event, appType, user, data) {
        let sender = NotificationSender.sns(NotificationPreprocess.sns(event, user, data));
        for (let key in user.pushNotificationArn) {
            if (key.indexOf(appType) !== -1) {
                sender(user.pushNotificationArn[key]);
            }
        }
    },
    webhook: function (event, para) {

    }
};