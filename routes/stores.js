var express = require('express');
var router = express.Router();
var jwt = require('jwt-simple');
var crypto = require('crypto');
var debug = require('debug')('goodtogo_backend:stores');
var redis = require("../models/redis");

var keys = require('../config/keys');
var baseUrl = require('../config/config.js').serverBaseUrl;
var wetag = require('../helpers/toolKit').wetag;
var intReLength = require('../helpers/toolKit').intReLength;
var timeFormatter = require('../helpers/toolKit').timeFormatter;
var cleanUndoTrade = require('../helpers/toolKit').cleanUndoTrade;
var dateCheckpoint = require('../helpers/toolKit').dateCheckpoint;
var fullDateString = require('../helpers/toolKit').fullDateString;
var getDateCheckpoint = require('../helpers/toolKit').getDateCheckpoint;

var validateDefault = require('../middlewares/validation/validateDefault');
var validateRequest = require('../middlewares/validation/validateRequest').JWT;
var regAsBot = require('../middlewares/validation/validateRequest').regAsBot;
var regAsStore = require('../middlewares/validation/validateRequest').regAsStore;
var regAsAdmin = require('../middlewares/validation/validateRequest').regAsAdmin;
var regAsStoreManager = require('../middlewares/validation/validateRequest').regAsStoreManager;
var regAsAdminManager = require('../middlewares/validation/validateRequest').regAsAdminManager;
var Box = require('../models/DB/boxDB');
var User = require('../models/DB/userDB');
var Store = require('../models/DB/storeDB');
var Trade = require('../models/DB/tradeDB');
var Place = require('../models/DB/placeIdDB');
var Container = require('../models/DB/containerDB');
var getGlobalUsedAmount = require('../models/variables/globalUsedAmount');
const DEMO_CONTAINER_ID_LIST = require('../config/config').demoContainers;

const historyDays = 14;
const redisKey = storeID => `store_favorite:${storeID}`;

router.get('/list', validateDefault, function (req, res, next) {
    var jsonData = {
        title: "Stores list",
        contract_code_explanation: {
            0: "Only borrowable and returnable",
            1: "Only returnable",
            2: "Borrowable and returnable"
        }
    };
    var tmpArr = [];
    process.nextTick(function () {
        Store.find({
            "project": {
                "$ne": "測試用"
            },
            "active": true
        }, {}, {
            sort: {
                id: 1
            }
        }, function (err, storeList) {
            if (err) return next(err);
            jsonData.globalAmount = 0;
            keys.serverSecretKey((err, key) => {
                if (err) return next(err);
                var date = new Date();
                var payload = {
                    'iat': Date.now(),
                    'exp': date.setMinutes(date.getMinutes() + 5)
                };
                var token = jwt.encode(payload, key);
                res.set('etag', wetag(storeList));
                for (var i = 0; i < storeList.length; i++) {
                    var tmpOpening = [];
                    storeList[i].img_info.img_src = `${baseUrl}/images/store/${storeList[i].id}/${token}`;
                    for (var j = 0; j < storeList[i].opening_hours.length; j++)
                        tmpOpening.push({
                            close: storeList[i].opening_hours[j].close,
                            open: storeList[i].opening_hours[j].open
                        });
                    tmpOpening.sort((a, b) => {
                        return a.close.day - b.close.day;
                    });
                    tmpArr.push({
                        id: storeList[i].id,
                        name: storeList[i].name,
                        img_info: storeList[i].img_info,
                        opening_hours: tmpOpening,
                        contract: storeList[i].contract,
                        location: storeList[i].location,
                        address: storeList[i].address,
                        type: storeList[i].type,
                        testing: (storeList[i].project === '正興杯杯') ? false : true
                    });
                }
                jsonData.shop_data = tmpArr;
                res.json(jsonData);
            });
        });
    });
});

router.get('/dict', regAsAdmin, validateRequest, function (req, res, next) {
    process.nextTick(function () {
        Store.find({}, {}, {
            sort: {
                id: 1
            }
        }, function (err, storeList) {
            if (err) return next(err);
            let storeDict = {};
            storeList.forEach(aStore => storeDict[aStore.id] = aStore.name);
            res.json(storeDict);
        });
    });
});

