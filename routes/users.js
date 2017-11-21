var express = require('express');
var router = express.Router();
var fs = require('fs');

var validateDefault = require('../models/validateDefault');
var validateRequest = require('../models/validateRequest').JWT;
var regAsStoreManager = require('../models/validateRequest').regAsStoreManager;
var wetag = require('../models/toolKit').wetag;
var intReLength = require('../models/toolKit').intReLength;
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

router.post('/signup', validateDefault, function(req, res, next) {
    req._permission = false;
    req.body['active'] = true; // !!! Need to send by client when need purchasing !!!
    req.app.get('passport').authenticate('local-signup', function(err, user, info) {
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

router.post('/signup/clerk', regAsStoreManager, validateRequest, function(req, res, next) {
    var dbUser = req._user;
    if (dbUser.status) return next(dbUser);
    req._permission = true;
    req.body['role'] = {
        typeCode: "clerk",
        manager: false,
        storeID: dbUser.role.storeID
    };
    req.body['active'] = true;
    req.app.get('passport').authenticate('local-signup', function(err, user, info) {
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

router.post('/login', validateDefault, function(req, res, next) {
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

router.post('/modifypassword', function(req, res, next) {
    req._res = res;
    req.app.get('passport').authenticate('local-chanpass', function(err, user, info) {
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
        req.login(user, { session: false }, LogOutErr => {
            if (LogOutErr) {
                return next(LogOutErr);
            }
            return res.json(info);
        });
    })(req, next);
});

router.get('/data', validateRequest, function(req, res, next) {
    var dbUser = req._user;
    var returned = [];
    var inUsed = [];
    var recordCollection = {};
    process.nextTick(function() {
        Trade.find({ "tradeType.action": "Rent", "newUser.phone": dbUser.user.phone }, function(err, rentList) {
            if (err) return next(err);
            rentList.sort(function(a, b) { return b.tradeTime - a.tradeTime });
            recordCollection.usingAmount = rentList.length;
            for (var i = 0; i < rentList.length; i++) {
                var record = {};
                record.container = '#' + intReLength(rentList[i].container.id, 3);
                record.containerCode = rentList[i].container.id;
                record.time = rentList[i].tradeTime;
                record.type = type.containers[rentList[i].container.typeCode].name;
                record.store = stores.IDlist[(rentList[i].oriUser.storeID)].name;
                record.cycle = (typeof rentList[i].container.cycleCtr === 'undefined') ? 0 : rentList[i].container.cycleCtr;
                record.returned = false;
                inUsed.push(record);
            }
            Trade.find({ "tradeType.action": "Return", "oriUser.phone": dbUser.user.phone }, function(err, returnList) {
                if (err) return next(err);
                returnList.sort(function(a, b) { return b.tradeTime - a.tradeTime });
                recordCollection.usingAmount -= returnList.length;
                for (var i = 0; i < returnList.length; i++) {
                    for (var j = inUsed.length - 1; j >= 0; j--) {
                        if ((inUsed[j].containerCode === returnList[i].container.id) && (inUsed[j].cycle === returnList[i].container.cycleCtr)) {
                            inUsed[j].returned = true;
                            inUsed[j].returnTime = returnList[i].tradeTime;
                            inUsed[j].cycle = undefined;
                            returned.push(inUsed[j]);
                            inUsed.splice(j, 1);
                            break;
                        }
                    }
                }
                recordCollection.data = inUsed;
                for (var i = 0; i < returned.length; i++) {
                    recordCollection.data.push(returned[i]);
                }
                Trade.count({ "tradeType.action": "Rent" }, function(err, count) {
                    if (err) return next(err);
                    recordCollection.globalAmount = count;
                    res.set('etag', wetag(JSON.stringify({
                        usingAmount: recordCollection.usingAmount,
                        data: recordCollection.data,
                        globalAmount: recordCollection.globalAmount
                    })));
                    res.json(recordCollection);
                });
            });
        });
    });
});

module.exports = router;