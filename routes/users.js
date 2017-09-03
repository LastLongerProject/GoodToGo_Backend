var express = require('express');
var router = express.Router();
var validateRequest = require('../models/validateRequest');
var fs = require('fs');
var signup = require('../routes/signup');

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

router.use('/signup', signup);

router.post('/login', function(req, res, next) {
    req.app.get('passport').authenticate('local-login', function (err, user, info) {
		if (err) {
			return next(err); // will generate a 500 error
		}
		// Generate a JSON response reflecting authentication status
		if (!user) {
			return res.status(401).json(info);
		}
		req.login(user, { session: false } , Err => {
			if (Err) return next(Err);
			res.header('Authorization', info.headers.Authorization);
			res.json(info.body);
			return;
		});
	})(req, next);
});

router.get('/logout', function(req, res, next) {
    req._res = res;
    req.app.get('passport').authenticate('local-logout', function(err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(500).json(info);
        }
        req.login(user, { session: false } , LogOutErr => {
            if (LogOutErr) {
                return next(LogOutErr);
            }
            return res.json(info);
        });      
    })(req, next);
});

router.post('/modifypassword', function(req, res, next) {
    req._res = res;
    req.app.get('passport').authenticate('local-chanpass', function (err, user, info) {
        if (err) {
            return next(err); // will generate a 500 error
        }
        // Generate a JSON response reflecting authentication status
        if (!user) {
            return res.status(403).json(info);
        }
        req.login(user, { session: false } , Err => {
            if (Err) return next(Err);
            res.header('Authorization', info.headers.Authorization);
            res.json(info.body);
            return;
        });
    })(req, next);
});

router.get('/data', validateRequest, function(dbUser, req, res, next) {
    if (typeof dbUser.status)
        next(dbUser);
    var tmp = [];
    var historyData = dbUser.role.customer.history;
    var recordCollection = {
        container : [
            { name : type.type[0],
            version : 0,
            icon : [
                {"1x" : "https://app.goodtogo.tw/images/icon/00_1x.png"},
                {"2x" : "https://app.goodtogo.tw/images/icon/00_2x.png"},
                {"3x" : "https://app.goodtogo.tw/images/icon/00_3x.png"}
            ]},
            { name : type.type[1],
            version : 0,
            icon : [
                {"1x" : "https://app.goodtogo.tw/images/icon/01_1x.png"},
                {"2x" : "https://app.goodtogo.tw/images/icon/01_2x.png"},
                {"3x" : "https://app.goodtogo.tw/images/icon/01_3x.png"}
            ]}
        ],
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

module.exports = router;