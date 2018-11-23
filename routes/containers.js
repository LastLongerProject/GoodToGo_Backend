var express = require('express');
var router = express.Router();
var jwt = require('jwt-simple');
var debug = require('debug')('goodtogo_backend:containers');
var redis = require("../models/redis");

var Box = require('../models/DB/boxDB');
var Container = require('../models/DB/containerDB');
var Trade = require('../models/DB/tradeDB');
var User = require('../models/DB/userDB');
var getGlobalUsedAmount = require('../models/variables/globalUsedAmount');
const DEMO_CONTAINER_ID_LIST = require('../config/config').demoContainers;

var keys = require('../config/keys');
var baseUrl = require('../config/config.js').serverBaseUrl;
var sns = require('../helpers/aws/SNS');
var wetag = require('../helpers/toolKit').wetag;
var intReLength = require('../helpers/toolKit').intReLength;
var dateCheckpoint = require('../helpers/toolKit').dateCheckpoint;
var cleanUndoTrade = require('../helpers/toolKit').cleanUndoTrade;
var validateStateChanging = require('../helpers/toolKit').validateStateChanging;
var generateSocketToken = require('../controllers/socket').generateToken;
var changeContainersState = require('../controllers/containerTrade');
var validateDefault = require('../middlewares/validation/validateDefault');
var validateRequest = require('../middlewares/validation/validateRequest').JWT;
var regAsBot = require('../middlewares/validation/validateRequest').regAsBot;
var regAsStore = require('../middlewares/validation/validateRequest').regAsStore;
var regAsAdmin = require('../middlewares/validation/validateRequest').regAsAdmin;
var regAsAdminManager = require('../middlewares/validation/validateRequest').regAsAdminManager;

const historyDays = 14;
const status = ['delivering', 'readyToUse', 'rented', 'returned', 'notClean', 'boxed'];

router.get('/globalUsedAmount', function (req, res, next) {
    getGlobalUsedAmount((err, count) => {
        if (err) return next(err);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(count.toString());
        res.end();
    });
});

router.get('/get/list', validateDefault, function (req, res, next) {
    var typeDict = req.app.get('containerType');
    var containerDict = req.app.get('container');
    var tmpIcon;
    var tmpArr = [];
    var date = new Date();
    var payload = {
        'iat': Date.now(),
        'exp': date.setMinutes(date.getMinutes() + 5)
    };
    keys.serverSecretKey((err, key) => {
        var token = jwt.encode(payload, key);
        res.set('etag', wetag([containerDict, typeDict]));
        for (var aType in typeDict) {
            tmpIcon = {};
            for (var j = 1; j <= 3; j++) {
                tmpIcon[j + 'x'] = `${baseUrl}/images/icon/${intReLength(typeDict[aType].typeCode, 2)}_${j}x/${token}`;
            }
            tmpArr.push({
                typeCode: typeDict[aType].typeCode,
                name: typeDict[aType].name,
                version: typeDict[aType].version,
                icon: tmpIcon
            });
        }
        var resJSON = {
            containerType: tmpArr,
            containerDict: containerDict
        };
        res.json(resJSON);
    });
});

router.get('/get/toDelivery', regAsAdmin, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    var containerDict = req.app.get('containerWithDeactive');
    process.nextTick(function () {
        Box.find(function (err, boxList) {
            if (err) return next(err);
            if (boxList.length === 0) return res.json({
                toDelivery: []
            });
            var boxArr = [];
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
                    phone: boxList[i].user,
                    typeList: thisBoxTypeList,
                    containerList: thisBoxContainerList,
                    stocking: boxList[i].stocking,
                    isDelivering: boxList[i].delivering,
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
            boxArr.sort((a, b) => {
                return b.boxTime - a.boxTime;
            });
            var resJSON = {
                toDelivery: boxArr
            };
            res.json(resJSON);
        });
    });
});

