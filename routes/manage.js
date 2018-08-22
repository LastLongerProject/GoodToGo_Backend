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
var cleanUndo = require('../models/toolKit').cleanUndoTrade;

var User = require('../models/DB/userDB');
var Store = require('../models/DB/storeDB');
var Trade = require('../models/DB/tradeDB');
var Container = require('../models/DB/containerDB');

const MILLISECONDS_OF_A_WEEK = 1000 * 60 * 60 * 24 * 7;
const MILLISECONDS_OF_A_DAY = 1000 * 60 * 60 * 24;
const MILLISECONDS_OF_LOST_CONTAINER_SHOP = MILLISECONDS_OF_A_DAY * 7;
const MILLISECONDS_OF_LOST_CONTAINER_CUSTOMER = MILLISECONDS_OF_A_DAY * 3;

router.get('/index', regAsAdminManager, validateRequest, function (req, res, next) {
    var result = {
        summary: {
            userAmount: 0,
            storeAmount: 0,
            activityAmount: 0
        },
        activityHistorySummary: {
            usedAmount: 0,
            lostAmount: 0,
            totalDuration: 0
        },
        shopHistorySummary: {
            usedAmount: 0,
            lostAmount: 0,
            totalDuration: 0,
            quantityOfBorrowingFromDiffPlace: 0
        },
        shopRecentHistorySummary: {
            usedAmount: 0,
            lostAmount: 0,
            totalDuration: 0,
            quantityOfBorrowingFromDiffPlace: 0
        }
    };
    User.count((err, userAmount) => {
        if (err) return next(err);
        result.summary.userAmount = userAmount;
        Store.count({
            active: true
        }, (err, storeAmount) => {
            if (err) return next(err);
            result.summary.storeAmount = storeAmount;
            var tradeQuery = {
                'tradeType.action': {
                    '$in': ['Sign', 'Rent', 'Return', 'UndoReturn', 'ReadyToClean', 'UndoReadyToClean']
                }
            };
            if (false) // 讀快取
                tradeQuery.tradeTime = {
                    '$gte': dateCheckpoint(0)
                };
            Trade.find(tradeQuery, function (err, tradeList) {
                if (err) return next(err);

                tradeList.sort((a, b) => {
                    return a.tradeTime - b.tradeTime;
                });
                cleanUndo(['Return', 'ReadyToClean'], tradeList);

                var now = Date.now();
                var lastUsed = {};
                var rentedContainer = {};
                var signedContainer = {};
                var usedTime = [];
                var usedTime_recent = [];
                tradeList.forEach(function (aTrade) {
                    var containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
                    lastUsed[aTrade.container.id] = {
                        time: aTrade.tradeTime,
                        action: aTrade.tradeType.action
                    };
                    if (aTrade.tradeType.action === "Sign") {
                        signedContainer[containerKey] = {
                            time: aTrade.tradeTime,
                            storeID: aTrade.newUser.storeID
                        };
                    } else if (aTrade.tradeType.action === "Rent") {
                        rentedContainer[containerKey] = {
                            time: aTrade.tradeTime
                        };
                    } else if (aTrade.tradeType.action === "Return") {
                        var recent = now - aTrade.tradeTime <= MILLISECONDS_OF_A_WEEK;
                        result.shopHistorySummary.usedAmount++;
                        if (recent) {
                            result.shopRecentHistorySummary.usedAmount++;
                        }
                        if (rentedContainer[containerKey]) {
                            var duration = aTrade.tradeTime - rentedContainer[containerKey].time;
                            usedTime.push(duration);
                            if (recent) {
                                usedTime_recent.push(duration);
                            }
                        }
                        if (!signedContainer[containerKey]) console.log(containerKey);
                        if (aTrade.newUser.storeID !== signedContainer[containerKey].storeID) {
                            result.shopHistorySummary.quantityOfBorrowingFromDiffPlace++;
                            if (recent) {
                                result.shopRecentHistorySummary.quantityOfBorrowingFromDiffPlace++;
                            }
                        }
                    }
                });

                for (var containerID in lastUsed) {
                    if (lastUsed[containerID].action !== "ReadyToClean" && (now - lastUsed[containerID].time) >= MILLISECONDS_OF_LOST_CONTAINER_CUSTOMER) {
                        // console.log(containerID, lastUsed[containerID])
                        result.shopHistorySummary.lostAmount++;
                    }
                }

                result.shopHistorySummary.totalDuration = usedTime.reduce((a, b) => (a + b));
                result.shopRecentHistorySummary.totalDuration = usedTime_recent.reduce((a, b) => (a + b));
                console.log(result)
                res.json(result);
            });
        });
    });
});