router.get('/list.js', function (req, res, next) {
    var tmpArr = [];
    process.nextTick(function () {
        Place.find({
            "project": {
                "$in": ["正興杯杯", "咖啡店連線"]
            },
            "active": true
        }, {}, {
            sort: {
                id: 1
            }
        }, function (err, storeList) {
            if (err) return next(err);
            for (var i = 0; i < storeList.length; i++) {
                tmpArr.push({
                    placeid: storeList[i].placeID,
                    name: storeList[i].name,
                    borrow: storeList[i].contract.borrowable,
                    return: storeList[i].contract.returnable,
                    type: storeList[i].type
                });
            }
            res.type('application/javascript');
            res.end("var placeid_json = " + JSON.stringify(tmpArr));
        });
    });
});

router.get('/clerkList', regAsStoreManager, regAsAdminManager, validateRequest, function (req, res, next) {
    var dbUser = req._user;
    var condition;
    switch (dbUser.role.typeCode) {
        case 'admin':
            condition = {
                'roles.admin.stationID': dbUser.role.stationID
            };
            break;
        case 'clerk':
            condition = {
                'roles.clerk.storeID': dbUser.role.storeID
            };
            break;
        default:
            next();
    }
    process.nextTick(function () {
        User.find(condition, function (err, list) {
            if (err) return next(err);
            var resJson = {
                clerkList: []
            };
            for (var i = 0; i < list.length; i++) {
                resJson.clerkList.push({
                    phone: list[i].user.phone,
                    isManager: list[i].role.manager
                });
            }
            resJson.clerkList.sort((a, b) => {
                return (a.isManager === b.isManager) ? 0 : a.isManager ? -1 : 1;
            });
            res.json(resJson);
        });
    });
});

router.post('/layoff/:id', regAsStoreManager, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var toLayoff = req.params.id;
    process.nextTick(function () {
        User.findOne({
            'user.phone': toLayoff
        }, function (err, clerk) {
            if (err) return next(err);
            if (!clerk)
                return res.status(403).json({
                    code: 'E001',
                    type: "userSearchingError",
                    message: "No User: [" + toLayoff + "] Found",
                    data: toLayoff
                });
            else if (clerk.user.phone === dbStore.user.phone)
                return res.status(403).json({
                    code: 'E002',
                    type: "layoffError",
                    message: "Don't lay off yourself"
                });
            clerk.role.storeID = undefined;
            clerk.role.manager = undefined;
            clerk.role.typeCode = 'customer';
            clerk.roles.clerk = null;
            clerk.roles.typeList.splice(clerk.roles.typeList.indexOf("clerk"), 1);
            clerk.save(function (err) {
                if (err) return next(err);
                res.json({
                    type: 'LayoffMessage',
                    message: 'Layoff succeed'
                });
            });
        });
    });
});

router.get('/status', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var tmpToUseArr = [];
    var tmpToReloadArr = [];
    var type = Object.values(req.app.get('containerType'));
    var forLoopLength = (dbStore.project !== "正興杯杯" && dbStore.project !== "咖啡店連線") ? type.length : ((type.length < 2) ? type.length : 2);
    for (var i = 0; i < forLoopLength; i++) {
        tmpToUseArr.push({
            typeCode: type[i].typeCode,
            name: type[i].name,
            IdList: [],
            amount: 0
        });
        tmpToReloadArr.push({
            typeCode: type[i].typeCode,
            name: type[i].name,
            IdList: [],
            amount: 0
        });
    }
    var resJson = {
        containers: tmpToUseArr,
        toReload: tmpToReloadArr,
        todayData: {
            rent: 0,
            return: 0
        }
    };
    var tmpTypeCode;
    process.nextTick(function () {
        var containerQuery;
        if (dbStore.role.storeID === 17) {
            containerQuery = {
                "$or": [{
                        'storeID': dbStore.role.storeID,
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
                'storeID': dbStore.role.storeID,
                'active': true
            };
        }
        Container.find(containerQuery, function (err, containers) {
            if (err) return next(err);
            Trade.find({
                'tradeTime': {
                    '$gte': dateCheckpoint(0),
                    '$lt': dateCheckpoint(1)
                }
            }, function (err, trades) {
                if (err) return next(err);
                if (typeof containers !== 'undefined') {
                    for (var i in containers) {
                        tmpTypeCode = containers[i].typeCode;
                        if (tmpTypeCode >= 2 && (dbStore.project === "正興杯杯" || dbStore.project === "咖啡店連線")) continue;
                        if (containers[i].statusCode === 1 || DEMO_CONTAINER_ID_LIST.indexOf(containers[i].ID) !== -1) {
                            resJson.containers[tmpTypeCode].IdList.push(containers[i].ID);
                            resJson.containers[tmpTypeCode].amount++;
                        } else if (containers[i].statusCode === 3) {
                            resJson.toReload[tmpTypeCode].IdList.push(containers[i].ID);
                            resJson.toReload[tmpTypeCode].amount++;
                        }
                    }
                }
                if (typeof trades !== 'undefined') {
                    for (var i in trades) {
                        if (trades[i].tradeType.action === 'Rent' && trades[i].oriUser.storeID === dbStore.role.storeID)
                            resJson.todayData.rent++;
                        else if (trades[i].tradeType.action === 'Return' && trades[i].newUser.storeID === dbStore.role.storeID)
                            resJson.todayData.return++;
                    }
                }
                res.json(resJson);
            });
        });
    });
});

router.get('/openingTime', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    process.nextTick(function () {
        Store.findOne({
            'id': dbStore.role.storeID,
            'active': true
        }, function (err, store) {
            if (err) return next(err);
            if (!store) return next('Mapping store ID failed');
            res.json({
                opening_hours: store.opening_hours,
                isSync: !store.opening_default
            });
        });
    });
});

