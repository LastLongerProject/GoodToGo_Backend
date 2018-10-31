var express = require('express');
var router = express.Router();
var debugError = require('debug')('goodtogo_backend:managerERR');
var debug = require('debug')('goodtogo_backend:manager');
var redis = require("../models/redis");
debug.log = console.log.bind(console);

var validateRequest = require('../middlewares/validation/validateRequest').JWT;
var regAsAdminManager = require('../middlewares/validation/validateRequest').regAsAdminManager;
var getConst = require('../helpers/appInit').getConst;
var refreshStore = require('../helpers/appInit').refreshStore;
var refreshStoreImg = require('../helpers/appInit').refreshStoreImg;
var refreshContainer = require('../helpers/appInit').refreshContainer;
var refreshContainerIcon = require('../helpers/appInit').refreshContainerIcon;
var cleanUndo = require('../helpers/toolKit').cleanUndoTrade;
var dateCheckpoint = require('../helpers/toolKit').dateCheckpoint;
var getWeekCheckpoint = require('../helpers/toolKit').getWeekCheckpoint;

var Box = require('../models/DB/boxDB');
var User = require('../models/DB/userDB');
var Store = require('../models/DB/storeDB');
var Trade = require('../models/DB/tradeDB');
var Container = require('../models/DB/containerDB');

const MILLISECONDS_OF_A_WEEK = 1000 * 60 * 60 * 24 * 7;
const MILLISECONDS_OF_A_DAY = 1000 * 60 * 60 * 24;
const MILLISECONDS_OF_LOST_CONTAINER_SHOP = MILLISECONDS_OF_A_DAY * 15;
const MILLISECONDS_OF_LOST_CONTAINER_CUSTOMER = MILLISECONDS_OF_A_DAY * 3;

const CACHE = {
    index: "manage_cache:index",
    shop: "manage_cache:shop",
    shopDetail: "manage_cache:shopDetail",
    user: "manage_cache:user"
};

