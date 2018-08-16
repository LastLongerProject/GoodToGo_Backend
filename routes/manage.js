var express = require('express');
var router = express.Router();
var debug = require('debug')('goodtogo_backend:manager');
var redis = require("../models/redis");

var validateRequest = require('../models/validation/validateRequest').JWT;
var regAsAdminManager = require('../models/validation/validateRequest').regAsAdminManager;
var refreshStore = require('../models/appInit').refreshStore;
var refreshContainer = require('../models/appInit').refreshContainer;
var refreshStoreImg = require('../models/appInit').refreshStoreImg;
var refreshContainerIcon = require('../models/appInit').refreshContainerIcon;
var dateCheckpoint = require('../models/toolKit').dateCheckpoint;

var Store = require('../models/DB/storeDB');
var Trade = require('../models/DB/tradeDB');

const MILLISECONDS_OF_A_WEEK = 1000 * 60 * 60 * 24 * 7;
const MILLISECONDS_OF_A_DAY = 1000 * 60 * 60 * 24;

router.get('/shop', regAsAdminManager, validateRequest, function (req, res, next) {
    Store.find(function (err, storeDataList) {
        if (err) return next(err);
        var storeIdDict = {};
        storeDataList.forEach(function (aStoreData) {
            storeIdDict[aStoreData.id] = {
                id: aStoreData.id,
                storeName: aStoreData.name,
                toUsedAmount: 0,
                todayAmount: 0,
                weekAmount: 0,
                weekAverage: 0
            };
        });
        var tradeQuery = {
            'tradeType.action': {
                '$in': ['Sign', 'ReadyToClean', 'UndoReadyToClean']
            }
        };
        if (false) // 讀快取
            tradeQuery.tradeTime = {
                '$gte': dateCheckpoint(0)
            };
        Trade.find(tradeQuery, {}, {
            sort: {
                tradeTime: 1
            }
        }, function (err, tradeList) {
            if (err) return next(err);

            var usedContainer = {};
            var unusedContainer = {};
            var recordToRemove = [];
            for (var i = tradeList.length - 1; i >= 0; i--) {
                if (tradeList[i].tradeType.action === "UndoReadyToClean") {
                    var containerKey = tradeList[i].container.id + "-" + tradeList[i].container.cycleCtr;
                    recordToRemove.push(containerKey);
                    tradeList.splice(i, 1);
                } else if (tradeList[i].tradeType.action === "ReadyToClean") {
                    var containerKey = tradeList[i].container.id + "-" + tradeList[i].container.cycleCtr;
                    var removeIndex = recordToRemove.indexOf(containerKey);
                    if (removeIndex !== -1) {
                        recordToRemove.splice(recordToRemove, 1);
                        tradeList.splice(i, 1);
                    }
                }
            }

            tradeList.forEach(function (aTrade) {
                var containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
                if (aTrade.tradeType.action === "Sign") {
                    unusedContainer[containerKey] = {
                        time: aTrade.tradeTime,
                        storeID: aTrade.newUser.storeID
                    };
                } else if (aTrade.tradeType.action === "ReadyToClean") {
                    if (aTrade.tradeType.oriState === 3) {
                        usedContainer[containerKey] = {
                            time: aTrade.tradeTime,
                            storeID: unusedContainer[containerKey].storeID
                        };
                    }
                    delete unusedContainer[containerKey];
                }
            });

            for (let unusedContainerRecord in unusedContainer) {
                storeIdDict[unusedContainer[unusedContainerRecord].storeID].toUsedAmount++;
            }

            var weeklyAmountByStore = {};

            storeDataList.forEach(function (aStoreData) {
                weeklyAmountByStore[aStoreData.id] = {};
            });
            var weekCheckpoint = getWeekCheckpoint(Object.entries(usedContainer)[0][1].time);
            var todayCheckpoint = dateCheckpoint(0);
            for (var aStore in weeklyAmountByStore) { // init
                weeklyAmountByStore[aStore][weekCheckpoint] = 0;
            }
            for (var usedContainerKey in usedContainer) {
                var usedContainerRecord = usedContainer[usedContainerKey];
                if (usedContainerRecord.time - weekCheckpoint >= MILLISECONDS_OF_A_WEEK) {
                    weekCheckpoint.setDate(weekCheckpoint.getDate() + 7);
                    for (var aStore in weeklyAmountByStore) {
                        weeklyAmountByStore[aStore][weekCheckpoint] = 0;
                    }
                }
                if (usedContainerRecord.time - weekCheckpoint < MILLISECONDS_OF_A_WEEK) {
                    weeklyAmountByStore[usedContainerRecord.storeID][weekCheckpoint]++;
                }
                if (usedContainerRecord.time - todayCheckpoint < MILLISECONDS_OF_A_DAY && usedContainerRecord.time - todayCheckpoint > 0) {
                    storeIdDict[usedContainerRecord.storeID].todayAmount++;
                }
            }

            var now = Date.now();
            while (weekCheckpoint - now >= MILLISECONDS_OF_A_WEEK) {
                weekCheckpoint.setDate(weekCheckpoint.getDate() + 7);
                for (var aStore in weeklyAmountByStore) {
                    weeklyAmountByStore[aStore][weekCheckpoint] = 0;
                }
            }

            for (var aStoreID in weeklyAmountByStore) {
                storeIdDict[aStoreID].weekAmount = weeklyAmountByStore[aStoreID][weekCheckpoint];
                var arrOfWeeklyUsageOfThisStore = Object.values(weeklyAmountByStore[aStoreID]);
                var weights = arrOfWeeklyUsageOfThisStore.length;
                var weeklySum = arrOfWeeklyUsageOfThisStore.reduce((a, b) => (a + b));
                storeIdDict[aStoreID].weekAverage = Math.round(weeklySum / weights);
            }

            res.json({
                list: Object.values(storeIdDict)
            });
        });
    });
});