router.post('/unsetDefaultOpeningTime', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    process.nextTick(function () {
        Store.findOne({
            'id': dbStore.role.storeID,
            'active': true
        }, function (err, store) {
            if (err) return next(err);
            if (!store) return next('Mapping store ID failed');
            store.opening_default = false;
            store.save((err) => {
                if (err) return next(err);
                res.status(204).end();
            });
        });
    });
});

router.get('/getUser/:id', regAsBot, regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var id = req.params.id;
    const thisRedisKey = redisKey(dbStore.role.storeID); // BOT??
    process.nextTick(function () {
        User.findOne({
            'user.phone': new RegExp(id.toString() + '$', "i")
        }, function (err, user) {
            if (err)
                return next(err);
            if (!user) {
                res.status(403).json({
                    code: 'E001',
                    type: "userSearchingError",
                    message: "No User: [" + id + "] Found",
                    data: id
                });
            } else {
                var token = crypto.randomBytes(48).toString('hex').substr(0, 10);
                redis.set('user_token:' + token, user.user.phone, (err, reply) => {
                    if (err) return next(err);
                    if (reply !== 'OK') return next(reply);
                    redis.expire('user_token:' + token, 60 * 30, (err, replyNum) => {
                        if (err) return next(err);
                        if (replyNum !== 1) return next(replyNum);
                        res.status(200).json({
                            'phone': user.user.phone,
                            'apiKey': token
                        });
                        redis.zincrby(thisRedisKey, 1, user.user.phone);
                    });
                });
            }
        });
    });
});

router.get('/checkUnReturned', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var rentedIdList = [];
    var resJson = {
        data: []
    };
    process.nextTick(function () {
        Trade.find({
            'tradeTime': {
                '$gte': dateCheckpoint(1 - historyDays),
                '$lt': dateCheckpoint(1)
            },
            'tradeType.action': "Rent",
            'oriUser.storeID': dbStore.role.storeID
        }, function (err, rentedList) {
            if (err) return next(err);
            rentedList.sort(function (a, b) {
                return b.tradeTime - a.tradeTime;
            });
            for (var i in rentedList)
                rentedIdList.push(rentedList[i].container.id);
            Trade.find({
                'tradeTime': {
                    '$gte': dateCheckpoint(1 - historyDays),
                    '$lt': dateCheckpoint(1)
                },
                'tradeType.action': "Return",
                'container.id': {
                    '$in': rentedIdList
                }
            }, function (err, returnedList) {
                if (err) return next(err);
                returnedList.sort(function (a, b) {
                    return b.tradeTime - a.tradeTime;
                });
                for (var i in returnedList) {
                    var index = rentedList.findIndex(function (ele) {
                        return ele.container.id === returnedList[i].container.id && ele.container.cycleCtr === returnedList[i].container.cycleCtr;
                    });
                    if (index !== -1) {
                        rentedList.splice(index, 1);
                    }
                }
                for (var i in rentedList) {
                    resJson.data.push({
                        id: rentedList[i].container.id,
                        phone: rentedList[i].newUser.phone,
                        by: rentedList[i].oriUser.phone,
                        rentedTime: rentedList[i].tradeTime.getTime()
                    });
                }
                res.json(resJson);
            });
        });
    });
});

