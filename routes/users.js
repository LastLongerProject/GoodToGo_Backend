var express = require('express');
var router = express.Router();
var jwt = require('jwt-simple');
var fs = require('fs');
var validateRequest = require('../models/validateRequest');
var signup = require('../routes/signup');
var keys = require('../config/keys');
var Trade = require('../models/DB/tradeDB');

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
            return next(err);
        }
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
            return next(err);
        }
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
    var tmpArr = [];
    var date = new Date();
    var payload = { 'iat': Date.now(), 'exp': date.setMinutes(date.getMinutes() + 5) };
    var token = jwt.encode(payload, keys.serverSecretKey());
    for (var i = 0; i < type.containers.length; i++) {
        var tmpIcon = {};
        for (var key in type.containers[i].icon) {
            tmpIcon[key] = type.containers[i].icon[key] + "/" + token;
        }
        tmpArr.push({
            typeCode: type.containers[i].typeCode,
            name: type.containers[i].name,
            version: type.containers[i].version,
            icon: tmpIcon
        });
    }
    var recordCollection = {
        containers: tmpArr
    };
    delete tmpArr;
    process.nextTick(function() {
        Trade.find({ "tradeType.action": "Rent", "newUser.phone": dbUser.user.phone }, function(err, rentList) {
            rentList.sort(function(a, b) { return b.tradeTime - a.tradeTime });
            recordCollection.usingAmount = rentList.length;
            for (var i = 0; i < rentList.length; i++) {
                var record = {};
                var str = rentList[i].container.id.toString();
                for (j = 0; j <= 3 - str.length; j++) {
                    str = "0" + str;
                }
                record.container = '#' + str;
                record.containerCode = rentList[i].container.id;
                record.time = rentList[i].tradeTime;
                record.type = type.containers[rentList[i].container.typeCode].name;
                record.store = stores.IDlist[(rentList[i].oriUser.storeID)].name;
                record.returned = false;
                inUsed.push(record);
            }
            Trade.find({ "tradeType.action": "Return", "oriUser.phone": dbUser.user.phone }, function(err, returnList) {
                returnList.sort(function(a, b) { return b.tradeTime - a.tradeTime });
                recordCollection.usingAmount -= returnList.length;
                for (var i = 0; i < returnList.length; i++) {
                    var j = inUsed.length - 1;
                    while (inUsed[j].containerCode !== returnList[i].container.id) { j--; }
                    inUsed[j].returned = true;
                    inUsed[j].returnTime = returnList[i].tradeTime;
                    returned.push(inUsed[j]);
                    inUsed.splice(j, 1);
                }
                recordCollection.data = inUsed;
                for (var i = 0; i < returned.length; i++) {
                    recordCollection.data.push(returned[i]);
                }
                Trade.count({ "tradeType.action": "Rent" }, function(err, count) {
                    recordCollection.globalAmount = count;
                    res.json(recordCollection);
                });
            });
        });
    });
});

module.exports = router;