router.get('/get/deliveryHistory', regAsAdmin, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    var typeDict = req.app.get('containerType');
    Trade.find({
        'tradeType.action': 'Sign',
        'tradeTime': {
            '$gte': dateCheckpoint(1 - historyDays)
        }
    }, function (err, list) {
        if (err) return next(err);
        if (list.length === 0) return res.json({
            pastDelivery: []
        });
        list.sort((a, b) => {
            return b.tradeTime - a.tradeTime;
        });
        var boxArr = [];
        var boxIDArr = [];
        var thisBox;
        var thisBoxTypeList;
        var thisBoxContainerList;
        var lastIndex;
        var nowIndex;
        var thisType;
        for (var i = 0; i < list.length; i++) {
            thisBox = list[i].container.box;
            thisType = typeDict[list[i].container.typeCode].name;
            lastIndex = boxArr.length - 1;
            if (lastIndex < 0 || boxArr[lastIndex].boxID !== thisBox || (boxArr[lastIndex].boxTime - list[i].tradeTime) !== 0) {
                boxIDArr.push(thisBox);
                boxArr.push({
                    boxID: thisBox,
                    boxTime: list[i].tradeTime,
                    phone: {
                        delivery: list[i].oriUser.phone
                    },
                    typeList: [],
                    containerList: {},
                    destinationStore: list[i].newUser.storeID
                });
            }
            nowIndex = boxArr.length - 1;
            thisBoxTypeList = boxArr[nowIndex].typeList;
            thisBoxContainerList = boxArr[nowIndex].containerList;
            if (thisBoxTypeList.indexOf(thisType) < 0) {
                thisBoxTypeList.push(thisType);
                thisBoxContainerList[thisType] = [];
            }
            thisBoxContainerList[thisType].push(list[i].container.id);
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
        var resJSON = {
            pastDelivery: boxArr
        };
        res.json(resJSON);
    });
});

router.get('/get/reloadHistory', regAsAdmin, regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var typeDict = req.app.get('containerType');
    var queryCond;
    var queryDays;
    if (req.query.days && !isNaN(parseInt(req.query.days))) queryDays = req.query.days;
    else queryDays = historyDays;
    if (dbStore.role.typeCode === 'clerk')
        queryCond = {
            '$or': [{
                'tradeType.action': 'ReadyToClean',
                'oriUser.storeID': dbStore.role.storeID
            }, {
                'tradeType.action': 'UndoReadyToClean'
            }],
            'tradeTime': {
                '$gte': dateCheckpoint(1 - queryDays)
            }
        };
    else
        queryCond = {
            'tradeType.action': {
                '$in': ['ReadyToClean', 'UndoReadyToClean']
            },
            'tradeTime': {
                '$gte': dateCheckpoint(1 - queryDays)
            }
        };
    Trade.find(queryCond, function (err, list) {
        if (err) return next(err);
        if (list.length === 0) return res.json({
            reloadHistory: []
        });
        list.sort((a, b) => a.tradeTime - b.tradeTime);
        cleanUndoTrade('ReadyToClean', list);

        var tradeTimeDict = {};
        list.forEach(aTrade => {
            if (!tradeTimeDict[aTrade.tradeTime]) tradeTimeDict[aTrade.tradeTime] = [];
            tradeTimeDict[aTrade.tradeTime].push(aTrade);
        });

        var boxDict = {};
        var boxDictKey;
        var thisTypeName;
        for (var aTradeTime in tradeTimeDict) {
            tradeTimeDict[aTradeTime].sort((a, b) => a.oriUser.storeID - b.oriUser.storeID);
            tradeTimeDict[aTradeTime].forEach(theTrade => {
                thisTypeName = typeDict[theTrade.container.typeCode].name;
                boxDictKey = `${theTrade.oriUser.storeID}-${theTrade.tradeTime}-${(theTrade.tradeType.oriState === 1)}`;
                if (!boxDict[boxDictKey])
                    boxDict[boxDictKey] = {
                        boxTime: theTrade.tradeTime,
                        typeList: [],
                        containerList: {},
                        cleanReload: (theTrade.tradeType.oriState === 1),
                        phone: (dbStore.role.typeCode === 'clerk') ? undefined : {
                            reload: theTrade.newUser.phone
                        },
                        from: (dbStore.role.typeCode === 'clerk') ? undefined : theTrade.oriUser.storeID
                    };
                if (boxDict[boxDictKey].typeList.indexOf(thisTypeName) === -1) {
                    boxDict[boxDictKey].typeList.push(thisTypeName);
                    boxDict[boxDictKey].containerList[thisTypeName] = [];
                }
                boxDict[boxDictKey].containerList[thisTypeName].push(theTrade.container.id);
            });
        }

        var boxArr = Object.values(boxDict);
        boxArr.sort((a, b) => b.boxTime - a.boxTime);
        for (var i = 0; i < boxArr.length; i++) {
            boxArr[i].containerOverview = [];
            for (var j = 0; j < boxArr[i].typeList.length; j++) {
                boxArr[i].containerOverview.push({
                    containerType: boxArr[i].typeList[j],
                    amount: boxArr[i].containerList[boxArr[i].typeList[j]].length
                });
            }
        }
        var resJSON = {
            reloadHistory: boxArr
        };
        res.json(resJSON);
    });
});