router.post('/changeOpeningTime', regAsStoreManager, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var newData = req.body;
    var days = newData.opening_hours;
    var timeFormat = /^[0-1]{1}[0-9]{1}|[2]{1}[0-3]{1}:[0-9]{2}$/;
    var dayFormat = /^[0-6]{1}$/;
    if (Array.isArray(days)) {
        for (var i = 0; i < days.length; i++) {
            if (!(typeof days[i].close !== 'undefined' && typeof days[i].close.day !== 'undefined' && typeof days[i].close.time === 'string' &&
                    typeof days[i].open !== 'undefined' && typeof days[i].open.day !== 'undefined' && typeof days[i].open.time === 'string' &&
                    timeFormat.test(days[i].close.time) && timeFormat.test(days[i].open.time) &&
                    dayFormat.test(days[i].close.day) && dayFormat.test(days[i].open.day))) {
                return res.status(403).json({
                    code: 'E003',
                    type: "changeOpeningTimeError",
                    message: "Data format invalid"
                });
            }
        }
        Store.findOne({
            'id': dbStore.role.storeID
        }, (err, aStore) => {
            if (err) return next(err);
            aStore.opening_hours = days;
            aStore.opening_default = true;
            aStore.save((err) => {
                if (err) return next(err);
                res.json({
                    type: "changeOpeningTime",
                    message: "Change succeed"
                });
            });
        });
    } else {
        res.status(403).json({
            code: 'E003',
            type: "changeOpeningTimeError",
            message: "Data format invalid"
        });
    }
});

router.get('/boxToSign', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    process.nextTick(function () {
        var containerDict = req.app.get('container');
        var type = req.app.get('containerType');
        Box.find({
            'storeID': dbStore.role.storeID
        }, function (err, boxList) {
            if (err) return next(err);
            var boxArr = [];
            if (boxList.length !== 0) {
                var thisBox;
                var thisType;
                for (var i = 0; i < boxList.length; i++) {
                    thisBox = boxList[i].boxID;
                    var thisBoxTypeList = [];
                    var thisBoxContainerList = {};
                    for (var j = 0; j < boxList[i].containerList.length; j++) {
                        thisType = containerDict[boxList[i].containerList[j]];
                        if (thisBoxTypeList.indexOf(thisType) < 0) {
                            thisBoxTypeList.push(thisType);
                            thisBoxContainerList[thisType] = [];
                        }
                        thisBoxContainerList[thisType].push(boxList[i].containerList[j]);
                    }
                    boxArr.push({
                        boxID: thisBox,
                        boxTime: boxList[i].updatedAt,
                        typeList: thisBoxTypeList,
                        containerList: thisBoxContainerList,
                        isDelivering: false,
                        destinationStore: boxList[i].storeID
                    });
                }
                for (var i = 0; i < boxArr.length; i++) {
                    boxArr[i].containerOverview = [];
                    for (var j = 0; j < boxArr[i].typeList.length; j++) {
                        boxArr[i].containerOverview.push({
                            containerType: boxArr[i].typeList[j],
                            amount: boxArr[i].containerList[boxArr[i].typeList[j]].length
                        });
                    }
                }
            }
            Trade.find({
                'tradeType.action': 'Sign',
                'newUser.storeID': dbStore.role.storeID,
                'tradeTime': {
                    '$gte': dateCheckpoint(1 - historyDays)
                }
            }, function (err, list) {
                if (err) return next(err);
                if (list.length !== 0) {
                    list.sort((a, b) => {
                        return b.logTime - a.logTime;
                    });
                    var boxHistoryArr = [];
                    var boxIDArr = [];
                    var thisBoxTypeList;
                    var thisBoxContainerList;
                    var lastIndex;
                    var nowIndex;
                    for (var i = 0; i < list.length; i++) {
                        thisBox = list[i].container.box;
                        thisType = type[list[i].container.typeCode].name;
                        lastIndex = boxHistoryArr.length - 1;
                        if (lastIndex < 0 || boxHistoryArr[lastIndex].boxID !== thisBox || (boxHistoryArr[lastIndex].boxTime - list[i].tradeTime) !== 0) {
                            boxIDArr.push(thisBox);
                            boxHistoryArr.push({
                                boxID: thisBox,
                                boxTime: list[i].tradeTime,
                                typeList: [],
                                containerList: {},
                                isDelivering: true,
                                destinationStore: list[i].newUser.storeID
                            });
                        }
                        nowIndex = boxHistoryArr.length - 1;
                        thisBoxTypeList = boxHistoryArr[nowIndex].typeList;
                        thisBoxContainerList = boxHistoryArr[nowIndex].containerList;
                        if (thisBoxTypeList.indexOf(thisType) < 0) {
                            thisBoxTypeList.push(thisType);
                            thisBoxContainerList[thisType] = [];
                        }
                        thisBoxContainerList[thisType].push(list[i].container.id);
                    }
                    for (var i = 0; i < boxHistoryArr.length; i++) {
                        boxHistoryArr[i].containerOverview = [];
                        for (var j = 0; j < boxHistoryArr[i].typeList.length; j++) {
                            boxHistoryArr[i].containerOverview.push({
                                containerType: boxHistoryArr[i].typeList[j],
                                amount: boxHistoryArr[i].containerList[boxHistoryArr[i].typeList[j]].length
                            });
                        }
                    }
                    boxArr = boxArr.concat(boxHistoryArr);
                }
                var resJSON = {
                    toSign: boxArr
                };
                res.json(resJSON);
            });
        });
    });
});

