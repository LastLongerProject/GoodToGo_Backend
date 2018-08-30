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
const MILLISECONDS_OF_LOST_CONTAINER_SHOP = MILLISECONDS_OF_A_DAY * 8;
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

                result.shopHistorySummary.totalDuration = usedTime.reduce((a, b) => (a + b), 0) / usedTime.length;
                var recentTotalDuration = usedTime_recent.reduce((a, b) => (a + b), 0) / usedTime_recent.length;
                result.shopRecentHistorySummary.totalDuration = isNaN(recentTotalDuration) ? 0 : recentTotalDuration;
                res.json(result);
            });
        });
    });
});

router.get('/search', regAsAdminManager, validateRequest, function (req, res, next) {
    var fields = req.query.fields.split(",");
    var searchTxt = req.query.txt;
    var txtArr = searchTxt.split(" ").filter(
        function (ele) {
            return ele !== "";
        }
    );
    var regExpTxt = txtArr.join("|");
    var regExp;
    try {
        regExp = new RegExp(regExpTxt, "gi");
    } catch (error) {
        return res.status(403).json({
            code: '???',
            type: "ManageMessage",
            message: "Search Txt Err"
        });
    }
    const fieldDict = {
        shop: Store.find({
            "name": regExp
        }).select({
            "id": 1,
            "name": 1,
            "_id": 0
        }),
        user: User.find({
            "user.phone": regExp
        }).select({
            "user.phone": 1,
            "_id": 0
        }),
        container: Container.find({
            '$where': regExp.toString() + ".test(this.ID)"
        }).select({
            "ID": 1,
            "typeCode": 1,
            "_id": 0
        })
    };
    var funcList = [];
    fields.forEach((aField) => {
        funcList.push(new Promise((resolve, reject) => {
            var localField = aField;
            if (fieldDict.hasOwnProperty(aField))
                fieldDict[aField].exec((err, dataList) => {
                    if (err) return reject(err);
                    else return resolve([localField, dataList]);
                });
            else resolve([aField, []]);
        }));
    });
    Promise
        .all(funcList)
        .then((data) => {
            var containerDict = req.app.get('containerType');
            var result = {
                user: {
                    show: true,
                    list: []
                },
                container: {
                    show: true,
                    list: []
                },
                shop: {
                    show: true,
                    list: []
                },
                delivery: {
                    show: true,
                    list: []
                }
            };
            data.forEach((aData) => {
                var fieldName = aData[0];
                var dataList = aData[1];
                if (dataList.length > 0) {
                    if (dataList.length > 24) {
                        dataList = dataList.slice(0, 23);
                        dataList.push({
                            id: -1,
                            name: "還有更多..."
                        });
                    }
                    switch (fieldName) { // 還有更多
                        case "user":
                            dataList.forEach((aUser) => {
                                if (aUser.hasOwnProperty('id') && aUser.id === -1)
                                    result[fieldName].list.push(aUser);
                                else
                                    result[fieldName].list.push({
                                        id: aUser.user.phone,
                                        name: phoneEncoder(aUser.user.phone, true)
                                    });
                            });
                            break;
                        case "shop":
                            dataList.forEach((aShop) => {
                                if (aShop.hasOwnProperty('id') && aShop.id === -1)
                                    result[fieldName].list.push(aShop);
                                else
                                    result[fieldName].list.push({
                                        id: aShop.id,
                                        name: aShop.name
                                    });
                            });
                            break;
                        case "container":
                            dataList.forEach((aContainer) => {
                                if (aContainer.hasOwnProperty('id') && aContainer.id === -1)
                                    result[fieldName].list.push(aContainer);
                                else
                                    result[fieldName].list.push({
                                        id: aContainer.ID,
                                        name: "#" + aContainer.ID + "　" + containerDict[aContainer.typeCode].name,
                                        type: aContainer.typeCode
                                    });
                            });
                            break;
                    }
                }
            });
            res.json(result);
        })
        .catch((err) => {
            if (err) return next(err);
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
                var weeklySum = arrOfWeeklyUsageOfThisStore.reduce((a, b) => (a + b), 0);
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
                    'tradeType.action': 'UndoReturn',
                    'oriUser.storeID': STORE_ID
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

            cleanUndo(['Return', 'ReadyToClean'], tradeList);

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
            var weeklySum = arrOfWeeklyUsageOfThisStore.reduce((a, b) => (a + b), 0);
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
                phone: phoneEncoder(aUser.user.phone, true),
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
            while (now - weekCheckpoint >= MILLISECONDS_OF_A_WEEK) {
                weekCheckpoint.setDate(weekCheckpoint.getDate() + 7);
                weeklyAmount[weekCheckpoint] = 0;
            }
            result.list = Object.values(userDict);
            result.totalUserAmount = userList.length;
            var arrOfWeeklyAmount = Object.values(weeklyAmount);
            result.weeklyAverageUsage = Math.round(arrOfWeeklyAmount.reduce((a, b) => (a + b), 0) / arrOfWeeklyAmount.length);
            res.json(result);
        });
    });
});