router.get('/shopDetail/:id', regAsAdminManager, validateRequest, function (req, res, next) {
    const STORE_ID = parseInt(req.params.id);
    Store.findOne({
        id: STORE_ID
    }, function (err, theStore) {
        if (err) return next(err);
        var result = {
            storeName: theStore.name,
            toUsedAmount: 0,
            todayAmount: 0,
            weekAmount: 0,
            joinedDate: 1234, // Need Update
            contactNickname: "店長", // Need Update
            contactPhone: "0988555666", // Need Update
            recentAmount: 0,
            recentAmountPercentage: 0.0,
            weekAverage: 0,
            history: []
        };
        var tradeQuery = {
            '$or': [{
                    'tradeType.action': 'Sign',
                    'newUser.storeID': STORE_ID
                },
                {
                    'tradeType.action': 'Rent',
                    'oriUser.storeID': STORE_ID
                },
                {
                    'tradeType.action': 'Return',
                    'newUser.storeID': STORE_ID
                },
                {
                    'tradeType.action': 'ReadyToClean',
                },
                {
                    'tradeType.action': 'UndoReadyToClean'
                }
            ]
        };
        if (false) // 讀快取
            tradeQuery.tradeTime = {
                '$gte': dateCheckpoint(0)
            };
        Trade.find(tradeQuery, {}, {
            sort: {
                tradeTime: 1
            }
        }, function (err, tradeList) {
            if (err) return next(err);

            var usedContainer = {};
            var unusedContainer = {};
            var recordToRemove = [];
            for (var i = tradeList.length - 1; i >= 0; i--) {
                if (tradeList[i].tradeType.action === "UndoReadyToClean") {
                    var containerKey = tradeList[i].container.id + "-" + tradeList[i].container.cycleCtr;
                    recordToRemove.push(containerKey);
                    tradeList.splice(i, 1);
                } else if (tradeList[i].tradeType.action === "ReadyToClean") {
                    var containerKey = tradeList[i].container.id + "-" + tradeList[i].container.cycleCtr;
                    var removeIndex = recordToRemove.indexOf(containerKey);
                    if (removeIndex !== -1) {
                        recordToRemove.splice(recordToRemove, 1);
                        tradeList.splice(i, 1);
                    }
                }
            }

            tradeList.forEach(function (aTrade) {
                var containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
                if (aTrade.tradeType.action === "Sign") {
                    unusedContainer[containerKey] = {
                        time: aTrade.tradeTime,
                        storeID: aTrade.newUser.storeID
                    };
                } else if (aTrade.tradeType.action === "ReadyToClean" && containerKey in unusedContainer) {
                    if (aTrade.tradeType.oriState === 3) {
                        usedContainer[containerKey] = {
                            time: aTrade.tradeTime,
                            storeID: unusedContainer[containerKey].storeID
                        };
                    }
                    delete unusedContainer[containerKey];
                }
            });

            result.toUsedAmount = Object.keys(unusedContainer).length;

            var weeklyAmount = {};

            var weekCheckpoint = getWeekCheckpoint(Object.entries(usedContainer)[0][1].time);
            var todayCheckpoint = dateCheckpoint(0);
            var recentCheckpoint = dateCheckpoint(-6);
            weeklyAmount[weekCheckpoint] = 0;
            for (var usedContainerKey in usedContainer) {
                var usedContainerRecord = usedContainer[usedContainerKey];
                if (usedContainerRecord.time - weekCheckpoint >= MILLISECONDS_OF_A_WEEK) {
                    weekCheckpoint.setDate(weekCheckpoint.getDate() + 7);
                    weeklyAmount[weekCheckpoint] = 0;
                }
                if (usedContainerRecord.time - weekCheckpoint < MILLISECONDS_OF_A_WEEK) {
                    weeklyAmount[weekCheckpoint]++;
                }
                if (usedContainerRecord.time - todayCheckpoint > 0) {
                    result.todayAmount++;
                }
                if (usedContainerRecord.time - recentCheckpoint > 0) {
                    result.recentAmount++;
                }
            }

            var now = Date.now();
            while (now - weekCheckpoint >= MILLISECONDS_OF_A_WEEK) {
                weekCheckpoint.setDate(weekCheckpoint.getDate() + 7);
                weeklyAmount[weekCheckpoint] = 0;
            }

            result.weekAmount = weeklyAmount[weekCheckpoint];
            var arrOfWeeklyUsageOfThisStore = Object.values(weeklyAmount);
            var weights = arrOfWeeklyUsageOfThisStore.length;
            var weeklySum = arrOfWeeklyUsageOfThisStore.reduce((a, b) => (a + b));
            result.weekAverage = Math.round(weeklySum / weights);
            result.recentAmountPercentage = (result.recentAmount - result.weekAverage) / result.weekAverage;

            var boxSigned = [];
            tradeList.forEach(function (aTrade) {
                if (aTrade.tradeType.action === "Sign") {
                    var serial = aTrade.container.box + "-" + aTrade.tradeTime;
                    if (boxSigned.indexOf(serial) !== -1) return;
                    else boxSigned.push(serial);
                    result.history.unshift({
                        time: aTrade.tradeTime,
                        serial: "#" + aTrade.container.box,
                        action: "簽收",
                        owner: theStore.name,
                        by: aTrade.newUser.name || phoneEncoder(aTrade.newUser.phone)
                    });
                } else if (aTrade.tradeType.action === "Rent") {
                    result.history.unshift({
                        time: aTrade.tradeTime,
                        serial: "#" + aTrade.container.id,
                        action: "借出",
                        owner: phoneEncoder(aTrade.newUser.phone),
                        by: aTrade.oriUser.name || phoneEncoder(aTrade.oriUser.phone)
                    });
                } else if (aTrade.tradeType.action === "Return") {
                    result.history.unshift({
                        time: aTrade.tradeTime,
                        serial: "#" + aTrade.container.id,
                        action: "歸還",
                        owner: theStore.name,
                        by: aTrade.newUser.name || phoneEncoder(aTrade.newUser.phone)
                    });
                }
            });

            res.json(result);
        });
    });
});