const BOXID = /簽收 \[BOX #(\d*)\]/i;
const baseUrl = require("../config/config").serverBaseUrl + "/manager";

router.get('/index', regAsAdminManager, validateRequest, function (req, res, next) {
    var result = {
        summary: {
            userAmount: 0,
            storeAmount: 0,
            activityAmount: 0 // 待更新
        },
        activityHistorySummary: { // 待更新
            usedAmount: 0,
            lostAmount: 0,
            totalDuration: 0
        },
        shopRecentHistorySummary: {
            usedAmount: 0,
            customerLostAmount: 0,
            totalDuration: 0,
            quantityOfBorrowingFromDiffPlace: 0
        },
        shopHistorySummary: {
            usedAmount: 0,
            shopLostAmount: 0,
            customerLostAmount: 0,
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

            redis.get(CACHE.index, (err, reply) => {
                if (err) return next(err);
                var dataCached = {};
                if (reply !== null) dataCached = JSON.parse(reply);

                if (dataCached.timestamp)
                    tradeQuery.tradeTime = {
                        '$gte': new Date(dataCached.timestamp)
                    };

                Trade.find(tradeQuery, function (err, tradeList) {
                    if (err) return next(err);

                    tradeList.sort((a, b) => {
                        return a.tradeTime - b.tradeTime;
                    });
                    cleanUndo(['Return', 'ReadyToClean'], tradeList);

                    var now = Date.now();
                    var thisWeekCheckpoint = getWeekCheckpoint().valueOf();
                    var lastUsed = dataCached.lastUsed || {};
                    var rentedContainer = dataCached.rentedContainer || {};
                    var signedContainer = dataCached.signedContainer || {};
                    if (dataCached.shopHistorySummary) {
                        if (dataCached.shopHistorySummary.usedAmount) result.shopHistorySummary.usedAmount = dataCached.shopHistorySummary.usedAmount;
                        if (dataCached.shopHistorySummary.quantityOfBorrowingFromDiffPlace) result.shopHistorySummary.quantityOfBorrowingFromDiffPlace = dataCached.shopHistorySummary.quantityOfBorrowingFromDiffPlace;
                    }
                    var usedTime = [];
                    var usedTime_recent = [];

                    var success = tradeList.every(function (aTrade) {
                        try {
                            var containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
                            lastUsed[aTrade.container.id] = {
                                time: aTrade.tradeTime.valueOf(),
                                action: aTrade.tradeType.action
                            };
                            if (aTrade.tradeType.action === "Sign") {
                                signedContainer[containerKey] = {
                                    time: aTrade.tradeTime.valueOf(),
                                    storeID: aTrade.newUser.storeID
                                };
                            } else if (aTrade.tradeType.action === "Rent") {
                                rentedContainer[containerKey] = {
                                    time: aTrade.tradeTime.valueOf()
                                };
                            } else if (aTrade.tradeType.action === "Return") {
                                var recent = aTrade.tradeTime > thisWeekCheckpoint;
                                result.shopHistorySummary.usedAmount++;
                                if (recent) {
                                    result.shopRecentHistorySummary.usedAmount++;
                                }
                                if (rentedContainer[containerKey]) {
                                    var duration = aTrade.tradeTime - rentedContainer[containerKey].time;
                                    usedTime.push({
                                        time: aTrade.tradeTime.valueOf(),
                                        duration
                                    });
                                    if (recent) {
                                        usedTime_recent.push(duration);
                                    } else {
                                        delete rentedContainer[containerKey];
                                    }
                                }
                                if (aTrade.newUser.storeID !== signedContainer[containerKey].storeID) {
                                    result.shopHistorySummary.quantityOfBorrowingFromDiffPlace++;
                                    if (recent) {
                                        result.shopRecentHistorySummary.quantityOfBorrowingFromDiffPlace++;
                                    } else {
                                        delete signedContainer[containerKey];
                                    }
                                }
                            }
                            return true;
                        } catch (error) {
                            redis.del(CACHE.index);
                            debugError(error);
                            return false;
                        }
                    });

                    if (!success) return res.redirect(301, baseUrl + "/index");

                    for (var containerID in lastUsed) {
                        var timeToNow = now - lastUsed[containerID].time;
                        if ((lastUsed[containerID].action === "Sign" || lastUsed[containerID].action === "Return") &&
                            timeToNow >= MILLISECONDS_OF_LOST_CONTAINER_SHOP) {
                            result.shopHistorySummary.shopLostAmount++;
                        } else if (lastUsed[containerID].action === "Rent" && timeToNow >= MILLISECONDS_OF_LOST_CONTAINER_CUSTOMER) {
                            result.shopHistorySummary.customerLostAmount++;
                            if (lastUsed[containerID].time > thisWeekCheckpoint)
                                result.shopRecentHistorySummary.customerLostAmount++;
                        }
                    }

                    var totalUsedTime = usedTime.reduce((a, b) => (a + b.duration), 0);
                    var usedTimeWeight = usedTime.length;
                    if (dataCached.usedTime) {
                        if (dataCached.usedTime.total) totalUsedTime += dataCached.usedTime.total;
                        if (dataCached.usedTime.weight) usedTimeWeight += dataCached.usedTime.weight;
                    }
                    result.shopHistorySummary.totalDuration = totalUsedTime / usedTimeWeight;
                    var recentTotalDuration = usedTime_recent.reduce((a, b) => (a + b), 0) / usedTime_recent.length;
                    result.shopRecentHistorySummary.totalDuration = (isNaN(recentTotalDuration) || recentTotalDuration === null) ? 0 : recentTotalDuration;

                    res.json(result);

                    if (Object.keys(dataCached).length === 0 || (now - dataCached.cachedAt) > MILLISECONDS_OF_A_DAY) {
                        var timestamp = thisWeekCheckpoint;
                        var historyUsedTimeArr = usedTime.filter(ele => ele.time < thisWeekCheckpoint);
                        var toCache = {
                            timestamp,
                            cachedAt: Date.now(),
                            lastUsed,
                            rentedContainer,
                            signedContainer,
                            shopHistorySummary: {
                                usedAmount: result.shopHistorySummary.usedAmount - result.shopRecentHistorySummary.usedAmount,
                                quantityOfBorrowingFromDiffPlace: result.shopHistorySummary.quantityOfBorrowingFromDiffPlace - result.shopRecentHistorySummary.quantityOfBorrowingFromDiffPlace
                            },
                            usedTime: {
                                total: historyUsedTimeArr.reduce((a, b) => (a + b.duration), 0),
                                weight: historyUsedTimeArr.length
                            }
                        };
                        if (dataCached.usedTime) {
                            if (dataCached.usedTime.total) toCache.usedTime.total += dataCached.usedTime.total;
                            if (dataCached.usedTime.weight) toCache.usedTime.weight += dataCached.usedTime.weight;
                        }
                        redis.set(CACHE.index, JSON.stringify(toCache), (err, reply) => {
                            if (err) return debugError(CACHE.index, err);
                            if (reply != "OK") return debugError(CACHE.index, reply);
                            debug("[" + CACHE.index + "] Cached!");
                        });
                    }
                });
            });
        });
    });
});

