var fs = require('fs');
var AWS = require('aws-sdk');
var configData = require('../config/config.js');
var debug = require('debug')('goodtogo_backend:sms');

AWS.config = {
    accessKeyId: configData.AWS.Access_Key_ID,
    secretAccessKey: configData.AWS.Secret_Access_Key,
    region: configData.AWS.region,
    apiVersions: { sns: '2010-03-31' }
};
var sns = new AWS.SNS();

module.exports = {
    sns_now: function(user, msg, callback) {
        var publishParams = {
            Message: msg,
            PhoneNumber: user
        };
        var subscribeParams = {
            Protocol: 'sms',
            TopicArn: configData.AWS.TopicArn.SMS,
            Endpoint: user
        };
        sns.publish(publishParams, function(err, data) {
            if (err) callback(err, err.stack);
            else callback(null, data);
        });
        sns.subscribe(subscribeParams, function(err, data) {
            if (err) debug(err, err.stack);
        });
    },
    sns_publish: function(msg, callback) {
        var publishParams = {
            Message: msg,
            TopicArn: configData.AWS.TopicArn.SMS,
            MessageAttributes: { 'AWS.SNS.SMS.SMSType': { 'StringValue': 'Promotional', 'DataType': 'String' } }
        };
        sns.publish(publishParams, function(err, data) {
            if (err) callback(err, err.stack);
            else callback(null, data);
        });
    },
    sms_subscribe: function(system, type, token, callback) {
        var TargetARN = config.TargetARN;
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
        sns.createPlatformEndpoint({ 'PlatformApplicationArn': TargetARN, 'Token': token }, function(err, EndPointResult) {
            if (err) callback(err, err.stack);
            else {
                var client_arn = EndPointResult["EndpointArn"];
                callback(null, client_arn);
            }
        });
    }
};