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
var dayFormatter = require('../helpers/toolKit').dayFormatter;
var timeFormatter = require('../helpers/toolKit').timeFormatter;
var monthFormatter = require('../helpers/toolKit').monthFormatter;
var dateCheckpoint = require('../helpers/toolKit').dateCheckpoint;

var validateDefault = require('../middlewares/validation/validateDefault');
var validateRequest = require('../middlewares/validation/validateRequest').JWT;
var regAsBot = require('../middlewares/validation/validateRequest').regAsBot;
var regAsStore = require('../middlewares/validation/validateRequest').regAsStore;
var regAsStoreManager = require('../middlewares/validation/validateRequest').regAsStoreManager;
var regAsAdminManager = require('../middlewares/validation/validateRequest').regAsAdminManager;
var Box = require('../models/DB/boxDB');
var Container = require('../models/DB/containerDB');
var User = require('../models/DB/userDB');
var Store = require('../models/DB/storeDB');
var Trade = require('../models/DB/tradeDB');
var Place = require('../models/DB/placeIdDB');

const historyDays = 14;

router.get('/list', validateDefault, function (req, res, next) {
    var jsonData = {
        title: "Stores list",
        contract_code_explanation: {
            0: "Only borrowable and returnable",
            1: "Only returnable",
            2: "Borrowable and returnable"
        }
    }
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
            Trade.count({
                "tradeType.action": "Rent"
            }, function (err, count) {
                if (err) return next(err);
                jsonData.globalAmount = count;
                keys.serverSecretKey((err, key) => {
                    if (err) return next(err);
                    var date = new Date();
                    var payload = {
                        'iat': Date.now(),
                        'exp': date.setMinutes(date.getMinutes() + 5)
                    };
                    var token = jwt.encode(payload, key);
                    res.set('etag', wetag([storeList, count]));
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
                    jsonData["shop_data"] = tmpArr;
                    res.json(jsonData);
                });
            });
        });
    });
});

router.get('/list.js', function (req, res, next) {
    var tmpArr = [];
    process.nextTick(function () {
        Place.find({
            "project": {
                "$ne": "測試用帳號"
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
            })
        });
    });
});

router.get('/status', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var tmpToUseArr = [];
    var tmpToReloadArr = [];
    var type = Object.values(req.app.get('containerType'));
    var forLoopLength = (dbStore.role.storeID === 17) ? type.length : ((type.length < 2) ? type.length : 2);
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
        Container.find({
            'storeID': dbStore.role.storeID,
            'active': true
        }, function (err, containers) {
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
                        if (tmpTypeCode >= 2 && (dbStore.role.storeID !== 17 || dbStore.role.storeID !== 21 || dbStore.role.storeID !== 22)) continue;
                        if (containers[i].statusCode === 1) {
                            resJson['containers'][tmpTypeCode]['IdList'].push(containers[i].ID);
                            resJson['containers'][tmpTypeCode]['amount']++;
                        } else if (containers[i].statusCode === 3) {
                            resJson['toReload'][tmpTypeCode]['IdList'].push(containers[i].ID);
                            resJson['toReload'][tmpTypeCode]['amount']++;
                        }
                    }
                }
                if (typeof trades !== 'undefined') {
                    for (var i in trades) {
                        if (trades[i].tradeType.action === 'Rent' && trades[i].oriUser.storeID === dbStore.role.storeID)
                            resJson['todayData']['rent']++;
                        else if (trades[i].tradeType.action === 'Return' && trades[i].newUser.storeID === dbStore.role.storeID)
                            resJson['todayData']['return']++;
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
                    Trade.count({
                        'tradeType.action': 'Return'
                    }, (err, totalAmount) => {
                        if (err) return reject(err);
                        resolve(totalAmount);
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
    var tradeTimeQuery = (req.query['days']) ? {
        '$gte': dateCheckpoint(1 - parseInt(req.query['days'])),
        '$lt': dateCheckpoint(1)
    } : undefined;
    process.nextTick(function () {
        Trade.find({
            'tradeTime': tradeTimeQuery,
            'tradeType.action': 'Rent',
            'oriUser.storeID': dbStore.role.storeID
        }, {}, {
            sort: {
                tradeTime: -1
            }
        }, function (err, rentTrades) {
            if (err) return next(err);
            Trade.find({
                'tradeTime': tradeTimeQuery,
                'tradeType.action': 'Return',
                'newUser.storeID': dbStore.role.storeID
            }, {}, {
                sort: {
                    tradeTime: -1
                }
            }, function (err, returnTrades) {
                if (err) return next(err);
                if (typeof rentTrades !== 'undefined' && typeof returnTrades !== 'undefined') {
                    var newTypeArrGenerator = function () {
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
                    var resJson = {
                        usedHistory: [],
                        reloadedHistory: []
                    };
                    var ctr = 0;
                    for (var i in resJson) {
                        if (([rentTrades, returnTrades])[ctr++].length > 0)
                            resJson[i].push({
                                date: fullDateString(dateCheckpoint(0)),
                                amount: 0,
                                data: newTypeArrGenerator()
                            });
                    }
                    var usageByDateByTypeGenerator = function (arrToParse, resultArr) {
                        var tmpTypeCode;
                        var dateCtr = 0;
                        var checkpoint = dateCheckpoint(dateCtr);
                        for (var i = 0; i < arrToParse.length; i++) {
                            if (arrToParse[i].tradeTime - checkpoint > 1000 * 60 * 60 * 24 || arrToParse[i].tradeTime - checkpoint < 0) {
                                checkpoint = dateCheckpoint(--dateCtr);
                                resultArr.push({
                                    date: fullDateString(checkpoint),
                                    amount: 0,
                                    data: newTypeArrGenerator()
                                });
                                i--;
                            } else {
                                tmpTypeCode = arrToParse[i].container.typeCode;
                                resultArr[resultArr.length - 1].data[tmpTypeCode].IdList.push(arrToParse[i].container.id);
                                resultArr[resultArr.length - 1].data[tmpTypeCode].amount++;
                                resultArr[resultArr.length - 1].amount++;
                            }
                        }
                    };
                    usageByDateByTypeGenerator(rentTrades, resJson.usedHistory);
                    usageByDateByTypeGenerator(returnTrades, resJson.reloadedHistory);
                    res.json(resJson);
                }
            });
        });
    });
});

router.get('/favorite', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    process.nextTick(function () {
        Trade.find({
            'tradeType.action': 'Rent',
            'oriUser.storeID': dbStore.role.storeID
        }, function (err, rentTrades) {
            if (err) return next(err);
            if (typeof rentTrades !== 'undefined') {
                getFavorite(rentTrades, function (userList) {
                    resJson = {};
                    if (userList.length > 5)
                        resJson.userList = userList.slice(0, 5);
                    else if (userList.length > 0)
                        resJson.userList = userList;
                    else
                        resJson.userList = [];
                    res.json(resJson);
                });
            }
        });
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

function fullDateString(date) {
    dayFormatted = intReLength(dayFormatter(date), 2);
    monthFormatted = intReLength(monthFormatter(date), 2);
    return date.getFullYear() + "/" + monthFormatted + "/" + dayFormatted;
}

module.exports = router;