router.get('/search', regAsAdminManager, validateRequest, function (req, res, next) {
    var fields = req.query.fields.split(",");
    var searchTxt = req.query.txt;
    var txtArr = searchTxt.split(" ").filter(ele => ele !== "");
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
                delivery: { // 待更新
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
                    switch (fieldName) {
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
    }, function (err, activeStoreList) {
        if (err) return next(err);
        var storeIdDict = {};
        activeStoreList.forEach(function (aStoreData) {
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
                '$in': ['Sign', 'Rent', 'ReadyToClean', 'UndoReadyToClean']
            }
        };

        redis.get(CACHE.shop, (err, reply) => {
            if (err) return next(err);
            var dataCached = {};
            if (reply !== null) dataCached = JSON.parse(reply);

            if (dataCached.activeStoreNameList) {
                for (var aCachedStoreIndex in activeStoreList) {
                    var aCachedStoreName = activeStoreList[aCachedStoreIndex].name;
                    if (dataCached.activeStoreNameList.indexOf(aCachedStoreName) === -1) {
                        debug("[" + CACHE.shop + "] New Store(" + aCachedStoreName + ")! Start Cache Refresh!");
                        dataCached = {};
                        break;
                    }
                }
            }
            if (dataCached.timestamp)
                tradeQuery.tradeTime = {
                    '$gte': new Date(dataCached.timestamp)
                };

            Trade.find(tradeQuery, {}, {
                sort: {
                    tradeTime: 1
                }
            }, function (err, tradeList) {
                if (err) return next(err);

                cleanUndo('ReadyToClean', tradeList);

                var usedContainer = dataCached.usedContainer || {};
                var unusedContainer = dataCached.unusedContainer || {};
                tradeList.forEach(function (aTrade) {
                    var containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
                    if (aTrade.tradeType.action === "Sign" && storeIdDict[aTrade.newUser.storeID]) {
                        unusedContainer[containerKey] = {
                            time: aTrade.tradeTime.valueOf(),
                            storeID: aTrade.newUser.storeID
                        };
                    } else if ((aTrade.tradeType.action === "Rent" || aTrade.tradeType.action === "ReadyToClean") && unusedContainer[containerKey]) {
                        if (aTrade.tradeType.action === "Rent" || (aTrade.tradeType.action === "ReadyToClean" && aTrade.tradeType.oriState === 3)) {
                            usedContainer[containerKey] = {
                                time: aTrade.tradeTime.valueOf(),
                                storeID: unusedContainer[containerKey].storeID
                            };
                        }
                        delete unusedContainer[containerKey];
                    }
                });

                for (let unusedContainerRecord in unusedContainer) {
                    if (storeIdDict.hasOwnProperty(unusedContainer[unusedContainerRecord].storeID))
                        storeIdDict[unusedContainer[unusedContainerRecord].storeID].toUsedAmount++;
                    else
                        delete unusedContainer[unusedContainerRecord];
                }

                var weeklyAmountByStore = {};
                var weekCheckpoint = getWeekCheckpoint(new Date(Object.entries(usedContainer)[0][1].time));
                var todayCheckpoint = dateCheckpoint(0);
                for (var usedContainerKey in usedContainer) {
                    var usedContainerRecord = usedContainer[usedContainerKey];
                    if (storeIdDict.hasOwnProperty(usedContainerRecord.storeID)) {
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
                    } else {
                        delete usedContainer[usedContainerKey];
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

                if (Object.keys(dataCached).length === 0 || (now - dataCached.cachedAt) > MILLISECONDS_OF_A_DAY) {
                    activeStoreNameList = activeStoreList.map(ele => ele.name);
                    var timestamp = now - MILLISECONDS_OF_A_WEEK;
                    var toCache = {
                        timestamp,
                        cachedAt: Date.now(),
                        usedContainer,
                        unusedContainer,
                        activeStoreNameList
                    };
                    redis.set(CACHE.shop, JSON.stringify(toCache), (err, reply) => {
                        if (err) return debugError(CACHE.shop, err);
                        if (reply != "OK") return debugError(CACHE.shop, reply);
                        debug("[" + CACHE.shop + "] Cached!");
                    });
                }
            });
        });
    });
});

router.get('/shopDetail', regAsAdminManager, validateRequest, function (req, res, next) {
    if (!req.query.id) return res.status(404).end();
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
            weekAmountPercentage: 0.0,
            totalAmount: 0,
            joinedDate: theStore.createdAt,
            contactNickname: "店長", // Need Update
            contactPhone: "0988555666", // Need Update
            weekAverage: 0,
            shopLostAmount: 0,
            customerLostAmount: 0,
            history: [],
            chartData: [
                ["週", "數量"]
            ]
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

        var cacheKey = CACHE.shopDetail + ":" + STORE_ID.toString();
        redis.get(cacheKey, (err, reply) => {
            if (err) return next(err);
            var dataCached = {};
            if (reply !== null) dataCached = JSON.parse(reply);

            if (dataCached.timestamp)
                tradeQuery.tradeTime = {
                    '$gte': new Date(dataCached.timestamp)
                };

            Trade.find(tradeQuery, {}, {
                sort: {
                    tradeTime: 1
                }
            }, function (err, tradeList) {
                if (err) return next(err);

                cleanUndo(['Return', 'ReadyToClean'], tradeList);

                var lastUsed = dataCached.lastUsed || {};
                var usedContainer = dataCached.usedContainer || {};
                var unusedContainer = dataCached.unusedContainer || {};
                result.history = dataCached.history || [];
                tradeList.forEach(function (aTrade) {
                    var containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
                    lastUsed[aTrade.container.id] = {
                        time: aTrade.tradeTime.valueOf(),
                        action: aTrade.tradeType.action
                    };
                    if (aTrade.tradeType.action === "Sign") {
                        unusedContainer[containerKey] = {
                            time: aTrade.tradeTime.valueOf(),
                            storeID: aTrade.newUser.storeID
                        };
                    } else if ((aTrade.tradeType.action === "Rent" || aTrade.tradeType.action === "ReadyToClean") && containerKey in unusedContainer) {
                        if (aTrade.tradeType.action === "Rent" || (aTrade.tradeType.action === "ReadyToClean" && aTrade.tradeType.oriState === 3)) {
                            usedContainer[containerKey] = {
                                time: aTrade.tradeTime.valueOf(),
                                storeID: unusedContainer[containerKey].storeID
                            };
                        }
                        delete unusedContainer[containerKey];
                    }
                    if (aTrade.tradeType.action === "Sign") {
                        if (result.history[0] && result.history[0].time.valueOf() === aTrade.tradeTime.valueOf() && BOXID.test(result.history[0].action) &&
                            result.history[0].action.match(BOXID)[1] == aTrade.container.box) {
                            addContent(result.history[0], aTrade);
                        } else {
                            result.history.unshift({
                                time: aTrade.tradeTime,
                                action: "簽收 [BOX #" + aTrade.container.box + "]",
                                content: {
                                    [aTrade.container.typeCode]: 1
                                },
                                contentDetail: {
                                    [aTrade.container.typeCode]: ["#" + aTrade.container.id]
                                },
                                owner: theStore.name,
                                by: aTrade.newUser.name || phoneEncoder(aTrade.newUser.phone)
                            });
                        }
                    } else if (aTrade.tradeType.action === "Rent") {
                        if (result.history[0] && result.history[0].time.valueOf() === aTrade.tradeTime.valueOf() && result.history[0].action === "借出") {
                            addContent(result.history[0], aTrade);
                        } else {
                            result.history.unshift({
                                time: aTrade.tradeTime,
                                action: "借出",
                                content: {
                                    [aTrade.container.typeCode]: 1
                                },
                                contentDetail: {
                                    [aTrade.container.typeCode]: ["#" + aTrade.container.id]
                                },
                                owner: phoneEncoder(aTrade.newUser.phone),
                                by: aTrade.oriUser.name || phoneEncoder(aTrade.oriUser.phone)
                            });
                        }
                    } else if (aTrade.tradeType.action === "Return") {
                        if (result.history[0] && result.history[0].time.valueOf() === aTrade.tradeTime.valueOf() && result.history[0].action === "歸還") {
                            addContent(result.history[0], aTrade);
                        } else {
                            result.history.unshift({
                                time: aTrade.tradeTime,
                                action: "歸還",
                                content: {
                                    [aTrade.container.typeCode]: 1
                                },
                                contentDetail: {
                                    [aTrade.container.typeCode]: ["#" + aTrade.container.id]
                                },
                                owner: theStore.name,
                                by: aTrade.newUser.name || phoneEncoder(aTrade.newUser.phone)
                            });
                        }
                    }
                });

                var containerType = req.app.get('containerType');
                for (var index in result.history) {
                    var theHistory = result.history[index];
                    if (typeof theHistory.content === "object") {
                        var contentTxt = "";
                        for (var aContent in theHistory.content) {
                            if (contentTxt !== "") contentTxt += "、";
                            contentTxt += `${containerType[aContent].name} x ${theHistory.content[aContent]}`;
                        }
                        theHistory.content = contentTxt;
                    }
                    if (typeof theHistory.contentDetail === "object") {
                        var contentDetailTxt = "";
                        for (var aContentDetail in theHistory.contentDetail) {
                            if (contentDetailTxt !== "") contentDetailTxt += "\n\n";
                            contentDetailTxt += `${containerType[aContentDetail].name}\n${theHistory.contentDetail[aContentDetail].join("、")}`;
                        }
                        theHistory.contentDetail = contentDetailTxt;
                    }
                }

                var now = Date.now();
                for (var containerID in lastUsed) {
                    var timeToNow = now - lastUsed[containerID].time;
                    if ((lastUsed[containerID].action === "Sign" || lastUsed[containerID].action === "Return") &&
                        timeToNow >= MILLISECONDS_OF_LOST_CONTAINER_SHOP) {
                        result.shopLostAmount++;
                    } else if (lastUsed[containerID].action === "Rent" && timeToNow >= MILLISECONDS_OF_LOST_CONTAINER_CUSTOMER) {
                        result.customerLostAmount++;
                    }
                }

                result.toUsedAmount = Object.keys(unusedContainer).length;
                result.totalAmount = Object.keys(usedContainer).length;
                if (result.totalAmount !== 0) {
                    var weeklyAmount = {};
                    var weekCheckpoint = getWeekCheckpoint(new Date(Object.entries(usedContainer)[0][1].time));
                    var todayCheckpoint = dateCheckpoint(0);
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
                    }

                    while (now - weekCheckpoint >= MILLISECONDS_OF_A_WEEK) {
                        weekCheckpoint.setDate(weekCheckpoint.getDate() + 7);
                        weeklyAmount[weekCheckpoint] = 0;
                    }

                    result.weekAmount = weeklyAmount[weekCheckpoint];
                    delete weeklyAmount[weekCheckpoint];
                    var arrOfWeeklyUsageOfThisStore = Object.values(weeklyAmount);
                    var weights = arrOfWeeklyUsageOfThisStore.length;
                    var weeklySum = arrOfWeeklyUsageOfThisStore.reduce((a, b) => (a + b), 0);
                    result.weekAverage = Math.round(weeklySum / weights);
                    result.weekAmountPercentage = (result.weekAmount - result.weekAverage) / result.weekAverage;

                    result.chartData = result.chartData.concat(Object.entries(weeklyAmount));
                }

                res.json(result);

                if (Object.keys(dataCached).length === 0 || (now - dataCached.cachedAt) > MILLISECONDS_OF_A_DAY) {
                    var timestamp = now - MILLISECONDS_OF_A_WEEK;
                    var toCache = {
                        timestamp,
                        cachedAt: Date.now(),
                        lastUsed,
                        usedContainer,
                        unusedContainer,
                        history: result.history
                    };
                    redis.set(cacheKey, JSON.stringify(toCache), (err, reply) => {
                        if (err) return debugError(cacheKey, err);
                        if (reply != "OK") return debugError(cacheKey, reply);
                        debug("[" + cacheKey + "] Cached!");
                        redis.expire(cacheKey, MILLISECONDS_OF_A_WEEK * 2, (err, reply) => {
                            if (err) return debugError(err);
                            if (reply !== 1) return debugError(reply);
                        });
                    });
                }
            });
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
    User.find({
        "role.typeCode": {
            "$ne": "bot"
        }
    }, (err, userList) => {
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

        var tradeQuery = {
            "tradeType.action": {
                "$in": ["Rent", "Return", 'UndoReturn']
            }
        };

        redis.get(CACHE.user, (err, reply) => {
            if (err) return next(err);
            var dataCached = {};
            if (reply !== null) dataCached = JSON.parse(reply);

            if (dataCached.timestamp)
                tradeQuery.tradeTime = {
                    '$gte': new Date(dataCached.timestamp)
                };

            if (Object.keys(dataCached).length !== 0) {
                Object.assign(userDict, dataCached.userDict);
                Object.assign(userUsingDict, dataCached.userUsingDict);
                result.totalUsageAmount = dataCached.totalUsageAmount;
            }

            Trade.find(tradeQuery, (err, tradeList) => {
                if (err) return next(err);
                tradeList.sort((a, b) => (a.tradeTime - b.tradeTime));
                cleanUndo("Return", tradeList);

                var containerKey;
                var weeklyAmount = dataCached.weeklyAmount || {};
                var weekCheckpoint = dataCached.weekCheckpoint ? new Date(dataCached.weekCheckpoint) : null;
                var recentTotalUsageAmount = 0;
                const now = Date.now();
                if (weekCheckpoint) weeklyAmount[weekCheckpoint] = 0;

                tradeList.forEach(aTrade => {
                    containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
                    if (aTrade.tradeType.action === "Rent") {
                        userUsingDict[aTrade.newUser.phone][containerKey] = {
                            time: aTrade.tradeTime.valueOf()
                        };
                        userDict[aTrade.newUser.phone].totalUsageAmount++;
                    } else {
                        if (!weekCheckpoint) {
                            weekCheckpoint = getWeekCheckpoint(aTrade.tradeTime);
                            if (!weeklyAmount[weekCheckpoint]) weeklyAmount[weekCheckpoint] = 0;
                        }
                        while (aTrade.tradeTime - weekCheckpoint >= MILLISECONDS_OF_A_WEEK) {
                            weekCheckpoint.setDate(weekCheckpoint.getDate() + 7);
                            if (!weeklyAmount[weekCheckpoint]) weeklyAmount[weekCheckpoint] = 0;
                        }
                        if (aTrade.tradeTime >= weekCheckpoint) weeklyAmount[weekCheckpoint]++;
                        result.totalUsageAmount++;
                        if (now - aTrade.tradeTime <= MILLISECONDS_OF_A_WEEK) recentTotalUsageAmount++;
                        if (aTrade.tradeType.oriState === 2 && userUsingDict[aTrade.oriUser.phone][containerKey])
                            delete userUsingDict[aTrade.oriUser.phone][containerKey];
                    }
                });

                for (var aUser in userUsingDict) {
                    userDict[aUser].lostAmount = 0;
                    userDict[aUser].usingAmount = 0;
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
                    if (!weeklyAmount[weekCheckpoint]) weeklyAmount[weekCheckpoint] = 0;
                }

                result.list = Object.values(userDict);
                result.totalUserAmount = userList.length;
                delete weeklyAmount[weekCheckpoint];
                var arrOfWeeklyAmount = Object.values(weeklyAmount);
                result.weeklyAverageUsage = Math.round(arrOfWeeklyAmount.reduce((a, b) => (a + b), 0) / arrOfWeeklyAmount.length);

                res.json(result);

                if (Object.keys(dataCached).length === 0 || (now - dataCached.cachedAt) > MILLISECONDS_OF_A_DAY) {
                    var timestamp = now - MILLISECONDS_OF_A_WEEK;
                    var toCache = {
                        timestamp,
                        cachedAt: Date.now(),
                        userDict,
                        userUsingDict,
                        weeklyAmount,
                        weekCheckpoint,
                        totalUsageAmount: result.totalUsageAmount - recentTotalUsageAmount
                    };
                    redis.set(CACHE.user, JSON.stringify(toCache), (err, reply) => {
                        if (err) return debugError(CACHE.user, err);
                        if (reply != "OK") return debugError(CACHE.user, reply);
                        debug("[" + CACHE.user + "] Cached!");
                    });
                }
            });
        });
    });
});

router.get('/userDetail', regAsAdminManager, validateRequest, function (req, res, next) {
    if (!req.query.id) return res.status(404).end();
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
            joinedDate: theUser.registerTime,
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
            result.recentAmount = weeklyAmount[weekCheckpoint] || 0;
            delete weeklyAmount[weekCheckpoint];
            var arrOfWeeklyAmount = Object.values(weeklyAmount);
            result.weekAverage = Math.round(arrOfWeeklyAmount.reduce((a, b) => (a + b), 0) / arrOfWeeklyAmount.length) || 0;
            result.recentAmountPercentage = ((result.recentAmount - result.weekAverage) / result.weekAverage) || 0;
            res.json(result);
        });
    });
});

