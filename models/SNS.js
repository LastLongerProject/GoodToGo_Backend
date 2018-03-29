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
    sms_now: function(user, msg, callback) {
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
    sms_publish: function(msg, callback) {
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
    sns_subscribe: function(system, type, userData, token, callback) {
        var TargetARN = config.TargetARN;
        var TopicArn = config.TopicArn.SNS + type;
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
        sns.createPlatformEndpoint({
            'PlatformApplicationArn': TargetARN,
            'Token': token,
            'CustomUserData': userData
        }, function(err, EndPointResult) {
            if (err) return callback(err, err.stack);
            var client_arn = EndPointResult["EndpointArn"];
            sns.subscribe({
                Protocol: 'application',
                TopicArn: TopicArn,
                Endpoint: client_arn
            }, function(err, data) {
                if (err) return callback(err, err.stack);
                callback(null, client_arn);
            });
        });
    }
};