router.get('/usedAmount', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    process.nextTick(function () {
        var type = req.app.get('containerType');
        Promise
            .all([new Promise((resolve, reject) => {
                    Trade.find({
                        'tradeType.action': 'Rent',
                        'oriUser.storeID': dbStore.role.storeID
                    }, (err, tradeList) => {
                        if (err) return reject(err);
                        var dataList = {};
                        for (var aType in type) {
                            dataList[type[aType].typeCode] = {
                                typeCode: type[aType].typeCode,
                                amount: 0
                            };
                        }
                        for (var j = 0; j < tradeList.length; j++) {
                            dataList[tradeList[j].container.typeCode].amount++;
                        }
                        resolve(dataList);
                    });
                }),
                new Promise((resolve, reject) => {
                    getGlobalUsedAmount((err, globalAmount) => {
                        if (err) return reject(err);
                        resolve(globalAmount);
                    });
                })
            ])
            .then((data) => {
                res.json({
                    store: Object.values(data[0]),
                    total: data[1]
                });
            }).catch(err => next(err));
    });
});

router.get('/history', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var type = req.app.get('containerType');
    process.nextTick(function () {
        Trade.find({
            'tradeTime': {
                '$gte': dateCheckpoint(1 - historyDays),
                '$lt': dateCheckpoint(1)
            },
            'tradeType.action': 'Rent',
            'oriUser.storeID': dbStore.role.storeID
        }, function (err, rentTrades) {
            if (err) return next(err);
            Trade.find({
                'tradeTime': {
                    '$gte': dateCheckpoint(1 - historyDays),
                    '$lt': dateCheckpoint(1)
                },
                'tradeType.action': 'Return',
                'newUser.storeID': dbStore.role.storeID
            }, function (err, returnTrades) {
                if (err) return next(err);
                if (typeof rentTrades !== 'undefined' && typeof returnTrades !== 'undefined') {
                    parseHistory(rentTrades, 'Rent', type, function (parsedRent) {
                        resJson = {
                            rentHistory: {
                                amount: parsedRent.length,
                                dataList: parsedRent
                            }
                        };
                        parseHistory(returnTrades, 'Return', type, function (parsedReturn) {
                            resJson.returnHistory = {
                                amount: parsedReturn.length,
                                dataList: parsedReturn
                            };
                            res.json(resJson);
                        });
                    });
                }
            });
        });
    });
});