router.get('/container', regAsAdminManager, validateRequest, function (req, res, next) {
    Container.find((err, containerList) => {
        if (err) return next(err);
        Box.find({
            'stocking': true
        }, (err, stockedBoxList) => {
            if (err) return next(err);

            var stockedContainerList = [];
            stockedBoxList.forEach(aBox => {
                stockedContainerList = stockedContainerList.concat(aBox.containerList);
            });
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
                    inStorageAmount: 0,
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
                        typeDict[aContainer.typeCode].toCleanAmount++;
                        break;
                    case 5: // boxed
                        if (stockedContainerList.indexOf(aContainer.ID) !== -1)
                            typeDict[aContainer.typeCode].inStorageAmount++;
                        else
                            typeDict[aContainer.typeCode].toDeliveryAmount++;
                        break;
                }
            });
            res.json({
                list: Object.values(typeDict)
            });
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
    if (!req.query.id) return res.status(404).end();
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
                    action: actionTxtDict[aTrade.tradeType.action] + (typeof aTrade.container.box !== "undefined" ? ` [#box${aTrade.container.box}]` : ""),
                    newUser: phoneEncoder(aTrade.newUser.phone),
                    oriUser: phoneEncoder(aTrade.oriUser.phone),
                    comment: ""
                });
            });
            res.json(result);
        });
    });
});

