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
                '$in': ['Sign', 'ReadyToClean']
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
                    unusedContainer[containerKey] = undefined;
                }
            });

            console.log(JSON.stringify(usedContainer))
            console.log(JSON.stringify(unusedContainer))

            for (var unusedContainerRecord in unusedContainer) {
                storeIdDict[unusedContainer[unusedContainerRecord].storeID].toUsedAmount++;
            }

            var weeklyAmountByStore = {};

            storeDataList.forEach(function (aStoreData) {
                weeklyAmountByStore[aStoreData.id] = {};
            });
            var weekCheckpoint = getWeekCheckpoint(Object.entries(usedContainer)[0]);
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
                if (usedContainerRecord.time - todayCheckpoint < MILLISECONDS_OF_A_DAY) {
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
                var weights = arrOfWeeklyUsageOfThisStore.lenght;
                var weeklySum = arrOfWeeklyUsageOfThisStore.reduce((a, b) => (a + b));
                storeIdDict[aStoreID].weekAverage = Math.round(weeklySum / weights);
            }

            res.json({
                list: Object.values(storeIdDict)
            });
        });
    });
});

function getWeekCheckpoint(date) {
    var timezoneFix = 0;
    if (date.getHours() < 16 && process.env.OS !== 'Windows_NT')
        timezoneFix--;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() + timezoneFix, 16, 0, 0, 0);
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