router.get('/history/byContainerType', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var type = req.app.get('containerType');
    req.clearTimeout();
    var tradeQuery = {
        '$or': [{
                'tradeType.action': 'Sign',
                'newUser.storeID': dbStore.role.storeID
            },
            {
                'tradeType.action': 'Rent',
                'oriUser.storeID': dbStore.role.storeID
            },
            {
                'tradeType.action': 'Return',
                'newUser.storeID': dbStore.role.storeID
            },
            {
                'tradeType.action': 'Return',
                'oriUser.storeID': dbStore.role.storeID
            },
            {
                'tradeType.action': 'UndoReturn',
                'oriUser.storeID': dbStore.role.storeID
            },
            {
                'tradeType.action': 'ReadyToClean',
            },
            {
                'tradeType.action': 'UndoReadyToClean'
            }
        ]
    };
    if (req.query.days)
        Object.assign(tradeQuery, {
            'tradeTime': {
                '$gte': dateCheckpoint(1 - parseInt(req.query.days)),
                '$lt': dateCheckpoint(1)
            }
        });
    Trade.find(tradeQuery, {}, {
        sort: {
            tradeTime: 1
        }
    }, function (err, tradeList) {
        if (err) return next(err);

        cleanUndoTrade(['Return', 'ReadyToClean'], tradeList);

        var storeLostTradesDict = {};
        var personalLostTradesDict = {};
        var usedTrades = [];
        var rentTrades = [];
        var returnTrades = [];
        var cleanReloadTrades = [];
        tradeList.forEach(aTrade => {
            let containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
            if (aTrade.tradeType.action === "Sign") {
                storeLostTradesDict[containerKey] = aTrade;
            } else if (aTrade.tradeType.action === "Rent") {
                rentTrades.push(aTrade);
                personalLostTradesDict[containerKey] = aTrade;
                if (storeLostTradesDict[containerKey]) {
                    usedTrades.push(aTrade);
                    delete storeLostTradesDict[containerKey];
                }
            } else if (aTrade.tradeType.action === "Return") {
                returnTrades.push(aTrade);
                if (aTrade.oriUser.storeID === dbStore.role.storeID && storeLostTradesDict[containerKey]) {
                    usedTrades.push(aTrade);
                    delete storeLostTradesDict[containerKey];
                }
                if (aTrade.newUser.storeID === dbStore.role.storeID) {
                    storeLostTradesDict[containerKey] = aTrade;
                }
                if (personalLostTradesDict[containerKey]) {
                    delete personalLostTradesDict[containerKey];
                }
            } else if (aTrade.tradeType.action === "ReadyToClean") {
                if (aTrade.tradeType.oriState === 1 && aTrade.oriUser.storeID === dbStore.role.storeID) {
                    cleanReloadTrades.push(aTrade);
                    if (storeLostTradesDict[containerKey]) {
                        delete storeLostTradesDict[containerKey];
                    }
                } else if (aTrade.tradeType.oriState === 3 && storeLostTradesDict[containerKey]) {
                    usedTrades.push(aTrade);
                    delete storeLostTradesDict[containerKey];
                }
                if (personalLostTradesDict[containerKey]) {
                    delete personalLostTradesDict[containerKey];
                }
            }
        });

        var newTypeArrGenerator = newTypeArrGeneratorFunction(type);

        var resJson = {
            personalLostHistory: [],
            storeLostHistory: [],
            usedHistory: [],
            rentHistory: [],
            returnHistory: [],
            cleanReloadHistory: []
        };
        var personalLostTrades = Object.values(personalLostTradesDict);
        var storeLostTrades = Object.values(storeLostTradesDict);
        usageByDateByTypeGenerator(newTypeArrGenerator, personalLostTrades, resJson.personalLostHistory);
        usageByDateByTypeGenerator(newTypeArrGenerator, storeLostTrades, resJson.storeLostHistory);
        usageByDateByTypeGenerator(newTypeArrGenerator, usedTrades, resJson.usedHistory);
        usageByDateByTypeGenerator(newTypeArrGenerator, rentTrades, resJson.rentHistory);
        usageByDateByTypeGenerator(newTypeArrGenerator, returnTrades, resJson.returnHistory);
        usageByDateByTypeGenerator(newTypeArrGenerator, cleanReloadTrades, resJson.cleanReloadHistory);
        for (let aHistoryType in resJson) {
            let thisHistoryType = resJson[aHistoryType];
            for (let historyArrIndex in thisHistoryType) {
                if (thisHistoryType[historyArrIndex].amount === 0)
                    delete thisHistoryType[historyArrIndex];
            }
        }
        res.json(resJson);
    });
});

function newTypeArrGeneratorFunction(type) {
    return function () {
        var tmpArr = [];
        for (var aType in type) {
            tmpArr.push({
                typeCode: type[aType].typeCode,
                name: type[aType].name,
                IdList: [],
                amount: 0
            });
        }
        return tmpArr;
    };
}

function usageByDateByTypeGenerator(newTypeArrGenerator, arrToParse, resultArr) {
    if (arrToParse.length > 0) {
        var tmpTypeCode;
        var checkpoint = getDateCheckpoint(arrToParse[0].tradeTime);
        resultArr.push({
            date: fullDateString(checkpoint),
            amount: 0,
            data: newTypeArrGenerator()
        });
        for (var i = 0; i < arrToParse.length; i++) {
            let theTrade = arrToParse[i];
            if (theTrade.tradeTime - checkpoint > 1000 * 60 * 60 * 24) {
                checkpoint = getDateCheckpoint(theTrade.tradeTime);
                resultArr.push({
                    date: fullDateString(checkpoint),
                    amount: 0,
                    data: newTypeArrGenerator()
                });
                i--;
            } else {
                tmpTypeCode = theTrade.container.typeCode;
                resultArr[resultArr.length - 1].data[tmpTypeCode].IdList.push(theTrade.container.id);
                resultArr[resultArr.length - 1].data[tmpTypeCode].amount++;
                resultArr[resultArr.length - 1].amount++;
            }
        }
    }
}