router.get('/console', regAsAdminManager, validateRequest, function (req, res, next) {
    res.json({});
});

const isPhone = /09[0-9]{8}/;

function phoneEncoder(phone, expose = false) {
    if (isPhone.test(phone))
        return phone.slice(0, 4) + (expose ? ("-" + phone.slice(4, 7) + "-") : "-***-") + phone.slice(7, 10);
    else
        return phone;
}

function addContent(lastHistory, newHistory) {
    if (lastHistory.content[newHistory.container.typeCode])
        lastHistory.content[newHistory.container.typeCode]++;
    else
        lastHistory.content[newHistory.container.typeCode] = 1;
    if (lastHistory.contentDetail[newHistory.container.typeCode])
        lastHistory.contentDetail[newHistory.container.typeCode].push("#" + newHistory.container.id);
    else
        lastHistory.contentDetail[newHistory.container.typeCode] = ["#" + newHistory.container.id];
}

router.patch('/refresh/store', regAsAdminManager, validateRequest, function (req, res, next) {
    refreshStore(req.app, function (err) {
        if (err) return next(err);
        res.status(200).end("Done");
    });
});

router.patch('/refresh/container', regAsAdminManager, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    refreshContainer(req.app, dbAdmin, function (err) {
        if (err) return next(err);
        res.status(200).end("Done");
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