function getWeekCheckpoint(date) {
    var timezoneFix = 0;
    if (date.getHours() < 16 && process.env.OS !== 'Windows_NT')
        timezoneFix--;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() + 1 + timezoneFix, 16, 0, 0, 0);
}

function phoneEncoder(phone) {
    return phone.slice(0, 4) + "-***-" + phone.slice(7, 10);
}

router.patch('/refresh/store', regAsAdminManager, validateRequest, function (req, res, next) {
    refreshStore(req.app, function () {
        res.status(204).end();
    });
});

router.patch('/refresh/container', regAsAdminManager, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    refreshContainer(req.app, dbAdmin, function () {
        res.status(204).end();
    });
});

router.patch('/refresh/storeImg/:id', regAsAdminManager, validateRequest, function (req, res, next) {
    var forceRenew = (req.params.id === '1');
    refreshStoreImg(forceRenew, function (succeed, resData) {
        res.status((succeed) ? 200 : 403).json(resData);
    });
});

router.patch('/refresh/containerIcon/:id', regAsAdminManager, validateRequest, function (req, res, next) {
    var forceRenew = (req.params.id === '1');
    refreshContainerIcon(forceRenew, function (succeed, resData) {
        res.status((succeed) ? 200 : 403).json(resData);
    });
});

module.exports = router;