router.get('/history/byCustomer', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    let tradeQuery = {
        "tradeType.action": "Rent",
        'oriUser.storeID': dbStore.role.storeID
    };
    if (req.query.days)
        Object.assign(tradeQuery, {
            'tradeTime': {
                '$gte': dateCheckpoint(1 - parseInt(req.query.days)),
                '$lt': dateCheckpoint(1)
            }
        });
    Trade.find(tradeQuery, {}, {
        "sort": {
            "tradeTime": 1
        }
    }, (err, rentTradeList) => {
        if (err) return next(err);
        let customerByDateDict = {};
        let customeList = [];

        rentTradeList.forEach(aTrade => {
            let customerPhone = aTrade.newUser.phone;
            let tradeDate = fullDateString(aTrade.tradeTime);
            if (customeList.indexOf(customerPhone) === -1) customeList.push(customerPhone);
            if (!customerByDateDict[tradeDate]) customerByDateDict[tradeDate] = {};
            if (!customerByDateDict[tradeDate][customerPhone]) customerByDateDict[tradeDate][customerPhone] = [];
            customerByDateDict[tradeDate][customerPhone].push(aTrade.container.id);
        });

        for (let aDate in customerByDateDict) {
            let oriData = customerByDateDict[aDate];
            customerByDateDict[aDate] = {
                distinctCustomerAmount: Object.keys(oriData).length,
                averageContainerUsage: Object.values(oriData).reduce((ctr, thisItem) => ctr + thisItem.length, 0) /
                    Object.keys(oriData).length
            };
        }

        res.json({
            totalDistinctCustomer: customeList.length,
            customerSummary: customerByDateDict
        });
    });
});

router.get('/performance', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    let orderBy = req.query.by;
    Trade.find({
        'tradeType.action': 'Rent',
        'oriUser.storeID': dbStore.role.storeID
    }, function (err, rentTrades) {
        if (err) return next(err);
        let clerkDict = {};
        if (orderBy && orderBy === "date") {
            rentTrades.forEach(aTrade => {
                let dateCheckpoint = fullDateString(getDateCheckpoint(aTrade.tradeTime));
                if (!clerkDict[aTrade.oriUser.phone]) clerkDict[aTrade.oriUser.phone] = {};
                let aClerk = clerkDict[aTrade.oriUser.phone];
                if (!aClerk[dateCheckpoint]) aClerk[dateCheckpoint] = 1;
                else aClerk[dateCheckpoint]++;
            });
        } else {
            rentTrades.forEach(aTrade => {
                if (!clerkDict[aTrade.oriUser.phone]) clerkDict[aTrade.oriUser.phone] = 1;
                else clerkDict[aTrade.oriUser.phone]++;
            });
        }
        res.json(clerkDict);
    });
});

router.get('/favorite', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    const thisRedisKey = redisKey(dbStore.role.storeID);
    redis.exists(thisRedisKey, (err, keyIsExists) => {
        if (err) return next(err);
        if (keyIsExists) {
            redis.zrevrange(thisRedisKey, 0, 4, "withscores", (err, reply) => {
                if (err) return next(err);
                let favoriteList = [];
                reply.forEach((theValue, index) => {
                    if (index % 2 === 0) {
                        return favoriteList.push({
                            phone: theValue
                        });
                    } else {
                        return Object.assign(favoriteList[favoriteList.length - 1], {
                            times: parseInt(theValue)
                        });
                    }
                });
                res.json({
                    userList: favoriteList
                });
            });
        } else {
            Trade.find({
                'tradeType.action': 'Rent',
                'oriUser.storeID': dbStore.role.storeID
            }, function (err, rentTrades) {
                if (err) return next(err);
                if (typeof rentTrades !== 'undefined') {
                    getFavorite(rentTrades, function (userList) {
                        let favoriteList = userList.slice(0, 5);
                        res.json({
                            userList: favoriteList
                        });
                        userList.map(aUser => redis.zadd(thisRedisKey, aUser.times, aUser.phone));
                    });
                }
            });
        }
    });
});

