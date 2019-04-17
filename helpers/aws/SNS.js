var AWS = require('aws-sdk');
var configData = require('../../config/config.js');
var debug = require('../debugger')('sns');

AWS.config = {
    accessKeyId: configData.AWS.Access_Key_ID,
    secretAccessKey: configData.AWS.Secret_Access_Key,
    region: configData.AWS.region,
    apiVersions: {
        sns: '2010-03-31'
    }
};
var sns = new AWS.SNS();

module.exports = {
    sms_now: function (user, msg, callback) {
        var publishParams = {
            Message: msg,
            PhoneNumber: user
        };
        var subscribeParams = {
            Protocol: 'sms',
            TopicArn: configData.AWS.TopicArn.SMS,
            Endpoint: user
        };
        sns.publish(publishParams, function (err, data) {
            if (err) callback(err, err.stack);
            else callback(null, data);
        });
        sns.subscribe(subscribeParams, function (err, data) {
            if (err) debug.error(err, err.stack);
        });
    },
    sms_publish: function (msg, callback) {
        var publishParams = {
            Message: msg,
            TopicArn: configData.AWS.TopicArn.SMS,
            MessageAttributes: {
                'AWS.SNS.SMS.SMSType': {
                    'StringValue': 'Promotional',
                    'DataType': 'String'
                }
            }
        };
        sns.publish(publishParams, function (err, data) {
            if (err) callback(err, err.stack);
            else callback(null, data);
        });
    },
    sns_subscribe: function (system, type, token, callback) {
        var TargetARN = configData.AWS.TargetARN;
        var TopicArn = configData.AWS.TopicArn.SNS + type;
        var payload;
        switch (system) {
            case 'ios':
                TargetARN += '/APNS';
                break;
            case 'android':
                TargetARN += '/GCM';
                break;
        }
        TargetARN += '/GoodToGo-';
        switch (type) {
            case 'shop':
                TargetARN += 'Shop';
                break;
            case 'customer':
                TargetARN += 'Customer';
                break;
        }
        payload = {
            'PlatformApplicationArn': TargetARN,
            'Token': token
        };
        sns.createPlatformEndpoint(payload, function (err, EndPointResult) {
            if (err) {
                err.type = "createPlatformEndpoint";
                err.payload = payload;
                return callback(err, err.stack);
            }
            var client_arn = EndPointResult["EndpointArn"];
            payload = {
                Protocol: 'application',
                TopicArn: TopicArn,
                Endpoint: client_arn
            };
            sns.subscribe(payload, function (err, data) {
                if (err) {
                    err.type = "createPlatformEndpoint";
                    err.payload = payload;
                    return callback(err, err.stack);
                }
                callback(null, client_arn);
            });
        });
    },
    sns_publish: function (TargetArn, title, body, option, callback) {
        var subPayload = {
            'default': title + ' : ' + body,
            'APNS': {
                'aps': {
                    'alert': {
                        'title': title,
                        'body': body
                    },
                    'sound': 'default'
                },
                'action': option && option.action || null
            }
        };
        for (var keys in subPayload) {
            if (typeof subPayload[keys] === 'object')
                subPayload[keys] = JSON.stringify(subPayload[keys]);
        }
        var payload = {
            'Message': JSON.stringify(subPayload),
            'MessageStructure': 'json',
            'TargetArn': TargetArn
        };
        sns.publish(payload, function (err, data) {
            if (err) {
                err.type = "publishSNS";
                err.payload = payload;
                return callback(err, err.stack);
            }
            callback(null, data, payload);
        });
    }
};

// module.exports.sns_publish('arn:aws:sns:ap-northeast-1:948190058961:endpoint/APNS/GoodToGo-Shop/b9962ddb-8853-387d-9cea-c5803003d5cd', '安安', "你好阿~", {
//     action: "BOX_DELIVERY"
// }, (a, b, c) => {
//     console.log(a, b, c)
// })