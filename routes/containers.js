var express = require('express');
var router = express.Router();
var jwt = require('jwt-simple');
var debug = require('debug')('goodtogo_backend:containers');

var Box = require('../models/DB/boxDB');
var Container = require('../models/DB/containerDB');
var Trade = require('../models/DB/tradeDB');
var User = require('../models/DB/userDB');

var keys = require('../config/keys');
var sns = require('../models/SNS');
var wetag = require('../models/toolKit').wetag;
var intReLength = require('../models/toolKit').intReLength;
var validateDefault = require('../models/validation/validateDefault');
var validateRequest = require('../models/validation/validateRequest').JWT;
var regAsStore = require('../models/validation/validateRequest').regAsStore;
var regAsAdmin = require('../models/validation/validateRequest').regAsAdmin;
var dateCheckpoint = require('../models/toolKit').dateCheckpoint;

var iconBaseUrl;
if (process.env.NODE_ENV === "testing") {
    iconBaseUrl = "https://app.goodtogo.tw/test/images/icon/";
} else {
    iconBaseUrl = "https://app.goodtogo.tw/images/icon/";
}

const historyDays = 14;
var status = ['delivering', 'readyToUse', 'rented', 'returned', 'notClean', 'boxed'];

router.all('/:id', function(req, res) {
    // debug("Redirect to official website.");
    res.writeHead(301, { Location: 'http://goodtogo.tw' });
    res.end();
});

