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
            TopicArn: configData.AWS.TopicArn,
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
            TopicArn: configData.AWS.TopicArn,
            MessageAttributes: { 'AWS.SNS.SMS.SMSType': { 'StringValue': 'Promotional', 'DataType': 'String' } }
        };
        sns.publish(publishParams, function(err, data) {
            if (err) callback(err, err.stack);
            else callback(null, data);
        });
    },
    ios_subscribe: function(msg, callback) {
        var publishParams = {
            Message: msg,
            TopicArn: configData.AWS.TopicArn,
            MessageAttributes: { 'AWS.SNS.SMS.SMSType': { 'StringValue': 'Promotional', 'DataType': 'String' } }
        };
        sns.publish(publishParams, function(err, data) {
            if (err) callback(err, err.stack);
            else callback(null, data);
        });
        sns.createPlatformEndpoint(params, function(err, EndPointResult) {
            if (err) callback(err, err.stack);
            else {
                var client_arn = EndPointResult["EndpointArn"];
                callback(null, data);
            }
        });
    }
};