router.get('/userDetail', regAsAdminManager, validateRequest, function (req, res, next) {
    const USER_ID = req.query.id;
    var containerDict = req.app.get('containerWithDeactive');
    var storeDict = req.app.get('store');
    User.findOne({
        'user.phone': USER_ID
    }, (err, theUser) => {
        if (err || !theUser) return next(err);

        var result = {
            userPhone: phoneEncoder(theUser.user.phone, true),
            usingAmount: 0,
            lostAmount: 0,
            totalUsageAmount: 0,
            joinedDate: 1234, // 待更新
            joinedMethod: "店鋪 (方糖咖啡)", // 待更新
            recentAmount: 0,
            recentAmountPercentage: 0,
            weekAverage: 0,
            averageUsingDuration: 0,
            amountOfBorrowingFromDiffPlace: 0,
            history: []
        };
        var tradeQuery = {
            '$or': [{
                    'tradeType.action': 'Rent',
                    'newUser.phone': theUser.user.phone
                },
                {
                    'tradeType.action': 'Return',
                    'oriUser.phone': theUser.user.phone
                },
                {
                    'tradeType.action': 'UndoReturn',
                    'newUser.phone': theUser.user.phone
                }
            ]
        };
        Trade.find(tradeQuery, (err, tradeList) => {
            if (err) return next(err);
            tradeList.sort((a, b) => (a.tradeTime - b.tradeTime));
            cleanUndo('Return', tradeList);

            var now = Date.now();
            var containerKey;
            var tradeDict = {};
            var weeklyAmount = {};
            var weekCheckpoint = null;
            tradeList.forEach((aTrade) => {
                containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
                if (aTrade.tradeType.action === "Rent") {
                    tradeDict[containerKey] = {
                        containerType: containerDict[aTrade.container.id],
                        containerID: "#" + aTrade.container.id,
                        rentTime: aTrade.tradeTime,
                        rentPlace: storeDict[aTrade.oriUser.storeID].name
                    };
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
                } else if (aTrade.tradeType.action === "Return" && tradeDict[containerKey]) {
                    tradeDict[containerKey].returnTime = aTrade.tradeTime;
                    tradeDict[containerKey].returnPlace = storeDict[aTrade.newUser.storeID].name;
                    tradeDict[containerKey].usingDuration = aTrade.tradeTime - tradeDict[containerKey].rentTime;
                    result.history.unshift(tradeDict[containerKey]);
                    if (tradeDict[containerKey].rentPlace !== tradeDict[containerKey].returnPlace) result.amountOfBorrowingFromDiffPlace++;
                    delete tradeDict[containerKey];
                }
            });

            var notReturnedList = Object.values(tradeDict).sort((a, b) => b.rentTime - a.rentTime);
            notReturnedList.forEach((aNotReturnedTrade) => {
                aNotReturnedTrade.usingDuration = now - aNotReturnedTrade.rentTime;
                aNotReturnedTrade.returnTime = "尚未歸還";
                aNotReturnedTrade.returnPlace = "";
                if (aNotReturnedTrade.usingDuration > MILLISECONDS_OF_LOST_CONTAINER_CUSTOMER) result.lostAmount++;
                else result.usingAmount++;
            });

            while (weekCheckpoint && now - weekCheckpoint >= MILLISECONDS_OF_A_WEEK) {
                weekCheckpoint.setDate(weekCheckpoint.getDate() + 7);
                weeklyAmount[weekCheckpoint] = 0;
            }

            result.history = notReturnedList.concat(result.history);
            var totalUsingTime = result.history.reduce((a, b) => a.usingDuration + b.usingDuration, 0);
            result.averageUsingDuration = (totalUsingTime / result.history.length) || 0;
            var arrOfWeeklyAmount = Object.values(weeklyAmount);
            result.weekAverage = Math.round(arrOfWeeklyAmount.reduce((a, b) => (a + b), 0) / arrOfWeeklyAmount.length) || 0;
            result.recentAmount = weeklyAmount[weekCheckpoint] || 0;
            result.recentAmountPercentage = ((result.recentAmount - result.weekAverage) / result.weekAverage) || 0;
            res.json(result);
        })
    });
});