router.post('/stock/:id', regAsAdmin, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    var boxID = req.params.id;
    process.nextTick(() => {
        Box.findOne({
            'boxID': boxID
        }, function (err, aBox) {
            if (err) return next(err);
            if (!aBox) return res.status(403).json({
                code: 'F007',
                type: "stockBoxMessage",
                message: "Can't Find The Box"
            });
            aBox.stocking = true;
            aBox.save(function (err) {
                if (err) return next(err);
                return res.json({
                    type: "stockBoxMessage",
                    message: "StockBox Succeed"
                });
            });
        });
    });
});

router.post('/delivery/:id/:store', regAsAdmin, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    var boxID = req.params.id;
    var storeID = parseInt(req.params.store);
    process.nextTick(() => {
        Box.findOne({
            'boxID': boxID
        }, function (err, aBox) {
            if (err) return next(err);
            if (!aBox) return res.status(403).json({
                code: 'F007',
                type: "DeliveryMessage",
                message: "Can't Find The Box"
            });
            if (aBox.delivering) return res.status(403).json({
                code: 'F007',
                type: "DeliveryMessage",
                message: "Box Already Delivering"
            });
            changeContainersState(aBox.containerList, dbAdmin, {
                action: "Delivery",
                newState: 0
            }, {
                boxID,
                storeID
            }, {
                res,
                next,
                callback: () => {
                    aBox.delivering = true;
                    aBox.stocking = false;
                    aBox.storeID = storeID;
                    aBox.user.delivery = dbAdmin.user.phone;
                    aBox.save(function (err) {
                        if (err) return next(err);
                        /*
                        User.find({
                            'roles.clerk.storeID': storeID
                        }, function (err, userList) {
                            var funcList = [];
                            for (var i in userList) {
                                if (typeof userList[i].pushNotificationArn !== "undefined")
                                    for (var keys in userList[i].pushNotificationArn) {
                                        if (keys.indexOf('shop') >= 0)
                                            funcList.push(new Promise((resolve, reject) => {
                                                var localCtr = i;
                                                sns.sns_publish(userList[localCtr].pushNotificationArn[keys], '新容器送到囉！', '點我簽收 #' + boxID, {
                                                    action: "BOX_DELIVERY"
                                                }, (err, data, payload) => {
                                                    if (err) return resolve([userList[localCtr].user.phone, 'err', err]);
                                                    resolve([userList[localCtr].user.phone, data, payload]);
                                                });
                                            }));
                                    }
                            }
                            Promise
                                .all(funcList)
                                .then((data) => {
                                    data.forEach(element => {
                                        if (element[1] === 'err')
                                            element.forEach((ele) => {
                                                debug(ele);
                                            });
                                    });
                                })
                                .catch((err) => {
                                    if (err) debug(err);
                                });
                        });*/
                        return res.json({
                            type: "DeliveryMessage",
                            message: "Delivery Succeed"
                        });
                    });
                }
            });
        });
    });
});

