const request = require("axios");

const debug = require("../debugger")("notification_sender");

const SNS = require('../aws/SNS');
const DataCacheFactory = require("../../models/dataCacheFactory");

module.exports = {
    sns: function (formatted) {
        if (formatted) {
            return function (arn) {
                SNS.sns_publish(arn, formatted.content.title, formatted.content.body, formatted.content.options, (err, stack) => {
                    if (err) debug.error(`${formatted.errMsgPrefix} Err：${err.message}`);
                });
            };
        } else {
            return function (arn) {};
        }
    },
    webhook: function (formatted) {
        if (formatted) {
            return function (url) {
                request
                    .post(url, formatted)
                    .catch(error => {
                        if (error.response) {
                            debug.error(`[Webhook|res] Data: ${error.response.data}`);
                            debug.error(`[Webhook|res] Status: ${error.response.status}`);
                            debug.error(`[Webhook|res] Headers: ${JSON.stringify(error.response.headers)}`);
                        } else if (error.request) {
                            debug.error(`[Webhook|req] Req: ${error.request}`);
                        } else {
                            debug.error(`[Webhook|???] Msg: ${error.message}`);
                        }
                        debug.error(`[Webhook] Config: ${JSON.stringify(error.config)}`);
                    });
            };
        } else {
            return function (url) {};
        }
    },
    socket: function (formatted) {
        const SocketEmitter = DataCacheFactory.get(DataCacheFactory.keys.SOCKET_EMITTER);
        if (formatted && SocketEmitter) {
            return function (event) {
                SocketEmitter.emit(event, formatted);
            };
        } else {
            return function (url) {};
        }
    }
};