const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('manager');
const redis = require("../models/redis");

const SocketNamespace = require('../controllers/socket').namespace;
const generateSocketToken = require('../controllers/socket').generateToken;

const validateRequest = require('../middlewares/validation/validateRequest').JWT;
const regAsAdminManager = require('../middlewares/validation/validateRequest').regAsAdminManager;
const regAsBot = require('../middlewares/validation/validateRequest').regAsBot;
const refreshStore = require('../helpers/tasks').refreshStore;
const refreshStoreImg = require('../helpers/tasks').refreshStoreImg;
const refreshContainer = require('../helpers/tasks').refreshContainer;
const refreshActivity = require('../helpers/tasks').refreshActivity;
const refreshCoupon = require('../helpers/tasks').refreshCoupon;
const refreshCouponImage = require('../helpers/tasks').refreshCouponImage;
const refreshContainerIcon = require('../helpers/tasks').refreshContainerIcon;
const cleanUndo = require('../helpers/toolkit').cleanUndoTrade;
const dateCheckpoint = require('../helpers/toolkit').dateCheckpoint;
const fullDateString = require('../helpers/toolkit').fullDateString;
const getWeekCheckpoint = require('../helpers/toolkit').getWeekCheckpoint;
const updateSummary = require("../helpers/gcp/sheet").updateSummary;
const summaryReport = require('../helpers/summaryReport/viewFormat/googleSheet/handler');

const Box = require('../models/DB/boxDB');
const User = require('../models/DB/userDB');
const Store = require('../models/DB/storeDB');
const Trade = require('../models/DB/tradeDB');
const Container = require('../models/DB/containerDB');
const DataCacheFactory = require("../models/dataCacheFactory");

const {
    validateCreateApiContent,
    fetchBoxCreation
} = require('../middlewares/validation/deliveryList/contentValidation.js')

const MILLISECONDS_OF_A_WEEK = 1000 * 60 * 60 * 24 * 7;
const MILLISECONDS_OF_A_DAY = 1000 * 60 * 60 * 24;
const MILLISECONDS_OF_LOST_CONTAINER_SHOP = MILLISECONDS_OF_A_DAY * 31;
const MILLISECONDS_OF_LOST_CONTAINER_CUSTOMER = MILLISECONDS_OF_A_DAY * 7;
const DEMO_CONTAINER_ID_LIST = require('../config/config').demoContainers;

const CACHE = {
    index: "manage_cache:index",
    shop: "manage_cache:shop",
    shopDetail: "manage_cache:shopDetail",
    user: "manage_cache:user"
};