router.get('/shop', regAsAdminManager, validateRequest, function (req, res, next) {
    Store.find({
        active: true
    }, function (err, storeDataList) {
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

            cleanUndo('ReadyToClean', tradeList);

            var usedContainer = {};
            var unusedContainer = {};
            tradeList.forEach(function (aTrade) {
                var containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
                if (aTrade.tradeType.action === "Sign") {
                    if (!storeIdDict[aTrade.newUser.storeID]) return;
                    unusedContainer[containerKey] = {
                        time: aTrade.tradeTime,
                        storeID: aTrade.newUser.storeID
                    };
                } else if (aTrade.tradeType.action === "ReadyToClean" && unusedContainer[containerKey]) {
                    if (!storeIdDict[aTrade.oriUser.storeID]) return;
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
            var weekCheckpoint = getWeekCheckpoint(Object.entries(usedContainer)[0][1].time);
            var todayCheckpoint = dateCheckpoint(0);
            for (var usedContainerKey in usedContainer) {
                var usedContainerRecord = usedContainer[usedContainerKey];
                if (!weeklyAmountByStore[usedContainerRecord.storeID]) {
                    weeklyAmountByStore[usedContainerRecord.storeID] = {};
                    weeklyAmountByStore[usedContainerRecord.storeID][weekCheckpoint] = 0;
                }
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
            while (now - weekCheckpoint >= MILLISECONDS_OF_A_WEEK) {
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

router.get('/shopDetail', regAsAdminManager, validateRequest, function (req, res, next) {
    const STORE_ID = parseInt(req.query.id);
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

            cleanUndo('ReadyToClean', tradeList);

            var usedContainer = {};
            var unusedContainer = {};
            var boxSigned = [];
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

            res.json(result);
        });
    });
});

router.get('/user', regAsAdminManager, validateRequest, function (req, res, next) {
    var result = {
        totalUserAmount: 0,
        totalUsageAmount: 0,
        weeklyAverageUsage: 0,
        totalLostAmount: 0,
        list: []
    };
    User.find((err, userList) => {
        if (err) return next(err);
        var userDict = {};
        var userUsingDict = {};
        userList.forEach(aUser => {
            userDict[aUser.user.phone] = {
                id: aUser.user.phone,
                phone: aUser.user.phone,
                usingAmount: 0,
                lostAmount: 0,
                totalUsageAmount: 0
            };
            userUsingDict[aUser.user.phone] = {};
        });
        Trade.find({
            "tradeType.action": {
                "$in": ["Rent", "Return", 'UndoReturn']
            }
        }, (err, tradeList) => {
            if (err) return next(err);
            tradeList.sort((a, b) => (a.tradeTime - b.tradeTime));
            cleanUndo("Return", tradeList);
            var containerKey;
            var weeklyAmount = {};
            var weekCheckpoint = null;
            tradeList.forEach(aTrade => {
                containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
                if (aTrade.tradeType.action === "Rent") {
                    userUsingDict[aTrade.newUser.phone][containerKey] = {
                        time: aTrade.tradeTime
                    };
                    userDict[aTrade.newUser.phone].totalUsageAmount++;
                } else {
                    if (!weekCheckpoint) {
                        weekCheckpoint = getWeekCheckpoint(aTrade.tradeTime);
                        weeklyAmount[weekCheckpoint] = 0;
                    }
                    while (aTrade.tradeTime - weekCheckpoint >= MILLISECONDS_OF_A_WEEK) {
                        weekCheckpoint.setDate(weekCheckpoint.getDate() + 7);
                        weeklyAmount[weekCheckpoint] = 0;
                    }
                    weeklyAmount[weekCheckpoint]++;
                    result.totalUsageAmount++;
                    if (aTrade.tradeType.oriState === 2 && userUsingDict[aTrade.oriUser.phone][containerKey])
                        delete userUsingDict[aTrade.oriUser.phone][containerKey];
                }
            });
            const now = Date.now();
            for (var aUser in userUsingDict) {
                for (var aContainerCycle in userUsingDict[aUser]) {
                    if (now - userUsingDict[aUser][aContainerCycle].time > MILLISECONDS_OF_LOST_CONTAINER_CUSTOMER) {
                        userDict[aUser].lostAmount++;
                        result.totalLostAmount++;
                    } else {
                        userDict[aUser].usingAmount++;
                    }
                }
            }
            result.list = Object.values(userDict);
            result.totalUserAmount = userList.length;
            var arrOfWeeklyAmount = Object.values(weeklyAmount);
            result.weeklyAverageUsage = Math.round(arrOfWeeklyAmount.reduce((a, b) => (a + b)) / arrOfWeeklyAmount.length);
            res.json(result);
        });
    });
});

router.get('/container', regAsAdminManager, validateRequest, function (req, res, next) {
    Container.find((err, containerList) => {
        if (err) return next(err);
        var typeDict = {};
        req.app.get('containerType').forEach((aType) => {
            typeDict[aType.typeCode] = {
                id: aType.typeCode,
                type: aType.name,
                totalAmount: 0,
                toUsedAmount: 0,
                usingAmount: 0,
                returnedAmount: 0,
                toCleanAmount: 0,
                toDeliveryAmount: 0,
                toSignAmount: 0,
                inStorageAmount: 0, // need update
                lostAmount: 0
            };
        });
        const now = Date.now();
        containerList.forEach((aContainer) => {
            typeDict[aContainer.typeCode].totalAmount++;
            switch (aContainer.statusCode) {
                case 0: // delivering
                    typeDict[aContainer.typeCode].toSignAmount++;
                    break;
                case 1: // readyToUse
                    typeDict[aContainer.typeCode].toUsedAmount++;
                    if (now - aContainer.lastUsedAt > MILLISECONDS_OF_LOST_CONTAINER_SHOP)
                        typeDict[aContainer.typeCode].lostAmount++;
                    break;
                case 2: // rented
                    typeDict[aContainer.typeCode].usingAmount++;
                    if (now - aContainer.lastUsedAt > MILLISECONDS_OF_LOST_CONTAINER_CUSTOMER)
                        typeDict[aContainer.typeCode].lostAmount++;
                    break;
                case 3: // returned
                    typeDict[aContainer.typeCode].returnedAmount++;
                    if (now - aContainer.lastUsedAt > MILLISECONDS_OF_LOST_CONTAINER_SHOP)
                        typeDict[aContainer.typeCode].lostAmount++;
                    break;
                case 4: // notClean
                    typeDict[aContainer.typeCode].inStorageAmount++;
                    break;
                case 5: // boxed
                    typeDict[aContainer.typeCode].toDeliveryAmount++;
                    break;
            }
        });
        res.json({
            list: Object.values(typeDict)
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