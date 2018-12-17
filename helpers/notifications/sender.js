const debug = require("../debugger")("notification_sender");

const SNS = require('../aws/SNS');

module.exports = {
    sns: function (formatted) {
        if (formatted) {
            return function (arn) {
                SNS.sns_publish(arn, formatted.content.title, formatted.content.body, formatted.content.options, (err, stack) => {
                    if (err) debug.error(`${formatted.errMsgPrefix} Err：${JSON.stringify(err)} Stack：${JSON.stringify(stack)}`);
                });
            };
        } else {
            return function (arn) {};
        }
    }
};