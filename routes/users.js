var express = require('express');
var router = express.Router();
var validateRequest = require('../models/validateRequest');
var fs = require('fs');

var stores;
fs.readFile("./assets/json/googlePlaceIDs.json", 'utf8', function (err, data) {
    if (err) throw err;
    stores = JSON.parse(data);
});

var type;
fs.readFile("./assets/json/containerType.json", 'utf8', function (err, data) {
    if (err) throw err;
    type = JSON.parse(data);
});

router.post('/signup', function(req, res, next) {
    req.app.get('passport').authenticate('local-signup', { session: false } , function(err, user, info) {
        if (err) {
            return next(err); // will generate a 500 error
        }
        // Generate a JSON response reflecting authentication status
        if (!user) {
            return res.send(info);
        }
        req.login(user, { session: false } , SignUpErr => {
            if (SignUpErr) {
                return next(SignUpErr);
            }
            return res.send(info);
        });      
    })(req, res, next);
});

router.post('/login', function(req, res, next) {
    req.app.get('passport').authenticate('local-login', function(err, user, info) {
        if (err) {
            return next(err); // will generate a 500 error
        }
        // Generate a JSON response reflecting authentication status
        if (!user) {
            return res.send(info);
        }
        req.login(user, { session: false } , loginErr => {
            if (loginErr) {
                return next(loginErr);
            }
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Authorization', info.headers.Authorization);
            res.send(JSON.stringify(info.body));
            return res.end();
        });      
    })(req, res, next);
});

router.get('/data', validateRequest, function(dbUser, req, res, next) {
    var tmp = [];
    var historyData = dbUser.role.customer.history;
    var recordCollection = {
        usingAmount : 0
    };
    for (i = 0; i < historyData.length; i++) {
        var record = {};
        if (historyData[i].returned === false) recordCollection.usingAmount++;
        var str = historyData[i].containerID.toString();
        for (j = 0; j <= 3 - str.length; j++) {
            str = "0" + str;
        }
        record.container = '#' + str;
        record.time = historyData[i].time;
        record.returned = historyData[i].returned;
        record.type = type.type[historyData[i].typeCode];
        record.store = stores.IDlist[(historyData[i].storeID)].name;
        if (typeof historyData[i].returnTime !== 'undefined') record.returnTime = historyData[i].returnTime;
        tmp.push(record);
    }
    recordCollection.data = tmp;
    res.json(recordCollection);
});

router.get('/logout', function(req, res, next) {
    req.app.get('passport').authenticate('local-logout', { session: false } , function(err, user, info) {
        if (err) {
            return next(err); // will generate a 500 error
        }
        // Generate a JSON response reflecting authentication status
        if (!user) {
            return res.send(info);
        }
        req.login(user, { session: false } , LogOutErr => {
            if (LogOutErr) {
                return next(LogOutErr);
            }
            return res.send(info);
        });      
    })(req, next);
});

module.exports = router;