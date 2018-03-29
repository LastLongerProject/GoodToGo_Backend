var express = require('express');
var router = express.Router();

var userQuery = require('../models/userQuery');
var validateDefault = require('../models/validation/validateDefault');
var validateRequest = require('../models/validation/validateRequest').JWT;
var regAsAdminManager = require('../models/validation/validateRequest').regAsAdminManager;
var regAsStoreManager = require('../models/validation/validateRequest').regAsStoreManager;
var wetag = require('../models/toolKit').wetag;
var intReLength = require('../models/toolKit').intReLength;
var subscribeSNS = require('../models/SNS').sns_subscribe;
var Trade = require('../models/DB/tradeDB');

router.post('/signup', validateDefault, function(req, res, next) {
    req.body['active'] = true; // !!! Need to send by client when need purchasing !!!
    userQuery.signup(req, function(err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else if (info.needCode) {
            return res.status(205).json(info.body);
        } else {
            res.header('Authorization', info.headers.Authorization);
            res.json(info.body);
        }
    });
});

router.post('/signup/clerk', regAsStoreManager, validateRequest, function(req, res, next) {
    var dbUser = req._user;
    if (dbUser.status) return next(dbUser);
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

router.post('/signup/root', regAsAdminManager, validateRequest, function(req, res, next) {
    req.body['active'] = true;
    req._passCode = true;
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

router.post('/forgotpassword', validateDefault, function(req, res, next) {
    userQuery.forgotpass(req, function(err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else if (info.needCode) {
            return res.status(205).json(info.body);
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

router.post('/subscribeSNS', validateRequest, function(req, res, next) {
    if (req._user.status) return next(req._user);
    var deviceToken = req.body.deviceToken.replace(/\s/g, "").replace("<", "").replace(">", "");
    var type = req.body.appType;
    var system = req.body.system;
    if (typeof deviceToken === undefined || typeof type === undefined || typeof system === undefined) {
        return req.status(401).json({ code: 'D009', type: 'subscribeMessage', message: 'Content not Complete' });
    } else if (!(type === "shop" || type === "customer") || !(system === "ios" || system === "android")) {
        return req.status(401).json({ code: 'D010', type: 'subscribeMessage', message: 'Content invalid' });
    }
    if (deviceToken === "HEYBITCH") {
        res.json({ type: 'subscribeMessage', message: 'Subscribe succeeded' })
    } else {
        var dbUser = req._user;
        subscribeSNS(system, type, dbUser.user.phone, deviceToken, function(err, arn) {
            if (err) return next(err);
            if (!dbUser.pushNotificationArn)
                dbUser.pushNotificationArn = {}
            dbUser.pushNotificationArn[type + "-" + system] = arn;
            dbUser.save((err) => {
                if (err) return debug(err);
                res.json({ type: 'subscribeMessage', message: 'Subscribe succeeded' })
            });
        });
    }
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