function parseHistory(data, dataType, type, callback) {
    var aHistory;
    var lastHistory;
    var thisPhone;
    var lastPhone;
    var phoneFormatted;
    if (data.length === 0) return callback([]);
    else if (data.length === 1) {
        aHistory = data[0];
        if (dataType === 'Rent')
            lastPhone = aHistory.newUser.phone;
        else if (dataType === 'Return')
            lastPhone = aHistory.oriUser.phone;
    } else {
        data.sort(function (a, b) {
            return b.tradeTime - a.tradeTime;
        });
    }
    var byOrderArr = [];
    var tmpContainerList = [];
    tmpContainerList.push('#' + intReLength(data[0].container.id, 3) + " | " + type[data[0].container.typeCode].name);
    for (var i = 1; i < data.length; i++) {
        aHistory = data[i];
        lastHistory = data[i - 1];
        if (dataType === 'Rent') {
            thisPhone = aHistory.newUser.phone;
            lastPhone = lastHistory.newUser.phone;
        } else if (dataType === 'Return') {
            thisPhone = aHistory.oriUser.phone;
            lastPhone = lastHistory.oriUser.phone;
        }
        // if (Math.abs(lastHistory.tradeTime - aHistory.tradeTime) > 100 || lastPhone !== thisPhone) {
        if (Math.abs(lastHistory.tradeTime - aHistory.tradeTime) > 100) {
            phoneFormatted = (dataType === 'Return') ? '' : (lastPhone.slice(0, 4) + "-***-" + lastPhone.slice(7, 10));
            byOrderArr.push({
                time: lastHistory.tradeTime,
                phone: phoneFormatted,
                containerAmount: tmpContainerList.length,
                containerList: tmpContainerList
            });
            tmpContainerList = [];
        }
        tmpContainerList.push('#' + intReLength(aHistory.container.id, 3) + " | " + type[aHistory.container.typeCode].name);
    }
    phoneFormatted = (dataType === 'Return') ? '' : (lastPhone.slice(0, 4) + "-***-" + lastPhone.slice(7, 10));
    byOrderArr.push({
        time: aHistory.tradeTime,
        phone: phoneFormatted,
        containerAmount: tmpContainerList.length,
        containerList: tmpContainerList
    });
    // console.log(byOrderArr)
    var byDateArr = [];
    var tmpOrderList = [];
    var tmpOrderAmount = 0;
    var date = 0;
    for (var i = 0; i < byOrderArr.length; i++) {
        aOrder = byOrderArr[i];
        nextOrder = byOrderArr[i + 1];
        // console.log('i', i)
        // console.log('date', fullDateString(dateCheckpoint(date)))
        // console.log('this', aOrder)
        // console.log('next', nextOrder)
        if (aOrder.time < dateCheckpoint(date + 1) && aOrder.time >= dateCheckpoint(date)) {
            aOrder.time = timeFormatter(aOrder.time);
            tmpOrderList.push(aOrder);
        } else {
            i--;
        }
        if (!nextOrder || !(nextOrder.time < dateCheckpoint(date + 1) && nextOrder.time >= dateCheckpoint(date))) {
            tmpOrderAmount = 0;
            for (var j = 0; j < tmpOrderList.length; j++) {
                tmpOrderAmount += tmpOrderList[j].containerAmount;
            }
            byDateArr.push({
                date: fullDateString(dateCheckpoint(date)),
                orderAmount: tmpOrderAmount,
                orderList: tmpOrderList
            });
            tmpOrderList = [];
            date--;
        }
    }
    while (date > (-1 * historyDays)) {
        byDateArr.push({
            date: fullDateString(dateCheckpoint(date)),
            orderAmount: 0,
            orderList: []
        });
        date--;
    }
    return callback(byDateArr);
}

function getFavorite(data, callback) {
    if (data.length === 0) return callback([]);
    data.sort(function (a, b) {
        return b.tradeTime - a.tradeTime;
    });
    var byOrderArr = [];
    var aHistory;
    var lastHistory;
    var thisPhone = data[0].newUser.phone;
    var lastPhone;
    for (var i = 1; i < data.length; i++) {
        aHistory = data[i];
        lastHistory = data[i - 1];
        thisPhone = aHistory.newUser.phone;
        lastPhone = lastHistory.newUser.phone;
        if ((lastHistory.tradeTime - aHistory.tradeTime) !== 0 || lastPhone !== thisPhone) {
            byOrderArr.push(thisPhone);
        }
    }
    byOrderArr.push(thisPhone);
    var count = {};
    for (var i = 0; i < byOrderArr.length; i++) {
        if (byOrderArr[i] in count) {
            count[byOrderArr[i]]++;
        } else {
            count[byOrderArr[i]] = 1;
        }
    }
    var sortable = [];
    for (var phone in count) {
        sortable.push({
            phone: phone,
            times: count[phone]
        });
    }
    sortable.sort(function (a, b) {
        return b.times - a.times;
    });
    return callback(sortable);
}

module.exports = router;