router.get('/container', regAsAdminManager, validateRequest, function (req, res, next) {
    Container.find((err, containerList) => {
        if (err) return next(err);
        var typeDict = {};
        var containerType = req.app.get('containerType');
        for (var aType in containerType) {
            typeDict[containerType[aType].typeCode] = {
                id: containerType[aType].typeCode,
                type: containerType[aType].name,
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
        }
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

const statusTxtDict = {
    0: "待簽收",
    1: "待使用",
    2: "使用中",
    3: "已歸還",
    4: "庫存",
    5: "待配送"
};
const actionTxtDict = {
    "Delivery": "配送",
    "CancelDelivery": "取消配送",
    "Sign": "簽收",
    "Rent": "借出",
    "Return": "歸還",
    "UndoReturn": "取消歸還",
    "ReadyToClean": "回收",
    "UndoReadyToClean": "取消回收",
    "Boxing": "裝箱",
    "Unboxing": "取消裝箱"
};
router.get('/containerDetail', regAsAdminManager, validateRequest, function (req, res, next) {
    const CONTAINER_ID = req.query.id;
    var containerDict = req.app.get('containerWithDeactive');
    var storeDict = req.app.get('store');
    Container.findOne({
        "ID": CONTAINER_ID
    }, (err, theContainer) => {
        if (err) return next(err);
        var result = {
            containerID: "#" + theContainer.ID,
            containerType: {
                txt: containerDict[theContainer.ID],
                code: theContainer.typeCode
            },
            reuseTime: theContainer.cycleCtr,
            status: statusTxtDict[theContainer.statusCode],
            bindedUser: phoneEncoder(theContainer.conbineTo),
            joinedDate: theContainer.createdAt,
            history: []
        };
        Trade.find({
            "container.id": CONTAINER_ID
        }, {}, {
            sort: {
                "tradeTime": -1
            }
        }, (err, tradeList) => {
            if (err) return next(err);
            tradeList.forEach((aTrade) => {
                result.history.push({
                    tradeTime: aTrade.tradeTime,
                    action: actionTxtDict[aTrade.tradeType.action],
                    newUser: phoneEncoder(aTrade.newUser.phone),
                    oriUser: phoneEncoder(aTrade.oriUser.phone),
                    comment: ""
                });
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

function phoneEncoder(phone, expose = false) {
    return phone.slice(0, 4) + (expose ? ("-" + phone.slice(4, 7) + "-") : "-***-") + phone.slice(7, 10);
}

router.patch('/refresh/store', regAsAdminManager, validateRequest, function (req, res, next) {
    refreshStore(req.app, function (err) {
        if (err) return next(err);
        res.status(204).end();
    });
});

router.patch('/refresh/container', regAsAdminManager, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    refreshContainer(req.app, dbAdmin, function (err) {
        if (err) return next(err);
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