var express = require('express');
var router = express.Router();
var validateRequest = require('../models/validateRequest');
var fs = require('fs');
var signup = require('../routes/signup');
var keys = require('../config/keys');
var jwt = require('jwt-simple');

var stores;
fs.readFile("./assets/json/googlePlaceIDs.json", 'utf8', function(err, data) {
    if (err) throw err;
    stores = JSON.parse(data);
});

var type;
fs.readFile("./assets/json/containerType.json", 'utf8', function(err, data) {
    if (err) throw err;
    type = JSON.parse(data);
});

router.use('/signup', signup);

router.post('/login', function(req, res, next) {
    req.app.get('passport').authenticate('local-login', function(err, user, info) {
        if (err) {
            return next(err); // will generate a 500 error
        }
        // Generate a JSON response reflecting authentication status
        if (!user) {
            return res.status(401).json(info);
        }
        req.login(user, { session: false }, Err => {
            if (Err) return next(Err);
            res.header('Authorization', info.headers.Authorization);
            res.json(info.body);
            return;
        });
    })(req, next);
});

router.post('/logout', function(req, res, next) {
    req._res = res;
    req.app.get('passport').authenticate('local-logout', function(err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(500).json(info);
        }
        req.login(user, { session: false }, LogOutErr => {
            if (LogOutErr) {
                return next(LogOutErr);
            }
            return res.json(info);
        });
    })(req, next);
});

router.post('/modifypassword', function(req, res, next) {
    req._res = res;
    req.app.get('passport').authenticate('local-chanpass', function(err, user, info) {
        if (err) {
            return next(err); // will generate a 500 error
        }
        // Generate a JSON response reflecting authentication status
        if (!user) {
            return res.status(403).json(info);
        }
        req.login(user, { session: false }, Err => {
            if (Err) return next(Err);
            res.header('Authorization', info.headers.Authorization);
            res.json(info.body);
            return;
        });
    })(req, next);
});

router.get('/data', validateRequest, function(dbUser, req, res, next) {
    if (dbUser.status)
        return next(dbUser);
    var returned = [];
    var inUsed = [];
    var historyData = dbUser.role.customer.history;
    var recordCollection = {
        containers: type.containers,
        usingAmount: 0
    };
    var date = new Date();
    var payload = { 'iat': Date.now(), 'exp': date.setMinutes(date.getMinutes() + 5) };
    var token = jwt.encode(payload, keys.serverSecretKey());
    recordCollection.containers.forEach(function(data) {
        for (var key in data.icon) {
            data.icon[key] = data.icon[key] + "/" + token;
        }
    });
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
        record.type = type.containers[historyData[i].typeCode].name;
        record.store = stores.IDlist[(historyData[i].storeID)].name;
        if (typeof historyData[i].returnTime !== 'undefined') record.returnTime = historyData[i].returnTime;
        if (historyData[i].returned === true) returned.unshift(record);
        else inUsed.unshift(record);
    }
    recordCollection.data = inUsed;
    returned.forEach(function(data) {
        recordCollection.data.push(data);
    });
    res.json(recordCollection);
});

module.exports = router;