const BOXID = /簽收 \[BOX #(\d*)\]/i;
const baseUrl = require("../config/config").serverBaseUrl + "/manager";

router.get('/socketToken', regAsAdminManager, validateRequest, generateSocketToken(SocketNamespace.SERVER_EVENT));


/**
 * @apiName Manage index
 * @apiGroup Manage
 *
 * @api {get} /manage/index Get manage index
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            summary: {
                userAmount: Number,
                storeAmount: Number,
                activityAmount: Number 
            },
            activityHistorySummary: { 
                usedAmount: Number,
                lostAmount: Number,
                totalDuration: Number
            },
            shopRecentHistorySummary: {
                usedAmount: Number,
                customerLostAmount: Number,
                totalDuration: Number,
                quantityOfBorrowingFromDiffPlace: Number
            },
            shopHistorySummary: {
                usedAmount: Number,
                shopLostAmount: Number,
                customerLostAmount: Number,
                totalDuration: Number,
                quantityOfBorrowingFromDiffPlace: Number
            }
        }
 * 
 */
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
                                if (signedContainer[containerKey] && (aTrade.newUser.storeID !== signedContainer[containerKey].storeID)) {
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
                            debug.error(error);
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
                            if (err) return debug.error(CACHE.index, err);
                            if (reply != "OK") return debug.error(CACHE.index, reply);
                            debug.log("[" + CACHE.index + "] Cached!");
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
        }).sort({
            "ID": 1
        })
    };
    Promise
        .all(
            fields.map(aField => new Promise((resolve, reject) => {
                if (fieldDict.hasOwnProperty(aField))
                    fieldDict[aField].exec((err, dataList) => {
                        if (err) return reject(err);
                        else return resolve([aField, dataList]);
                    });
                else resolve([aField, []]);
            })))
        .then((data) => {
            var containerDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
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

/**
 * @apiName Manage shop
 * @apiGroup Manage
 *
 * @api {get} /manage/shop Get shop
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            list:
            [ 
                { 
                    id: Number, //storeID
                    storeName: String,
                    toUsedAmount: Number,
                    todayAmount: Number,
                    weekAmount: Number,
                    weekAverage: Number },
                ...
                ]
        }
 * 
 */
router.get('/shop', regAsAdminManager, validateRequest, function (req, res, next) {
    Store.find({
        active: true
    }, function (err, activeStoreList) {
        if (err) return next(err);
        var storeIdDict = {};
        var lastUsed = {};
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

        Container.find({
            'active': true
        }, function (err, containers) {
            if (typeof containers !== 'undefined') {
                for (let container of containers) {
                    if (container.storeID || container.storeID === 0) {
                        if (!lastUsed[container.storeID]) lastUsed[container.storeID] = {};
                        if (!lastUsed[container.storeID][container.ID]) lastUsed[container.storeID][container.ID] = {
                            time: container.lastUsedAt.valueOf(),
                            status: container.statusCode
                        };
                    }
                }
                let now = Date.now();
                for (var i in containers) {
                    if (containers[i].storeID || containers[i].storeID === 0) {
                        var timeToNow = now - lastUsed[containers[i].storeID][containers[i].ID].time;
                        tmpTypeCode = containers[i].typeCode;
                        if ((containers[i].statusCode === 1 || DEMO_CONTAINER_ID_LIST.indexOf(containers[i].ID) !== -1) && timeToNow < MILLISECONDS_OF_LOST_CONTAINER_SHOP) {
                            if (storeIdDict[String(containers[i].storeID)]) {
                                storeIdDict[String(containers[i].storeID)]['toUsedAmount']++;
                            }
                        }
                    }
                }
            }

            redis.get(CACHE.shop, (err, reply) => {
                if (err) return next(err);
                let dataCached = {};
                if (reply !== null) dataCached = JSON.parse(reply);

                if (dataCached.activeStoreNameList) {
                    for (var aCachedStoreIndex in activeStoreList) {
                        var aCachedStoreName = activeStoreList[aCachedStoreIndex].name;
                        if (dataCached.activeStoreNameList.indexOf(aCachedStoreName) === -1) {
                            debug.log("[" + CACHE.shop + "] New Store(" + aCachedStoreName + ")! Start Cache Refresh!");
                            dataCached = {};
                            break;
                        }
                    }
                }
                if (dataCached.timestamp)
                    tradeQuery.tradeTime = {
                        '$gt': new Date(dataCached.timestamp)
                    };

                Trade.find(tradeQuery, {}, {
                    sort: {
                        tradeTime: 1
                    }
                }, function (err, tradeList) {
                    if (err) return next(err);

                    cleanUndo('ReadyToClean', tradeList);

                    let usedContainer = dataCached.usedContainer || {};
                    let unusedContainer = dataCached.unusedContainer || {};
                    for (let aTrade of tradeList) {
                        let containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
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
                    }
                    for (let unusedContainerRecord in unusedContainer) {
                        if (storeIdDict.hasOwnProperty(unusedContainer[unusedContainerRecord].storeID)) {} else
                            delete unusedContainer[unusedContainerRecord];
                    }

                    let weeklyAmountByStore = {};
                    let weekCheckpoint = getWeekCheckpoint(new Date(Object.entries(usedContainer)[0][1].time));
                    let todayCheckpoint = dateCheckpoint(0);

                    for (let usedContainerKey of Object.keys(usedContainer)) {
                        let usedContainerRecord = usedContainer[usedContainerKey];

                        if (storeIdDict.hasOwnProperty(usedContainerRecord.storeID)) {
                            if (!weeklyAmountByStore[usedContainerRecord.storeID]) {
                                weeklyAmountByStore[usedContainerRecord.storeID] = {};
                                weeklyAmountByStore[usedContainerRecord.storeID][weekCheckpoint] = 0;
                            }
                            while (usedContainerRecord.time - weekCheckpoint >= MILLISECONDS_OF_A_WEEK) {
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
                        var activeStoreNameList = activeStoreList.map(ele => ele.name);
                        var timestamp = now - MILLISECONDS_OF_A_WEEK;
                        var toCache = {
                            timestamp,
                            cachedAt: Date.now(),
                            usedContainer,
                            unusedContainer,
                            activeStoreNameList
                        };
                        redis.set(CACHE.shop, JSON.stringify(toCache), (err, reply) => {
                            if (err) return debug.error(CACHE.shop, err);
                            if (reply != "OK") return debug.error(CACHE.shop, reply);
                            debug.log("[" + CACHE.shop + "] Cached!");
                        });
                    }
                });
            });
        });
    });
});

/**
 * @apiName Manage shop detail
 * @apiGroup Manage
 *
 * @api {get} /manage/shopDetail/byCustomer?id={shopid} Get shop detail
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            storeName: String,
            customersDetail:[
                {
                    phone: String,
                    usedAmount: Number,
                    lostAmount: Number
                }
            ]
        }
 * 
 */

router.get('/shopDetail/byCustomer', regAsAdminManager, validateRequest, function (req, res, next) {
    if (!req.query.id) return res.status(404).end();
    const STORE_ID = parseInt(req.query.id);
    Store.findOne({
        id: STORE_ID
    }, function (err, theStore) {
        if (err) return next(err);
        var result = {
            storeName: theStore.name,
            customersDetail: []
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

        Trade.find(tradeQuery, {}, {
            sort: {
                tradeTime: 1
            }
        }, function (err, tradeList) {
            if (err) return next(err);

            cleanUndo(['Return', 'ReadyToClean'], tradeList);

            var lastUsed = {};
            var usedContainer = {};
            var unusedContainer = {};

            tradeList.forEach(function (aTrade) {
                var containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
                lastUsed[aTrade.container.id] = {
                    newUser: aTrade.newUser.phone,
                    oriUser: aTrade.oriUser.phone,
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
                            user: aTrade.newUser.phone,
                            time: aTrade.tradeTime.valueOf(),
                            storeID: unusedContainer[containerKey].storeID
                        };
                        if (result.customersDetail.every(element => {
                                if (element.phone === aTrade.newUser.phone) element.usedAmount++;
                                return element.phone !== aTrade.newUser.phone
                            })) {
                            let customerDetail = {
                                phone: aTrade.newUser.phone,
                                usedAmount: 1,
                                lostAmount: 0
                            }
                            result.customersDetail.push(customerDetail)
                        }
                    }
                    delete unusedContainer[containerKey];
                }
            });

            var now = Date.now();
            for (var containerID in lastUsed) {
                var timeToNow = now - lastUsed[containerID].time;
                if (lastUsed[containerID].action === "Rent" && timeToNow >= MILLISECONDS_OF_LOST_CONTAINER_CUSTOMER) {
                    if (result.customersDetail.every(element => {
                            if (element.phone === lastUsed[containerID].newUser) element.lostAmount++;
                            return element.phone !== lastUsed[containerID].newUser
                        })) {
                        let customerDetail = {
                            phone: lastUsed[containerID].newUser,
                            usedAmount: 0,
                            lostAmount: 1
                        }
                        result.customersDetail.push(customerDetail)
                    }
                }
            }
            res.json(result);
        });
    });
});

/**
 * @apiName Manage shop detail
 * @apiGroup Manage
 *
 * @api {get} /manage/shopDetail?id={shopid} Get shop detail
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            storeName: String,
            toUsedAmount: Number,
            todayAmount: Number,
            weekAmount: Number,
            weekAmountPercentage: Float,
            totalAmount: Number,
            joinedDate: Date,
            contactNickname: String,
            contactPhone: '09XXXXXXXX',
            weekAverage: Number,
            shopLostAmount: Number,
            customerLostAmount: Number,
            history:
            [ 
                { 
                    time: Date,
                    action: '歸還',
                    content: '野餐方碗 x 2',
                    contentDetail: '野餐方碗\n#xx01、#xx02',
                    owner: '好盒器基地',
                    by: '09xx-***-xxx' 
                },
                    ...
            ],
            chartData:
            [ 
                [ '週', '數量' ],
                [ 'Mon Dec 25 2017 16:00:00 GMT+0800 (GMT+08:00)', 8 ],
                ...
            ]
        }
 * 
 */

router.get('/shopDetail', regAsAdminManager, validateRequest, function (req, res, next) {
    if (!req.query.id) return next();
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

        var containerQuery;
        var lastUsed = {};
        if (STORE_ID === 17) {
            containerQuery = {
                "$or": [{
                        'storeID': STORE_ID,
                        'active': true
                    },
                    {
                        "ID": {
                            "$in": DEMO_CONTAINER_ID_LIST
                        }
                    }
                ]
            };
        } else {
            containerQuery = {
                'storeID': STORE_ID,
                'active': true
            };
        }
        Container.find(containerQuery, function (err, containers) {
            for (let container of containers) {
                lastUsed[container.ID] = {
                    time: container.lastUsedAt.valueOf(),
                    status: container.statusCode
                };
            }
            let now = Date.now();
            for (let containerID in lastUsed) {
                var timeToNow = now - lastUsed[containerID].time;
                if ((lastUsed[containerID].status === 1 || lastUsed[containerID].status === 3) && timeToNow >= MILLISECONDS_OF_LOST_CONTAINER_SHOP) {
                    result.shopLostAmount++;
                }
            }

            if (typeof containers !== 'undefined') {
                for (var i in containers) {
                    var timeToNow = now - lastUsed[containers[i].ID].time;
                    tmpTypeCode = containers[i].typeCode;
                    if ((containers[i].statusCode === 1 || DEMO_CONTAINER_ID_LIST.indexOf(containers[i].ID) !== -1) && timeToNow < MILLISECONDS_OF_LOST_CONTAINER_SHOP) {
                        result.toUsedAmount++;
                    }
                }
            }

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
                        '$gt': new Date(dataCached.timestamp)
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

                    var containerType = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
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
                        if (lastUsed[containerID].action === "Rent" && timeToNow >= MILLISECONDS_OF_LOST_CONTAINER_CUSTOMER) {
                            result.customerLostAmount++;
                        }
                    }

                    result.totalAmount = Object.keys(usedContainer).length;
                    if (result.totalAmount !== 0) {
                        var weeklyAmount = {};
                        var weekCheckpoint = getWeekCheckpoint(new Date(Object.entries(usedContainer)[0][1].time));
                        var todayCheckpoint = dateCheckpoint(0);
                        weeklyAmount[weekCheckpoint] = 0;
                        for (var usedContainerKey in usedContainer) {
                            var usedContainerRecord = usedContainer[usedContainerKey];
                            while (usedContainerRecord.time - weekCheckpoint >= MILLISECONDS_OF_A_WEEK) {
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
                        // delete weeklyAmount[weekCheckpoint];
                        var arrOfWeeklyUsageOfThisStore = Object.values(weeklyAmount);
                        var weights = arrOfWeeklyUsageOfThisStore.length;
                        var weeklySum = arrOfWeeklyUsageOfThisStore.reduce((a, b) => (a + b), 0);
                        result.weekAverage = Math.round(weeklySum / weights);
                        result.weekAmountPercentage = (result.weekAmount - result.weekAverage) / result.weekAverage;
                        result.chartData = result.chartData.concat(Object.entries(weeklyAmount));
                    }

                    res.json(result);

                    if (Object.keys(dataCached).length === 0 || (now - dataCached.cachedAt) > MILLISECONDS_OF_A_DAY) {
                        var timestamp = tradeList.length > 0 ? tradeList[tradeList.length - 1].tradeTime.valueOf() : (dataCached.timestamp || Date.now());
                        var toCache = {
                            timestamp,
                            cachedAt: Date.now(),
                            lastUsed,
                            usedContainer,
                            unusedContainer,
                            history: result.history
                        };
                        redis.set(cacheKey, JSON.stringify(toCache), (err, reply) => {
                            if (err) return debug.error(cacheKey, err);
                            if (reply != "OK") return debug.error(cacheKey, reply);
                            debug.log("[" + cacheKey + "] Cached!");
                            redis.expire(cacheKey, MILLISECONDS_OF_A_WEEK * 2, (err, reply) => {
                                if (err) return debug.error(err);
                                if (reply !== 1) return debug.error(reply);
                            });
                        });
                    }
                });
            });
        });
    });
});