router.get('/get/list', validateDefault, function(req, res, next) {
    var typeDict = req.app.get('containerType');
    var containerDict = req.app.get('container');
    var tmpIcon = {};
    var tmpArr = [];
    var date = new Date();
    var payload = { 'iat': Date.now(), 'exp': date.setMinutes(date.getMinutes() + 5) };
    keys.serverSecretKey((err, key) => {
        var token = jwt.encode(payload, key);
        res.set('etag', wetag([containerDict, typeDict]));
        for (var i = 0; i < typeDict.length; i++) {
            tmpIcon = {};
            for (var j = 1; j <= 3; j++) {
                tmpIcon[j + 'x'] = iconBaseUrl + intReLength(typeDict[i].typeCode, 2) + "_" + j + "x" + "/" + token;
            }
            tmpArr.push({
                typeCode: typeDict[i].typeCode,
                name: typeDict[i].name,
                version: typeDict[i].version,
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

router.get('/get/toDelivery', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    var typeDict = req.app.get('containerType');
    process.nextTick(function() {
        Container.find(function(err, list) {
            if (err) return next(err);
            var containerDict = {};
            for (var i = 0; i < list.length; i++) {
                containerDict[list[i].ID] = typeDict[list[i].typeCode].name;
            }
            Box.find(function(err, boxList) {
                if (err) return next(err);
                if (boxList.length === 0) return res.json({ toDelivery: [] });
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
                boxArr.sort((a, b) => { return b.boxTime - a.boxTime; });
                var resJSON = {
                    toDelivery: boxArr
                };
                res.json(resJSON);
            });
        });
    });
});

router.get('/get/deliveryHistory', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    var typeDict = req.app.get('containerType');
    Trade.find({ 'tradeType.action': 'Sign', 'tradeTime': { '$gte': dateCheckpoint(1 - historyDays) } }, function(err, list) {
        if (err) return next(err);
        if (list.length === 0) return res.json({ pastDelivery: [] });
        list.sort((a, b) => { return b.logTime - a.logTime; });
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
                    phone: { delivery: list[i].oriUser.phone },
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

router.get('/get/reloadHistory', regAsAdmin, regAsStore, validateRequest, function(req, res, next) {
    var dbStore = req._user;
    if (dbStore.status) return next(dbStore);
    var typeDict = req.app.get('containerType');
    var queryCond = { 'tradeType.action': 'ReadyToClean', 'tradeTime': { '$gte': dateCheckpoint(1 - historyDays) } };
    if (dbStore.role.typeCode === 'clerk') queryCond['oriUser.storeID'] = dbStore.role.storeID;
    Trade.find(queryCond, function(err, list) {
        if (err) return next(err);
        if (list.length === 0) return res.json({ reloadHistory: [] });
        list.sort((a, b) => { return b.tradeTime - a.tradeTime; });
        var boxArr = [];
        var thisBoxTypeList;
        var thisBoxContainerList;
        var lastIndex;
        var nowIndex;
        var thisType;
        for (var i = 0; i < list.length; i++) {
            thisType = typeDict[list[i].container.typeCode].name;
            lastIndex = boxArr.length - 1;
            if (lastIndex < 0 || Math.abs(boxArr[lastIndex].boxTime - list[i].tradeTime) > 100) {
                boxArr.push({
                    boxTime: list[i].tradeTime,
                    typeList: [],
                    containerList: {},
                    cleanReload: (list[i].tradeType.oriState === 1),
                    phone: (dbStore.role.typeCode === 'clerk') ? undefined : { reload: list[i].newUser.phone },
                    from: (dbStore.role.typeCode === 'clerk') ? undefined : list[i].oriUser.storeID
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
            reloadHistory: boxArr
        };
        res.json(resJSON);
    });
});

router.post('/delivery/:id/:store', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    var boxID = req.params.id;
    var storeID = req.params.store;
    process.nextTick(() => {
        Box.findOne({ 'boxID': boxID }, function(err, aBox) {
            if (err) return next(err);
            if (!aBox) return res.status(403).json({ code: 'F007', type: "DeliveryMessage", message: "Can't Find The Box" });
            promiseMethod(res, next, dbAdmin, 'Delivery', 0, false, null, aBox.containerList, () => {
                aBox.delivering = true;
                aBox.storeID = storeID;
                aBox.user.delivery = dbAdmin.user.phone;
                aBox.save(function(err) {
                    if (err) return next(err);
                    User.find({ 'role.storeID': storeID }, function(err, userList) {
                        var funcList = [];
                        for (var i in userList) {
                            if (typeof userList[i].pushNotificationArn !== "undefined")
                                for (var keys in userList[i].pushNotificationArn) {
                                    if (keys.indexOf('shop') >= 0)
                                        funcList.push(new Promise((resolve, reject) => {
                                            var localCtr = i;
                                            sns.sns_publish(userList[localCtr].pushNotificationArn[keys], '新容器送到囉！', '點我簽收 #' + boxID, "BOX_DELIVERY", (err, data, payload) => {
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
                                        element[1].forEach((ele) => {
                                            console.log(ele);
                                        });
                                });
                            })
                            .catch((err) => { if (err) debug(err); });
                    });
                    return res.json({ type: "DeliveryMessage", message: "Delivery Succeed" });
                });
            });
        });
    });
});

router.post('/cancelDelivery/:id', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    var boxID = req.params.id;
    process.nextTick(() => {
        Box.findOne({ 'boxID': boxID }, function(err, aBox) {
            if (err) return next(err);
            if (!aBox) return res.status(403).json({ code: 'F007', type: "CancelDeliveryMessage", message: "Can't Find The Box" });
            promiseMethod(res, next, dbAdmin, 'CancelDelivery', 5, true, null, aBox.containerList, () => {
                aBox.delivering = false;
                aBox.storeID = undefined;
                aBox.user.delivery = undefined;
                aBox.save(function(err) {
                    if (err) return next(err);
                    return res.json({ type: "CancelDeliveryMessage", message: "CancelDelivery Succeed" });
                });
            });
        });
    });
});

router.post('/sign/:id', regAsStore, regAsAdmin, validateRequest, function(req, res, next) {
    var dbStore = req._user;
    if (dbStore.status) return next(dbStore);
    var boxID = req.params.id;
    var reqByAdmin = (req._user.role.typeCode === 'admin') ? true : false;
    res._payload.orderTime = Date.now();
    process.nextTick(() => {
        Box.findOne({ 'boxID': boxID }, function(err, aDelivery) {
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
            promiseMethod(res, next, dbStore, 'Sign', 1, false, { boxID: boxID, storeID: (reqByAdmin) ? aDelivery.storeID : undefined }, aDelivery.containerList, () => {
                Box.remove({ 'boxID': boxID }, function(err) {
                    if (err) return next(err);
                    return res.json({ type: "SignMessage", message: "Sign Succeed" });
                });
            });
        });
    });
});

router.post('/rent/:id', regAsStore, validateRequest, function(req, res, next) {
    var dbStore = req._user;
    if (dbStore.status) return next(dbStore);
    var key = req.headers['userapikey'];
    if (typeof key === 'undefined' || typeof key === null || key.length === 0) {
        // debug(req.headers);
        return res.status(403).json({
            code: 'F009',
            type: "borrowContainerMessage",
            message: "Invalid Rent Request"
        });
    }
    if (!res._payload.orderTime) return res.status(403).json({ code: 'F006', type: "borrowContainerMessage", message: "Missing Order Time" });
    var id = req.params.id;
    var redis = req.app.get('redis');
    redis.get('user_token:' + key, (err, reply) => {
        if (err) return next(err);
        if (!reply) return res.status(403).json({
            code: 'F013',
            type: "borrowContainerMessage",
            message: "Rent Request Expired"
        });
        process.nextTick(() => changeState(false, id, dbStore, 'Rent', 2, res, next, reply));
    });
});

router.post('/return/:id', regAsStore, regAsAdmin, validateRequest, function(req, res, next) {
    var dbStore = req._user;
    if (dbStore.status) return next(dbStore);
    if (!res._payload.orderTime) return res.status(403).json({ code: 'F006', type: "returnContainerMessage", message: "Missing Order Time" });
    var id = req.params.id;
    var storeId = (typeof req.body['storeId'] !== 'undefined') ? req.body['storeId'] : null;
    process.nextTick(() => changeState(false, id, dbStore, 'Return', 3, res, next, storeId));
});

router.post('/readyToClean/:id', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    if (!res._payload.orderTime) return res.status(403).json({ code: 'F006', type: "readyToCleanMessage", message: "Missing Order Time" });
    var id = req.params.id;
    var storeId = (typeof req.body['storeId'] !== 'undefined') ? req.body['storeId'] : null;
    process.nextTick(() => changeState(false, id, dbAdmin, 'ReadyToClean', 4, res, next, storeId));
});

router.post('/cleanStation/box', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    var body = req.body;
    if (!body.containerList || !body.boxId)
        return res.status(403).json({ code: 'F011', type: 'BoxingMessage', message: 'Boxing req body incomplete' });
    process.nextTick(() => {
        Box.findOne({ 'boxID': body.boxId }, function(err, aBox) {
            if (err) return next(err);
            if (aBox) return res.status(403).json({ code: 'F012', type: 'BoxingMessage', message: 'Box is already exist' });
            promiseMethod(res, next, dbAdmin, 'Boxing', 5, false, null, body.containerList, () => {
                newBox = new Box();
                newBox.boxID = body.boxId;
                newBox.user.box = dbAdmin.user.phone;
                newBox.containerList = body.containerList;
                newBox.save(function(err) {
                    if (err) return next(err);
                    return res.status(200).json({ type: 'BoxingMessage', message: 'Boxing Succeeded' });
                });
            });
        });
    });
});

router.post('/cleanStation/unbox/:id', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    var boxID = req.params.id;
    process.nextTick(() => {
        Box.findOne({ 'boxID': boxID }, function(err, aBox) {
            if (err) return next(err);
            if (!aBox) return res.status(403).json({ code: 'F007', type: "UnboxingMessage", message: "Can't Find The Box" });
            promiseMethod(res, next, dbAdmin, 'Unboxing', 4, true, null, aBox.containerList, () => {
                Box.remove({ 'boxID': boxID }, function(err) {
                    if (err) return next(err);
                    return res.json({ type: "UnboxingMessage", message: "Unboxing Succeed" });
                });
            });
        });
    });
});

function promiseMethod(res, next, dbAdmin, action, newState, bypass, options, containerList, lastFunc) {
    var funcList = [];
    for (var i = 0; i < containerList.length; i++) {
        funcList.push(
            new Promise((resolve, reject) => {
                changeState(resolve, containerList[i], dbAdmin, action, newState, res, reject, options, bypass);
            })
        );
    }
    Promise
        .all(funcList)
        .then((data) => {
            var errIdList = [];
            var saveFuncList = [];
            var hasErr = false;
            for (var i = 0; i < data.length; i++) {
                if (!data[i][0]) {
                    hasErr = true;
                    errIdList.push([data[i][1], data[i][2], data[i][3]]);
                }
            }
            if (!hasErr) {
                for (var i = 0; i < data.length; i++) {
                    saveFuncList.push(new Promise(data[i][1]));
                }
                Promise.all(saveFuncList).then(lastFunc).catch((err) => { next(err); });
            } else {
                return res.status(403).json({
                    code: 'F001',
                    type: action + "Message",
                    message: action + " Error",
                    stateExplanation: status,
                    listExplanation: ["containerID", "originalState", "newState"],
                    errorList: errIdList
                });
            }
        })
        .catch((err) => {
            if (err) {
                if (typeof err.code === 'string') return res.status(403).json(err);
                else {
                    debug(err);
                    return next(err);
                }
            }
        });
}

function changeState(resolve, id, dbNew, action, newState, res, next, key = null, bypass = false) {
    var messageType = action + 'Message';
    var tmpStoreId;
    Container.findOne({ 'ID': id }, function(err, container) {
        if (err)
            return next(err);
        if (!container) {
            var errData = { code: 'F002', type: messageType, message: 'No container found', data: id };
            if (resolve !== false) return next(errData);
            else return res.status(403).json(errData);
        } else if (!container.active) {
            var errData = { code: 'F003', type: messageType, message: 'Container not available', data: id };
            if (resolve !== false) return next(errData);
            else return res.status(403).json(errData);
        }
        if (action === 'Rent' && container.storeID !== dbNew.role.storeID) {
            return res.status(403).json({
                code: 'F010',
                type: messageType,
                message: "Container not belone to user's store"
            });
        } else if (action === 'Return' && key !== null) {
            if (container.statusCode === 3) // 髒杯回收時已經被歸還過
                return res.json({ type: "ReturnMessage", message: "Already Return" });
            else // 髒杯回收
                tmpStoreId = key;
        } else if (action === 'ReadyToClean' && key !== null) { // 髒杯回收
            tmpStoreId = key;
        } else if (action === 'Sign' && typeof key.storeID !== 'undefined') { // 正興街配送
            tmpStoreId = key.storeID;
        }
        validateStateChanging(bypass, container.statusCode, newState, function(succeed) {
            if (!succeed) {
                if (resolve !== false)
                    return resolve([false, id, container.statusCode, newState]);
                return res.status(403).json({
                    code: 'F001',
                    type: messageType,
                    message: action + " Error",
                    stateExplanation: status,
                    listExplanation: ["containerID", "originalState", "newState"],
                    errorList: [
                        [id, container.statusCode, newState]
                    ]
                });
            }
            var userQuery = {};
            User.findOne({ 'user.phone': (action === 'Rent') ? key : container.conbineTo }, function(err, dbOri) {
                if (err) return next(err);
                if (!dbOri) {
                    debug('Return unexpect err. Data : ' + JSON.stringify(container) +
                        ' ID in uri : ' + id);
                    return res.status(403).json({ code: 'F004', type: messageType, message: 'No user found' });
                } else if (!dbOri.active) {
                    return res.status(403).json({ code: 'F005', type: messageType, message: 'User has Banned' });
                }
                if (action === 'Rent') {
                    var tmp = dbOri;
                    dbOri = dbNew;
                    dbNew = tmp;
                } else if ((action === 'Return' || action === 'Sign') && typeof tmpStoreId !== 'undefined') {
                    dbNew.role.storeID = tmpStoreId; // 正興街代簽收
                } else if (action === 'ReadyToClean') {
                    if (typeof tmpStoreId !== 'undefined' && tmpStoreId !== -1) {
                        dbOri.role.storeID = tmpStoreId;
                    } else if (container.statusCode === 1 && dbOri.role.typeCode === 'admin') { // 乾淨回收
                        dbOri.role.storeID = container.storeID;
                    }
                }
                try {
                    newTrade = new Trade();
                    newTrade.tradeTime = res._payload.orderTime || Date.now();
                    newTrade.tradeType = {
                        action: action,
                        oriState: container.statusCode,
                        newState: newState
                    };
                    newTrade.oriUser = {
                        type: dbOri.role.typeCode,
                        storeID: dbOri.role.storeID,
                        phone: dbOri.user.phone
                    };
                    newTrade.newUser = {
                        type: dbNew.role.typeCode,
                        storeID: dbNew.role.storeID,
                        phone: dbNew.user.phone
                    };
                    newTrade.container = {
                        id: container.ID,
                        typeCode: container.typeCode,
                        cycleCtr: container.cycleCtr
                    };
                    if (action === 'Sign') newTrade.container.box = key.boxID;
                    container.statusCode = newState;
                    container.conbineTo = dbNew.user.phone;
                    if (action === 'Delivery') container.cycleCtr++;
                    else if (action === 'CancelDelivery') container.cycleCtr--;
                    if (action === 'Sign' || action === 'Return') {
                        container.storeID = dbNew.role.storeID;
                    } else {
                        container.storeID = undefined;
                    }

                    function saveAll(callback, callback2, tmpTrade) {
                        tmpTrade.save(function(err) {
                            if (err) return callback2(err);
                            container.save(function(err) {
                                if (err) return callback2(err);
                                return callback();
                            });
                        });
                    }

                    if (resolve === false) {
                        saveAll(() => res.status(200).json({ type: messageType, message: action + ' Succeeded' }), next, newTrade);
                    } else {
                        var tmpTrade = new Object(newTrade);
                        resolve([true, function(cb, cb2) {
                            saveAll(cb, cb2, tmpTrade);
                        }, tmpTrade]);
                    }
                } catch (err) {
                    debug('#dbNew: ', JSON.stringify(dbNew), ', #dbOri: ', JSON.stringify(dbOri), ', #newTrade: ', JSON.stringify(newTrade));
                    next(err);
                }
            });
        });
    });
}

function validateStateChanging(bypass, oriState, newState, callback) {
    if (bypass) return callback(true);
    switch (oriState) {
        case 0: // delivering
            if (newState !== 1)
                return callback(false);
            break;
        case 1: // readyToUse
            if (newState <= 1 || newState === 5)
                return callback(false);
            break;
        case 2: // rented
            if (newState !== 3)
                return callback(false);
            break;
        case 3: // returned
            if (newState !== 4)
                return callback(false);
            break;
        case 4: // notClean
            if (newState !== 5)
                return callback(false);
            break;
        case 5: // boxed
            if (newState !== 0)
                return callback(false);
            break;
        default:
            return callback(false);
    }
    callback(true);
}

router.post('/add/:id/:type', function(req, res, next) {
    var id = req.params.id;
    var typeCode = req.params.type;
    process.nextTick(function() {
        Container.findOne({ 'ID': id }, function(err, container) {
            if (err)
                return next(err);
            if (container) {
                return res.status(403).json({ type: 'addContainerMessage', message: 'That ID is already exist.' });
            } else {
                var newContainer = new Container();
                newContainer.ID = id;
                newContainer.typeCode = typeCode;
                newContainer.statusCode = 4;
                newContainer.conbineTo = '0936111000';
                newContainer.save(function(err) { // save the container
                    if (err)
                        throw err;
                    res.status(200).json({ type: 'addContainerMessage', message: 'Add succeeded' });
                    return;
                });
            }
        });
    });
});

module.exports = router;