var express = require('express');
var router = express.Router();

var userQuery = require('../models/userQuery');
var validateDefault = require('../models/validation/validateDefault');
var validateRequest = require('../models/validation/validateRequest').JWT;
var regAsStoreManager = require('../models/validation/validateRequest').regAsStoreManager;
var wetag = require('../models/toolKit').wetag;
var intReLength = require('../models/toolKit').intReLength;
var keys = require('../config/keys');
var Trade = require('../models/DB/tradeDB');

router.post('/signup', validateDefault, function(req, res, next) {
    req._permission = false;
    req.body['active'] = true; // !!! Need to send by client when need purchasing !!!
    userQuery.signup(req, function(err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else {
            res.header('Authorization', info.headers.Authorization);
            res.json(info.body);
        }
    });
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
    userQuery.signup(req, function(err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else {
            if (info.headers)
                res.header('Authorization', info.headers.Authorization);
            res.json(info.body);
        }
    });
});

router.post('/login', validateDefault, function(req, res, next) {
    userQuery.login(req, function(err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else {
            res.header('Authorization', info.headers.Authorization);
            res.json(info.body);
        }
    });
});

router.post('/modifypassword', validateRequest, function(req, res, next) {
    if (req._user.status) return next(req._user);
    userQuery.chanpass(req, function(err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else {
            res.header('Authorization', info.headers.Authorization);
            res.json(info.body);
        }
    });
});

router.post('/logout', validateRequest, function(req, res, next) {
    if (req._user.status) return next(req._user);
    userQuery.logout(req, function(err, user, info) {
        if (err) {
            return next(err);
        } else {
            res.json(info);
        }
    });
});

router.get('/data', validateRequest, function(req, res, next) {
    var dbUser = req._user;
    var returned = [];
    var inUsed = [];
    var recordCollection = {};
    process.nextTick(function() {
        Trade.find({ "tradeType.action": "Rent", "newUser.phone": dbUser.user.phone }, function(err, rentList) {
            if (err) return next(err);
            rentList.sort(function(a, b) { return b.tradeTime - a.tradeTime; });
            recordCollection.usingAmount = rentList.length;
            for (var i = 0; i < rentList.length; i++) {
                var record = {};
                record.container = '#' + intReLength(rentList[i].container.id, 3);
                record.containerCode = rentList[i].container.id;
                record.time = rentList[i].tradeTime;
                record.type = req.app.get('containerType')[rentList[i].container.typeCode].name;
                record.store = req.app.get('store')[(rentList[i].oriUser.storeID)].name;
                record.cycle = (typeof rentList[i].container.cycleCtr === 'undefined') ? 0 : rentList[i].container.cycleCtr;
                record.returned = false;
                inUsed.push(record);
            }
            Trade.find({ "tradeType.action": "Return", "oriUser.phone": dbUser.user.phone }, function(err, returnList) {
                if (err) return next(err);
                returnList.sort(function(a, b) { return b.tradeTime - a.tradeTime; });
                recordCollection.usingAmount -= returnList.length;
                for (var i = 0; i < returnList.length; i++) {
                    for (var j = inUsed.length - 1; j >= 0; j--) {
                        var returnCycle = (typeof returnList[i].container.cycleCtr === 'undefined') ? 0 : returnList[i].container.cycleCtr;
                        if ((inUsed[j].containerCode === returnList[i].container.id) && (inUsed[j].cycle === returnCycle)) {
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