/**
 * @apiName Manage user
 * @apiGroup Manage
 *
 * @api {get} /manage/user Get user
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            totalUserAmount: Number,
            totalUsageAmount: Number,
            weeklyAverageUsage: Number,
            totalLostAmount: Number,
            list:
            [ 
                { 
                    id: String,
                    phone: String,
                    usingAmount: Number,
                    lostAmount: Number,
                    totalUsageAmount: Number 
                },
                ...
            ]
        }
 * 
 */
router.get('/user', regAsAdminManager, validateRequest, function (req, res, next) {
    var result = {
        totalUserAmount: 0,
        totalUsageAmount: 0,
        weeklyAverageUsage: 0,
        totalLostAmount: 0,
        list: []
    };
    User.find({
        // "role.typeCode": {
        //     "$ne": "bot"
        // }
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
                    if (aTrade.tradeType.action === "Rent" && userUsingDict[aTrade.newUser.phone]) {
                        userUsingDict[aTrade.newUser.phone][containerKey] = {
                            time: aTrade.tradeTime.valueOf()
                        };
                        userDict[aTrade.newUser.phone].totalUsageAmount++;
                    } else if (aTrade.tradeType.action === "Return" && userUsingDict[aTrade.oriUser.phone]) {
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
                        if (err) return debug.error(CACHE.user, err);
                        if (reply != "OK") return debug.error(CACHE.user, reply);
                        debug.log("[" + CACHE.user + "] Cached!");
                    });
                }
            });
        });
    });
});

