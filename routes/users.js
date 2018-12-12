const express = require('express');
const router = express.Router();
const debug = require('debug')('goodtogo_backend:users');

const userQuery = require('../controllers/userQuery');

const validateDefault = require('../middlewares/validation/validateDefault');
const validateRequest = require('../middlewares/validation/validateRequest').JWT;
const regAsBot = require('../middlewares/validation/validateRequest').regAsBot;
const regAsStore = require('../middlewares/validation/validateRequest').regAsStore;
const regAsStoreManager = require('../middlewares/validation/validateRequest').regAsStoreManager;
const regAsAdminManager = require('../middlewares/validation/validateRequest').regAsAdminManager;

const intReLength = require('@lastlongerproject/toolkit').intReLength;
const cleanUndoTrade = require('@lastlongerproject/toolkit').cleanUndoTrade;

const subscribeSNS = require('../helpers/aws/SNS').sns_subscribe;

const Trade = require('../models/DB/tradeDB');
const DataCacheFactory = require("../models/DataCacheFactory");
const getGlobalUsedAmount = require('../models/variables/globalUsedAmount');

router.post('/signup', validateDefault, function (req, res, next) { // for CUSTOMER
    req.body['active'] = true; // !!! Need to send by client when need purchasing !!!
    userQuery.signup(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else if (info.needCode) {
            return res.status(205).json(info.body);
        } else {
            res.json(info.body);
        }
    });
});

router.post('/signup/clerk', regAsStoreManager, regAsAdminManager, validateRequest, function (req, res, next) { // for CLERK
    var dbUser = req._user;
    if (dbUser.role.typeCode === "clerk") {
        req.body['role'] = {
            typeCode: "clerk",
            manager: false,
            storeID: dbUser.role.storeID
        };
    } else if (dbUser.role.typeCode === "admin") {
        req.body['role'] = {
            typeCode: "admin",
            manager: false,
            stationID: dbUser.role.stationID
        };
    }
    req.body['active'] = true;
    req._passCode = true;
    userQuery.signup(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else {
            res.json(info.body);
        }
    });
});

router.post('/signup/root', regAsStore, regAsAdminManager, validateRequest, function (req, res, next) { // for ADMIN and CLERK
    req.body['active'] = true;
    var dbUser = req._user;
    if (dbUser.role.typeCode === "clerk") {
        req.body['role'] = {
            typeCode: "customer"
        };
    }
    req._passCode = true;
    userQuery.signup(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else {
            res.json(info.body);
        }
    });
});

router.post('/login', validateDefault, function (req, res, next) {
    userQuery.login(req, function (err, user, info) {
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

router.post('/modifypassword', validateRequest, function (req, res, next) {
    userQuery.chanpass(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else {
            res.json(info.body);
        }
    });
});

router.post('/forgotpassword', validateDefault, function (req, res, next) {
    userQuery.forgotpass(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else if (info.needCode) {
            return res.status(205).json(info.body);
        } else {
            res.json(info.body);
        }
    });
});

router.post('/logout', validateRequest, function (req, res, next) {
    userQuery.logout(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else {
            res.json(info);
        }
    });
});

router.post('/addbot', regAsAdminManager, validateRequest, function (req, res, next) {
    userQuery.addBot(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else {
            res.json(info.body);
        }
    });
});

router.post('/createBotKey', regAsAdminManager, validateRequest, function (req, res, next) {
    userQuery.createBotKey(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else {
            res.json(info.body);
        }
    });
});

router.post('/subscribeSNS', validateRequest, function (req, res, next) {
    var deviceToken = req.body.deviceToken.replace(/\s/g, "").replace("<", "").replace(">", "");
    var type = req.body.appType;
    var system = req.body.system;
    if (typeof deviceToken === undefined || typeof type === undefined || typeof system === undefined) {
        return res.status(401).json({
            code: 'D009',
            type: 'subscribeMessage',
            message: 'Content not Complete'
        });
    } else if (!(type === "shop" || type === "customer") || !(system === "ios" || system === "android")) {
        return res.status(401).json({
            code: 'D010',
            type: 'subscribeMessage',
            message: 'Content invalid'
        });
    }
    res.json({
        type: 'subscribeMessage',
        message: 'Subscribe succeeded'
    });
    if (deviceToken !== "HEYBITCH") {
        var dbUser = req._user;
        subscribeSNS(system, type, deviceToken, function (err, arn) {
            if (err) return debug(err);
            var newObject = {};
            if (dbUser.pushNotificationArn)
                for (var key in dbUser.pushNotificationArn)
                    newObject[key] = dbUser.pushNotificationArn[key];
            newObject[type + "-" + system] = arn;
            dbUser.pushNotificationArn = newObject;
            dbUser.save((err) => {
                if (err) return debug(err);
            });
        });
    }
});