router.post('/cancelDelivery/:id', regAsAdmin, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    var boxID = req.params.id;
    Box.findOne({
        'boxID': boxID
    }, function (err, aBox) {
        if (err) return next(err);
        if (!aBox) return res.status(403).json({
            code: 'F007',
            type: "CancelDeliveryMessage",
            message: "Can't Find The Box"
        });
        if (!aBox.delivering) return res.status(403).json({
            code: 'F007',
            type: "DeliveryMessage",
            message: "Box Isn't Delivering"
        });
        changeContainersState(aBox.containerList, dbAdmin, {
            action: "CancelDelivery",
            newState: 5
        }, {
            bypassStateValidation: true
        }, {
            res,
            next,
            callback: () => {
                aBox.delivering = false;
                aBox.storeID = undefined;
                aBox.user.delivery = undefined;
                aBox.save(function (err) {
                    if (err) return next(err);
                    return res.json({
                        type: "CancelDeliveryMessage",
                        message: "CancelDelivery Succeed"
                    });
                });
            }
        });
    });
});

router.post('/sign/:id', regAsStore, regAsAdmin, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var boxID = req.params.id;
    var reqByAdmin = (req._user.role.typeCode === 'admin') ? true : false;
    Box.findOne({
        'boxID': boxID
    }, function (err, aDelivery) {
        if (err) return next(err);
        if (!aDelivery)
            return res.status(403).json({
                code: 'F007',
                type: "SignMessage",
                message: "Can't Find The Box"
            });
        if (!reqByAdmin && (aDelivery.storeID !== dbStore.role.storeID))
            return res.status(403).json({
                code: 'F008',
                type: "SignMessage",
                message: "Box is not belong to user's store"
            });
        changeContainersState(aDelivery.containerList, dbStore, {
            action: "Sign",
            newState: 1
        }, {
            boxID,
            storeID: (reqByAdmin) ? aDelivery.storeID : undefined
        }, {
            res,
            next,
            callback: () => {
                Box.remove({
                    'boxID': boxID
                }, function (err) {
                    if (err) return next(err);
                    return res.json({
                        type: "SignMessage",
                        message: "Sign Succeed"
                    });
                });
            }
        });
    });
});

router.post('/rent/:id', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var key = req.headers['userapikey'];
    if (typeof key === 'undefined' || typeof key === null || key.length === 0) {
        // debug(req.headers);
        return res.status(403).json({
            code: 'F009',
            type: "borrowContainerMessage",
            message: "Invalid Rent Request"
        });
    }
    if (!res._payload.orderTime) return res.status(403).json({
        code: 'F006',
        type: "borrowContainerMessage",
        message: "Missing Order Time"
    });
    redis.get('user_token:' + key, (err, reply) => {
        if (err) return next(err);
        if (!reply) return res.status(403).json({
            code: 'F013',
            type: "borrowContainerMessage",
            message: "Rent Request Expired"
        });
        var container = req.params.id;
        if (container === "list") container = req.body.containers;
        changeContainersState(container, dbStore, {
            action: "Rent",
            newState: 2
        }, {
            rentToUser: reply,
            orderTime: res._payload.orderTime
        }, {
            res,
            next
        });
    });
});

router.post('/return/:id', regAsBot, regAsStore, regAsAdmin, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    if (!res._payload.orderTime) return res.status(403).json({
        code: 'F006',
        type: "returnContainerMessage",
        message: "Missing Order Time"
    });
    var container = req.params.id;
    if (container === "list") container = req.body.containers;
    changeContainersState(container, dbStore, {
        action: "Return",
        newState: 3
    }, {
        storeID: req.body.storeId,
        orderTime: res._payload.orderTime
    }, {
        res,
        next
    });
});