/**
 * @apiName Manage user detail
 * @apiGroup Manage
 *
 * @api {get} /manage/userDetail?id={userid} Get user detail
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            userPhone: String,
            usingAmount: Number,
            lostAmount: Number,
            totalUsageAmount: Number,
            joinedDate: Date,
            joinedMethod: '店鋪 (方糖咖啡)',
            recentAmount: Number,
            recentAmountPercentage: Number,
            weekAverage: Number,
            averageUsingDuration: Number,
            amountOfBorrowingFromDiffPlace: Number,
            history:
            [ 
                { 
                    containerType: String,
                    containerID: String,
                    rentTime: Date,
                    rentPlace: String,
                    returnTime: Date,
                    returnPlace: String,
                    usingDuration: Number 
                },... 
            ] 
        }
 * 
 */
router.get('/userDetail', regAsBot, regAsAdminManager, validateRequest, function (req, res, next) {
    if (!req.query.id) return res.status(404).end();
    const USER_ID = req.query.id;
    var containerDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_WITH_DEACTIVE);
    var storeDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    User.findOne({
        'user.phone': USER_ID
    }, (err, theUser) => {
        if (err || !theUser) return next(err);
        var result = {
            userPhone: phoneEncoder(theUser.user.phone, true),
            userLineToken: theUser.user.lineId,
            usingAmount: 0,
            lostAmount: 0,
            totalUsageAmount: 0,
            contribution: {
                tree: 0.0,
                water: 0.0,
                co2: 0.0
            },
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

            result.contribution.tree = result.totalUsageAmount * 0.0004;
            result.contribution.water = result.totalUsageAmount * 0.9;
            result.contribution.co2 = result.totalUsageAmount * 0.1;

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

/**
 * @apiName Manage container
 * @apiGroup Manage
 *
 * @api {get} /manage/container Get container
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            list:
            [ 
                { 
                    id: Number,
                    type: '12oz 玻璃杯',
                    totalAmount: Number,
                    toUsedAmount: Number,
                    usingAmount: Number,
                    returnedAmount: Number,
                    toCleanAmount: Number,
                    toDeliveryAmount: Number,
                    toSignAmount: Number,
                    inStorageAmount: Number,
                    lostAmount: Number 
                },
                ...
            ]
        }
 * 
 */
router.get('/container', regAsAdminManager, validateRequest, function (req, res, next) {
    Container.find({
        'active': true
    }, (err, containerList) => {
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
            var containerType = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
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
    "UnSign": "取消簽收",
    "Rent": "借出",
    "Return": "歸還",
    "UndoReturn": "取消歸還",
    "ReadyToClean": "回收",
    "UndoReadyToClean": "取消回收",
    "Boxing": "裝箱",
    "Unboxing": "取消裝箱"
};

/**
 * @apiName Manage container detail
 * @apiGroup Manage
 *
 * @api {get} /manage/containerDetail?id={containerid} Get container detail
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            containerID: '#3',
            containerType: { 
                txt: '12oz 玻璃杯', 
                code: 0 
            },
            reuseTime: 1,
            status: '庫存',
            bindedUser: '09**-***-***',
            joinedDate: Date,
            history:
            [ 
                { 
                    tradeTime: Date,
                    action: '回收',
                    newUser: '09**-***-***',
                    oriUser: '09**-***-***',
                    comment: '' 
                },
                ...
            ]
        }
 * 
 */
router.get('/containerDetail', regAsAdminManager, validateRequest, function (req, res, next) {
    if (!req.query.id) return res.status(404).end();
    const CONTAINER_ID = req.query.id;
    var storeDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    var containerDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_WITH_DEACTIVE);
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
            bindedUser: typeof theContainer.storeID !== "undefined" && theContainer.storeID !== null ?
                storeDict[theContainer.storeID].name : phoneEncoder(theContainer.conbineTo),
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

/**
 * @apiName Manage console
 * @apiGroup Manage
 *
 * @api {get} /manage/console Console
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {}
 * 
 */
router.get('/console', regAsAdminManager, validateRequest, function (req, res, next) {
    res.json({});
});

/**
 * @apiName Manage shop summary
 * @apiGroup Manage
 *
 * @api {get} /manage/shopSummary Put stores summary to google sheet
 * @apiPrivate
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {}
 * 
 */
router.get('/shopSummary', regAsAdminManager, validateRequest, function (req, res, next) {
    const storeDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    let storesSummary = {};
    let storesTmpData = {};
    for (let aStoreKey in storeDict) {
        let theStore = storeDict[aStoreKey];
        Object.assign(storesSummary, {
            [aStoreKey]: {
                ID: theStore.ID,
                name: theStore.name,
                active: theStore.active,
                dataRaws: []
            }
        });
        storesTmpData[aStoreKey] = [];
    }

    Trade.find({
        'tradeType.action': {
            '$in': ['Sign', 'Rent', 'Return', 'UndoReturn', 'ReadyToClean', 'UndoReadyToClean']
        }
    }, {}, {
        sort: {
            tradeTime: 1
        }
    }, function (err, tradeList) {
        if (err) return next(err);

        debug.log("[Manage/shopSummary] Get DB Response!");
        cleanUndo(['Return', 'ReadyToClean'], tradeList);

        var lastUsed = {};
        var unusedContainer = {};

        tradeList.forEach(function (aTrade) {
            let containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
            lastUsed[aTrade.container.id] = {
                time: aTrade.tradeTime,
                action: aTrade.tradeType.action,
                storeID: aTrade.newUser.storeID
            };
            if (aTrade.tradeType.action === "Sign") {
                unusedContainer[containerKey] = {
                    time: aTrade.tradeTime,
                    storeID: aTrade.newUser.storeID
                };
            } else if (aTrade.tradeType.action === "Return" && containerKey in unusedContainer) {
                let rentFromStoreID = unusedContainer[containerKey].storeID;
                let returnFromStoreID = aTrade.newUser.storeID;
                let storeDiff = rentFromStoreID !== returnFromStoreID;
                storesTmpData[rentFromStoreID].push({
                    tradeType: "Rent",
                    time: unusedContainer[containerKey].time,
                    diffStore: storeDiff
                });
                storesTmpData[returnFromStoreID].push({
                    tradeType: "Return",
                    time: aTrade.tradeTime,
                    diffStore: storeDiff
                });
                delete unusedContainer[containerKey];
            }
        });

        unusedContainer = null;
        var now = Date.now();
        for (var containerID in lastUsed) {
            var timeToNow = now - lastUsed[containerID].time;
            if ((lastUsed[containerID].action === "Sign" || lastUsed[containerID].action === "Return") &&
                timeToNow >= MILLISECONDS_OF_LOST_CONTAINER_SHOP) {
                storesTmpData[lastUsed[containerID].storeID].push({
                    tradeType: "Lost",
                    time: lastUsed[containerID].time
                });
            }
        }
        lastUsed = null;
        debug.log("[Manage/shopSummary] Finish Parse!");
        // trade to rawdata
        let dataSets = [];
        let sheetNames = [];
        for (let aStoreKey in storesTmpData) {
            let theStoreSummary = storesSummary[aStoreKey];
            let theStoreTmpData = storesTmpData[aStoreKey];
            theStoreTmpData.sort((a, b) => a.time - b.time);
            if (theStoreTmpData.length > 0) {
                let weekCheckpoint = getWeekCheckpoint(theStoreTmpData[0].time);
                for (let aRecordKey in theStoreTmpData) {
                    let theTradeRecord = theStoreTmpData[aRecordKey];
                    let toSummaryRecord;
                    if (theStoreSummary.dataRaws.length !== 0) toSummaryRecord = theStoreSummary.dataRaws[theStoreSummary.dataRaws.length - 1];
                    while (!toSummaryRecord || (theTradeRecord.time - weekCheckpoint) >= MILLISECONDS_OF_A_WEEK) {
                        weekCheckpoint.setDate(weekCheckpoint.getDate() + 7);
                        theStoreSummary.dataRaws.push({
                            checkPoints: fullDateString(weekCheckpoint),
                            rent_weeklyAmount: 0,
                            rent_returnToDiffStore: 0,
                            rent_lostAmount: 0,
                            return_weeklyAmount: 0,
                            return_rentFromDiffStore: 0
                        });
                        toSummaryRecord = theStoreSummary.dataRaws[theStoreSummary.dataRaws.length - 1];
                    }
                    if ((theTradeRecord.time - weekCheckpoint) < MILLISECONDS_OF_A_WEEK) {
                        if (theTradeRecord.tradeType === "Rent") {
                            toSummaryRecord.rent_weeklyAmount++;
                            if (theTradeRecord.diffStore)
                                toSummaryRecord.rent_returnToDiffStore++;
                        } else if (theTradeRecord.tradeType === "Return") {
                            toSummaryRecord.return_weeklyAmount++;
                            if (theTradeRecord.diffStore)
                                toSummaryRecord.return_rentFromDiffStore++;
                        } else if (theTradeRecord.tradeType === "Lost") {
                            toSummaryRecord.rent_lostAmount++;
                        }
                    }
                }
            }
            // rawdata to gsheet
            let sheetName = `${theStoreSummary.ID}_${theStoreSummary.name}`;
            let range = `${sheetName}!A1:F`;
            let values = [
                ["", "每週使用量", "歸還至不同店鋪的數量", "店鋪遺失量", "每週歸還量", "來自不同借用店鋪的數量"]
            ];
            theStoreSummary.dataRaws.forEach(raw => {
                values.push([
                    raw.checkPoints,
                    raw.rent_weeklyAmount,
                    raw.rent_returnToDiffStore,
                    raw.rent_lostAmount,
                    raw.return_weeklyAmount,
                    raw.return_rentFromDiffStore
                ]);
            });

            sheetNames.push(sheetName);
            dataSets.push({
                range,
                values,
                majorDimension: "ROWS"
            });
        }
        updateSummary(dataSets, sheetNames, (err) => {
            if (err) {
                return next(err);
            }
            res.status(200).end("Done");
        });
    });
});

const isPhone = /09[0-9]{8}/;

function phoneEncoder(phone, expose = false) {
    expose = true;
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

router.post(
    '/create/:storeID',
    regAsAdminManager,
    validateRequest,
    fetchBoxCreation,
    validateCreateApiContent,
    function (req, res, next) {
        let creator = req.body.phone;
        let storeID = parseInt(req.params.storeID);

        Promise.all(req._boxArray.map(box => box.save()))
            .then(success => {
                let list = new DeliveryList({
                    listID: req._listID,
                    boxList: req._boxIDs,
                    storeID,
                    creator: creator,
                });
                list.save().then(result => {
                    return res.status(200).json({
                        type: 'CreateMessage',
                        message: 'Create delivery list successfully',
                        boxIDs: req._boxIDs,
                    });
                });
            })
            .catch(err => {
                debug.error(err);
                return res.status(500).json(ErrorResponse.H006);
            });
    }
);

router.get(
    '/box/list',
    regAsAdminManager,
    validateRequest,
    async function (req, res, next) {
        let result = [];
        let storeList = DataCacheFactory.get(DataCacheFactory.keys.STORE);
        for (let i = 0; i < Object.keys(storeList).length; i++) {
            result.push({
                storeID: Number(Object.keys(storeList)[i]),
                boxObjs: []
            });
        }
        Box.find({}, (err, boxes) => {
            if (err) return next(err);
            for (let box of boxes) {
                if (!String(box.storeID)) continue;

                result.forEach(obj => {
                    if (String(obj.storeID) === String(box.storeID)) {
                        obj.boxObjs.push({
                            ID: box.boxID,
                            boxName: box.boxName || "",
                            dueDate: box.dueDate || "",
                            status: box.status || "",
                            action: box.action || [],
                            deliverContent: getDeliverContent(box.containerList),
                            orderContent: box.boxOrderContent || [],
                            containerList: box.containerList,
                            user: box.user,
                            comment: box.comment || ""
                        });
                    }
                });
            }
            result = result.filter(obj => {
                return obj.boxObjs.length > 0;
            });
            return res.status(200).json(result);
        });
    }
);

router.get(
    '/box/list/:status',
    regAsAdminManager,
    validateRequest,
    async function (req, res, next) {
        let result = [];
        let storeList = DataCacheFactory.get(DataCacheFactory.keys.STORE);
        let boxStatus = req.params.status;
        for (let i = 0; i < Object.keys(storeList).length; i++) {
            result.push({
                storeID: Number(Object.keys(storeList)[i]),
                boxObjs: []
            });
        }
        Box.find({
            'status': boxStatus
        }, (err, boxes) => {
            if (err) return next(err);
            for (let box of boxes) {
                if (!String(box.storeID)) continue;

                result.forEach(obj => {
                    if (String(obj.storeID) === String(box.storeID)) {
                        obj.boxObjs.push({
                            ID: box.boxID,
                            boxName: box.boxName || "",
                            dueDate: box.dueDate || "",
                            status: box.status || "",
                            action: box.action || [],
                            deliverContent: getDeliverContent(box.containerList),
                            orderContent: box.boxOrderContent || [],
                            containerList: box.containerList,
                            user: box.user,
                            comment: box.comment || ""
                        });
                    }
                });
            }
            result = result.filter(obj => {
                return obj.boxObjs.length > 0;
            });
            return res.status(200).json(result);
        });
    }
);

router.delete('/deleteBox/:boxID', regAsAdminManager, validateRequest, function (req, res, next) {
    let boxID = req.params.boxID;
    let dbAdmin = req._user;

    Box.remove({
            boxID
        })
        .exec()
        .then(_ => res.status(200).json({
            type: "DeleteMessage",
            message: "Delete successfully"
        })).catch(err => {
            debug.error(err);
            return next(err);
        });
});

/**
 * @apiName Manage refresh store
 * @apiGroup Manage
 *
 * @api {patch} /manage/refresh/store Refresh store
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            "success": true
        }
 * 
 */
router.patch('/refresh/store', regAsAdminManager, validateRequest, function (req, res, next) {
    refreshStore(function (err, data) {
        if (err) return next(err);
        res.json({
            "success": true,
            "updatedStoresAmount": data.length
        });
    });
});

/**
 * @apiName Manage refresh container
 * @apiGroup Manage
 *
 * @api {patch} /manage/refresh/container Refresh container
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            "success": true
        }
 * 
 */
router.patch('/refresh/container', regAsAdminManager, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    refreshContainer(dbAdmin, function (err) {
        if (err) return next(err);
        res.json({
            "success": true
        });
    });
});

/**
 * @apiName Manage refresh activity
 * @apiGroup Manage
 *
 * @api {patch} /manage/refresh/activity Refresh container
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            "success": true
        }
 * 
 */
router.patch('/refresh/activity', regAsAdminManager, validateRequest, function (req, res, next) {
    refreshActivity(function (err) {
        if (err) return next(err);
        res.json({
            "success": true
        });
    });
});

/**
 * @apiName Manage refresh coupon type
 * @apiGroup Manage
 *
 * @api {patch} /manage/refresh/couponType Refresh CouponType
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            "success": true
        }
 * 
 */
router.patch('/refresh/couponType', regAsAdminManager, validateRequest, function (req, res, next) {
    refreshCoupon((err, data) => {
        if (err) return next(err);
        res.json({
            "success": true,
            data
        });
    });
});

/**
 * @apiName Manage refresh store image
 * @apiGroup Manage
 *
 * @api {patch} /manage/refresh/storeImg/:forceRenew Refresh store image
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            type: 'refreshStoreImg',
            message: 'refresh succeed',
            data:
            [ 
                '00000.jpg',
                ...
            ] 
        }
 * @apiError 403 Response data
 */
router.patch('/refresh/storeImg/:forceRenew', regAsAdminManager, validateRequest, function (req, res, next) {
    var forceRenew = (req.params.forceRenew === '1' || req.params.forceRenew === 'true');
    refreshStoreImg(forceRenew, function (succeed, resData) {
        res.status((succeed) ? 200 : 403).json(resData);
    });
});

/**
 * @apiName Manage refresh specific container icon
 * @apiGroup Manage
 *
 * @api {patch} /manage/refresh/containerIcon/:forceRenew Refresh specific container icon
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            type: 'refreshContainerIcon',
            message: 'refresh succeed',
            data:
            [ 
                '08@3x.png',
                ...
            ] 
        }
 * @apiError 403 Response data
 */
router.patch('/refresh/containerIcon/:forceRenew', regAsAdminManager, validateRequest, function (req, res, next) {
    var forceRenew = (req.params.forceRenew === '1' || req.params.forceRenew === 'true');
    refreshContainerIcon(forceRenew, function (succeed, resData) {
        res.status((succeed) ? 200 : 403).json(resData);
    });
});

/**
 * @apiName Manage refresh specific container icon
 * @apiGroup Manage
 *
 * @api {patch} /manage/refresh/containerIcon/:forceRenew Refresh specific container icon
 * @apiPermission admin_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            type: 'refreshCouponImage',
            message: 'refresh succeed',
            data:
            [ 
                '08@3x.png',
                ...
            ] 
        }
 * @apiError 403 Response data
 */
router.patch('/refresh/couponImage/:forceRenew', regAsAdminManager, validateRequest, function (req, res, next) {
    var forceRenew = (req.params.forceRenew === '1' || req.params.forceRenew === 'true');
    refreshCouponImage(forceRenew, function (succeed, resData) {
        res.status((succeed) ? 200 : 403).json(resData);
    });
});

router.get('/summaryData/googlesheet/:storeID/:sheetID', regAsAdminManager, validateRequest, (req, res, next) => {
    let storeID = [Number(req.params.storeID)];
    let sheetID = req.params.sheetID;
    Promise.all([
            summaryReport.List_Of_Containers_Not_Return_To_Goodtogo(storeID, sheetID),
            summaryReport.List_Of_Containers_Be_Used(storeID, sheetID),
            summaryReport.List_Of_User_Of_Containers(storeID, sheetID),
            summaryReport.List_Of_Not_Return_Users(storeID, sheetID),
            summaryReport.List_Of_StatusCode_1_Container(storeID, sheetID),
            summaryReport.List_Of_StatusCode_3_Container(storeID, sheetID),
            summaryReport.List_Of_Summary_For_Store(storeID, sheetID),
            summaryReport.List_Of_Rent_UnLogRent_Return_For_Store(storeID, sheetID)
        ])
        .then(messenges => {
            let err_messenge = [];
            for (let index in messenges) {
                if (messenges[index][0]) {
                    err_messenge.push({
                        which_function: index,
                        error_messenge: messenges[index][0]
                    })
                }
            }
            if (err_messenge.length === 0) {
                res.status(200).json({
                    success: true
                })
            } else {
                next(err_messenge)
            }
        })
})

module.exports = router;