var redis = require("../models/redis");
var User = require("../models/DB/userDB");
router.get('/data/byToken', regAsStore, regAsBot, validateRequest, function (req, res, next) {
    var key = req.headers.userapikey;
    redis.get('user_token:' + key, (err, reply) => {
        if (err) return next(err);
        if (!reply) return res.status(403).json({
            code: 'F013',
            type: "borrowContainerMessage",
            message: "Rent Request Expired"
        });
        User.findOne({
            "user.phone": reply
        }, (err, dbUser) => {
            if (err) return next(err);
            var store = DataCacheFactory.get('store');
            var containerType = DataCacheFactory.get('containerType');
            Trade.find({
                '$or': [{
                        'tradeType.action': 'Rent',
                        'newUser.phone': dbUser.user.phone
                    },
                    {
                        'tradeType.action': 'Return',
                        'oriUser.phone': dbUser.user.phone
                    },
                    {
                        'tradeType.action': 'UndoReturn',
                        'newUser.phone': dbUser.user.phone
                    }
                ]
            }, function (err, tradeList) {
                if (err) return next(err);

                cleanUndoTrade('Return', tradeList);
                tradeList.sort((a, b) => a.tradeTime - b.tradeTime);

                var containerKey;
                var tmpReturnedObject;
                var inUsedDict = {};
                var returnedList = [];
                tradeList.forEach(aTrade => {
                    containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
                    if (aTrade.tradeType.action === "Rent") {
                        inUsedDict[containerKey] = {
                            container: '#' + intReLength(aTrade.container.id, 3),
                            containerCode: aTrade.container.id,
                            time: aTrade.tradeTime,
                            type: containerType[aTrade.container.typeCode].name,
                            store: store[(aTrade.oriUser.storeID)].name,
                            cycle: aTrade.container.cycleCtr,
                            returned: false
                        };
                    } else if (aTrade.tradeType.action === "Return" && inUsedDict[containerKey]) {
                        tmpReturnedObject = {};
                        Object.assign(tmpReturnedObject, inUsedDict[containerKey]);
                        Object.assign(tmpReturnedObject, {
                            returned: true,
                            returnTime: aTrade.tradeTime
                        });
                        delete tmpReturnedObject.cycle;
                        delete inUsedDict[containerKey];
                        returnedList.unshift(tmpReturnedObject);
                    }
                });

                var inUsedList = Object.values(inUsedDict).sort((a, b) => b.time - a.time);
                res.json({
                    usingAmount: inUsedList.length,
                    data: inUsedList.concat(returnedList)
                });
            });
        });
    });
});

router.get('/data', validateRequest, function (req, res, next) {
    var dbUser = req._user;
    var store = DataCacheFactory.get('store');
    var containerType = DataCacheFactory.get('containerType');
    Trade.find({
        '$or': [{
                'tradeType.action': 'Rent',
                'newUser.phone': dbUser.user.phone
            },
            {
                'tradeType.action': 'Return',
                'oriUser.phone': dbUser.user.phone
            },
            {
                'tradeType.action': 'UndoReturn',
                'newUser.phone': dbUser.user.phone
            }
        ]
    }, function (err, tradeList) {
        if (err) return next(err);

        cleanUndoTrade('Return', tradeList);
        tradeList.sort((a, b) => a.tradeTime - b.tradeTime);

        var containerKey;
        var tmpReturnedObject;
        var inUsedDict = {};
        var returnedList = [];
        tradeList.forEach(aTrade => {
            containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
            if (aTrade.tradeType.action === "Rent") {
                inUsedDict[containerKey] = {
                    container: '#' + intReLength(aTrade.container.id, 3),
                    containerCode: aTrade.container.id,
                    time: aTrade.tradeTime,
                    type: containerType[aTrade.container.typeCode].name,
                    store: store[(aTrade.oriUser.storeID)].name,
                    cycle: aTrade.container.cycleCtr,
                    returned: false
                };
            } else if (aTrade.tradeType.action === "Return" && inUsedDict[containerKey]) {
                tmpReturnedObject = {};
                Object.assign(tmpReturnedObject, inUsedDict[containerKey]);
                Object.assign(tmpReturnedObject, {
                    returned: true,
                    returnTime: aTrade.tradeTime
                });
                delete tmpReturnedObject.cycle;
                delete inUsedDict[containerKey];
                returnedList.unshift(tmpReturnedObject);
            }
        });

        var inUsedList = Object.values(inUsedDict).sort((a, b) => b.time - a.time);
        getGlobalUsedAmount((err, globalAmount) => {
            if (err) return next(err);
            res.json({
                usingAmount: inUsedList.length,
                data: inUsedList.concat(returnedList),
                globalAmount
            });
        });
    });
});

module.exports = router;