router.post('/readyToClean/:id', regAsAdmin, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    if (!res._payload.orderTime) return res.status(403).json({
        code: 'F006',
        type: "readyToCleanMessage",
        message: "Missing Order Time"
    });
    var container = req.params.id;
    if (container === "list") container = req.body.containers;
    changeContainersState(container, dbAdmin, {
        action: "ReadyToClean",
        newState: 4
    }, {
        orderTime: res._payload.orderTime
    }, {
        res,
        next
    });
});

router.post('/cleanStation/box', regAsAdmin, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    let boxID = req.body.boxId;
    const containerList = req.body.containerList;
    if (!containerList || !Array.isArray(containerList))
        return res.status(403).json({
            code: 'F011',
            type: 'BoxingMessage',
            message: 'Boxing req body invalid'
        });
    var task = function (response) {
        Box.findOne({
            'boxID': boxID
        }, function (err, aBox) {
            if (err) return next(err);
            if (aBox) return res.status(403).json({
                code: 'F012',
                type: 'BoxingMessage',
                message: 'Box is already exist'
            });
            changeContainersState(containerList, dbAdmin, {
                action: "Boxing",
                newState: 5
            }, {
                boxID
            }, {
                res,
                next,
                callback: () => {
                    const newBox = new Box({
                        boxID,
                        user: {
                            box: dbAdmin.user.phone
                        },
                        containerList
                    });
                    newBox.save(function (err) {
                        if (err) return next(err);
                        return response(newBox);
                    });
                }
            });
        });
    };
    if (typeof boxID === "undefined") {
        redis.get("boxCtr", (err, boxCtr) => {
            if (err) return next(err);
            if (boxCtr == null) boxCtr = 1;
            else boxCtr++;
            redis.set("boxCtr", boxCtr, (err, reply) => {
                if (err) return next(err);
                if (reply !== "OK") return next(reply);
                redis.expire("boxCtr", Math.floor((dateCheckpoint(1).valueOf() - Date.now()) / 1000), (err, reply) => {
                    if (err) return next(err);
                    if (reply !== 1) return next(reply);
                    var today = new Date();
                    boxID = (today.getMonth() + 1) + intReLength(today.getDate(), 2) + intReLength(boxCtr, 3);
                    task((newBox) => {
                        res.status(200).json({
                            type: 'BoxingMessage',
                            message: 'Boxing Succeeded',
                            data: newBox
                        });
                    });
                });
            });
        });
    } else task(() => {
        res.status(200).json({
            type: 'BoxingMessage',
            message: 'Boxing Succeeded'
        });
    });
});

router.post('/cleanStation/unbox/:id', regAsAdmin, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    var boxID = req.params.id;
    Box.findOne({
        'boxID': boxID
    }, function (err, aBox) {
        if (err) return next(err);
        if (!aBox) return res.status(403).json({
            code: 'F007',
            type: "UnboxingMessage",
            message: "Can't Find The Box"
        });
        changeContainersState(aBox.containerList, dbAdmin, {
            action: "Unboxing",
            newState: 4
        }, {
            bypassStateValidation: true
        }, {
            res,
            next,
            callback: () => {
                Box.remove({
                    'boxID': boxID
                }, function (err) {
                    if (err) return next(err);
                    return res.json({
                        type: "UnboxingMessage",
                        message: "Unboxing Succeed"
                    });
                });
            }
        });
    });
});

var actionCanUndo = {
    'Return': 3,
    'ReadyToClean': 4
};
router.post('/undo/:action/:id', regAsAdminManager, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    var action = req.params.action;
    var containerID = req.params.id;
    if (!(action in actionCanUndo)) return next();
    process.nextTick(() => {
        Trade.findOne({
            'container.id': containerID,
            'tradeType.action': action
        }, {}, {
            sort: {
                logTime: -1
            }
        }, function (err, theTrade) {
            if (err) return next(err);
            Container.findOne({
                'ID': containerID
            }, function (err, theContainer) {
                if (err) return next(err);
                if (!theContainer || !theTrade)
                    return res.json({
                        code: 'F002',
                        type: "UndoMessage",
                        message: 'No container found',
                        data: containerID
                    });
                if (theContainer.statusCode !== actionCanUndo[action])
                    return res.status(403).json({
                        code: 'F00?',
                        type: "UndoMessage",
                        message: "Container is not in that state"
                    });
                theContainer.conbineTo = theTrade.oriUser.phone;
                theContainer.statusCode = theTrade.tradeType.oriState;
                theContainer.storeID = ([1, 3].indexOf(theTrade.tradeType.oriState) >= 0) ? theTrade.oriUser.storeID : undefined;
                newTrade = new Trade();
                newTrade.tradeTime = Date.now();
                newTrade.tradeType = {
                    action: "Undo" + action,
                    oriState: theTrade.tradeType.newState,
                    newState: theTrade.tradeType.oriState
                };
                var tmpTradeUser = theTrade.newUser;
                newTrade.newUser = theTrade.oriUser;
                newTrade.newUser.undoBy = dbAdmin.user.phone;
                newTrade.oriUser = tmpTradeUser;
                newTrade.oriUser.undoBy = undefined;
                newTrade.container = {
                    id: containerID,
                    typeCode: theContainer.typeCode,
                    cycleCtr: theContainer.cycleCtr
                };
                newTrade.save((err) => {
                    if (err) return next(err);
                    theContainer.save((err) => {
                        if (err) return next(err);
                        res.json({
                            type: "UndoMessage",
                            message: "Undo " + action + " Succeeded"
                        });
                    });
                });
            });
        });
    });
});


router.get('/challenge/token', regAsBot, regAsStore, regAsAdmin, validateRequest, generateSocketToken);

var actionTodo = ['Delivery', 'Sign', 'Rent', 'Return', 'ReadyToClean', 'Boxing', 'dirtyReturn'];
router.get('/challenge/:action/:id', regAsStore, regAsAdmin, validateRequest, function (req, res, next) {
    var action = req.params.action;
    var containerID = parseInt(req.params.id);
    var newState = actionTodo.indexOf(action);
    if (newState === -1) return next();
    req.headers['if-none-match'] = 'no-match-for-this';
    if (DEMO_CONTAINER_ID_LIST.indexOf(containerID) !== -1)
        return res.json({
            type: "ChallengeMessage",
            message: "Can be " + action
        });
    process.nextTick(() => {
        Container.findOne({
            'ID': containerID
        }, function (err, theContainer) {
            if (err) return next(err);
            if (!theContainer)
                return res.status(403).json({
                    code: 'F002',
                    type: "ChallengeMessage",
                    message: 'No container found',
                    data: containerID
                });
            validateStateChanging(false, theContainer.statusCode, newState, function (succeed) {
                if (!succeed) {
                    return res.status(403).json({
                        code: 'F001',
                        type: "ChallengeMessage",
                        message: "Can NOT be " + action,
                        stateExplanation: status,
                        listExplanation: ["containerID", "originalState", "newState"],
                        errorList: [
                            [containerID, theContainer.statusCode, newState]
                        ],
                        errorDict: [{
                            containerID: containerID,
                            originalState: theContainer.statusCode,
                            newState: newState
                        }]
                    });
                } else {
                    return res.json({
                        type: "ChallengeMessage",
                        message: "Can be " + action
                    });
                }
            });
        });
    });
});

router.post('/add/:id/:type', function (req, res, next) {
    var id = req.params.id;
    var typeCode = req.params.type;
    process.nextTick(function () {
        Container.findOne({
            'ID': id
        }, function (err, container) {
            if (err)
                return next(err);
            if (container) {
                return res.status(403).json({
                    type: 'addContainerMessage',
                    message: 'That ID is already exist.'
                });
            } else {
                var newContainer = new Container();
                newContainer.ID = id;
                newContainer.typeCode = typeCode;
                newContainer.statusCode = 4;
                newContainer.conbineTo = '0900000000';
                newContainer.save(function (err) { // save the container
                    if (err) return next(err);
                    res.status(200).json({
                        type: 'addContainerMessage',
                        message: 'Add succeeded'
                    });
                });
            }
        });
    });
});

module.exports = router;