var express = require('express');
var router = express.Router();
var jwt = require('jwt-simple');
var fs = require('fs');
var debug = require('debug')('goodtogo_backend:containers');

var Box = require('../models/DB/boxDB');
var Container = require('../models/DB/containerDB');
var Trade = require('../models/DB/tradeDB');
var User = require('../models/DB/userDB');

var keys = require('../config/keys');
var wetag = require('../models/toolKit').wetag;
var validateDefault = require('../models/validateDefault');
var validateRequest = require('../models/validateRequest').JWT;
var regAsStore = require('../models/validateRequest').regAsStore;
var regAsAdmin = require('../models/validateRequest').regAsAdmin;
var dateCheckpoint = require('../models/toolKit').dateCheckpoint;

var status = ['delivering', 'readyToUse', 'rented', 'returned', 'notClean', 'boxed'];

var typeDict;
fs.readFile("./assets/json/containerType.json", 'utf8', function(err, data) {
    if (err) throw err;
    typeDict = JSON.parse(data);
});

router.all('/:id', function(req, res) {
    // debug("Redirect to official website.");
    res.writeHead(301, { Location: 'http://goodtogo.tw' });
    res.end();
});

router.get('/get/list', validateDefault, function(req, res, next) {
    Container.find(function(err, list) {
        if (err) return next(err);
        var tmpArr = [];
        var date = new Date();
        var payload = { 'iat': Date.now(), 'exp': date.setMinutes(date.getMinutes() + 5) };
        var token = jwt.encode(payload, keys.serverSecretKey());
        res.set('etag', wetag([list, typeDict]));
        for (var i = 0; i < typeDict.containers.length; i++) {
            var tmpIcon = {};
            for (var key in typeDict.containers[i].icon) {
                tmpIcon[key] = typeDict.containers[i].icon[key] + "/" + token;
            }
            tmpArr.push({
                typeCode: typeDict.containers[i].typeCode,
                name: typeDict.containers[i].name,
                version: typeDict.containers[i].version,
                icon: tmpIcon
            });
        }
        var resJSON = {
            containerType: tmpArr,
            containerDict: {}
        };
        delete tmpArr
        for (var i = 0; i < list.length; i++) {
            resJSON.containerDict[list[i].ID] = typeDict.containers[list[i].typeCode].name;
        }
        res.json(resJSON);
    });
});

router.get('/get/toDelivery', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    process.nextTick(function() {
        Container.find(function(err, list) {
            if (err) return next(err);
            var containerDict = {};
            for (var i = 0; i < list.length; i++) {
                containerDict[list[i].ID] = typeDict.containers[list[i].typeCode].name;
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
                        boxTime: boxList[i].createdAt,
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
                boxArr.sort((a, b) => { return b.boxTime - a.boxTime })
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
    Trade.find({ 'tradeType.action': 'Sign', 'tradeTime': { '$gte': dateCheckpoint(-6) } }, function(err, list) {
        if (err) return next(err);
        if (list.length === 0) return res.json({ pastDelivery: [] });
        list.sort((a, b) => { return b.logTime - a.logTime })
        var boxArr = [];
        var boxIDArr = [];
        var thisBox;
        var thisBoxTypeList;
        var thisBoxContainerList;
        var lastIndex;
        var nowIndex;
        for (var i = 0; i < list.length; i++) {
            thisBox = list[i].container.box;
            thisType = typeDict.containers[list[i].container.typeCode].name;
            lastIndex = boxArr.length - 1;
            if (lastIndex < 0 || boxArr[lastIndex].boxID !== thisBox || (boxArr[lastIndex].boxTime - list[i].tradeTime) !== 0) {
                boxIDArr.push(thisBox);
                boxArr.push({
                    boxID: thisBox,
                    boxTime: list[i].tradeTime,
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

router.post('/delivery/:id/:store', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    var boxID = req.params.id;
    var storeID = req.params.store;
    process.nextTick(() => {
        Box.findOne({ 'boxID': boxID }, function(err, aBox) {
            if (err) return next(err);
            if (!aBox) return res.status(404).json({ "type": "DeliveryMessage", "message": "Can't Find The Box" });
            promiseMethod(res, next, dbAdmin, 'Delivery', 0, false, null, aBox.containerList, () => {
                aBox.delivering = true;
                aBox.storeID = storeID;
                aBox.save(function(err) {
                    if (err) return next(err);
                    return res.json({ "type": "DeliveryMessage", "message": "Delivery Succeed" });
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
            if (!aBox) return res.status(404).json({ "type": "CancelDeliveryMessage", "message": "Can't Find The Box" });
            promiseMethod(res, next, dbAdmin, 'CancelDelivery', 5, true, null, aBox.containerList, () => {
                aBox.delivering = false;
                aBox.storeID = undefined;
                aBox.save(function(err) {
                    if (err) return next(err);
                    return res.json({ "type": "CancelDeliveryMessage", "message": "CancelDelivery Succeed" });
                });
            });
        });
    });
});

router.post('/sign/:id', regAsStore, validateRequest, function(req, res, next) {
    var dbStore = req._user;
    if (dbStore.status) return next(dbStore);
    var boxID = req.params.id;
    res._payload.orderTime = Date.now();
    process.nextTick(() => {
        Box.findOne({ 'boxID': boxID }, function(err, aDelivery) {
            if (err) return next(err);
            if (!aDelivery)
                return res.status(404).json({
                    "type": "SignMessage",
                    "message": "Box is not found."
                });
            if (aDelivery.storeID !== dbStore.role.storeID)
                return res.status(401).json({
                    "type": "SignMessage",
                    "message": "Box not belone to the store which user's store."
                });
            promiseMethod(res, next, dbStore, 'Sign', 1, false, boxID, aDelivery.containerList, () => {
                Box.remove({ 'boxID': boxID }, function(err) {
                    if (err) return next(err);
                    return res.json({ "type": "SignMessage", "message": "Sign Succeed" });
                });
            });
        });
    });
});

router.post('/rent/:id', regAsStore, validateRequest, function(req, res, next) {
    var dbStore = req._user;
    if (dbStore.status) return next(dbStore);
    var key = req.headers['userapikey'];
    if (typeof key === 'undefined' || typeof key === null) {
        debug(req.headers);
        return res.status(401).json({
            "type": "borrowContainerMessage",
            "message": "Invalid Request"
        });
    }
    if (!res._payload.orderTime) return res.status(401).json({ "type": "borrowContainerMessage", "message": "Missing Time" });
    var id = req.params.id;
    process.nextTick(() => changeState(false, id, dbStore, 'Rent', 2, res, next, key));
});

router.post('/return/:id', regAsStore, validateRequest, function(req, res, next) {
    var dbStore = req._user;
    if (dbStore.status) return next(dbStore);
    if (!res._payload.orderTime) return res.status(401).json({ "type": "returnContainerMessage", "message": "Missing Time" });
    var id = req.params.id;
    process.nextTick(() => changeState(false, id, dbStore, 'Return', 3, res, next));
});

router.post('/readyToClean/:id', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    if (!res._payload.orderTime) return res.status(401).json({ "type": "readyToCleanMessage", "message": "Missing Time" });
    var id = req.params.id;
    process.nextTick(() => changeState(false, id, dbAdmin, 'ReadyToClean', 4, res, next));
});

router.post('/cleanStation/box', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    var body = req.body;
    if (!body.containerList || !body.boxId)
        return res.status(401).json({ type: 'BoxingMessage', message: 'Req body incomplete' });
    process.nextTick(() => {
        Box.findOne({ 'boxID': body.boxId }, function(err, aBox) {
            if (err) return next(err);
            if (aBox) return res.status(401).json({ type: 'BoxingMessage', message: 'Box is already exist' });
            promiseMethod(res, next, dbAdmin, 'Boxing', 5, false, null, body.containerList, () => {
                newBox = new Box();
                newBox.boxID = body.boxId;
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
            if (!aBox) return res.status(404).json({ "type": "UnboxingMessage", "message": "Can't Find The Box" });
            promiseMethod(res, next, dbAdmin, 'Unboxing', 4, true, null, aBox.containerList, () => {
                Box.remove({ 'boxID': boxID }, function(err) {
                    if (err) return next(err);
                    return res.json({ "type": "UnboxingMessage", "message": "Unboxing Succeed" });
                });
            });
        });
    });
});

function promiseMethod(res, next, dbAdmin, action, newState, bypass, boxID, containerList, lastFunc) {
    var funcList = [];
    for (var i = 0; i < containerList.length; i++) {
        funcList.push(
            new Promise((resolve, reject) => {
                changeState(resolve, containerList[i], dbAdmin, action, newState, res, reject, boxID, bypass);
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
                Promise.all(saveFuncList).then(lastFunc).catch((err) => { next(err) })
            } else {
                return res.status(403).json({
                    "type": action + "Message",
                    "message": action + " Error",
                    "stateExplanation": status,
                    "listExplanation": ["containerID", "originalState", "newState"],
                    "errorList": errIdList
                });
            }
        })
        .catch((err) => {
            if (err) {
                debug(err);
                return next(err);
            }
        });
}

function changeState(resolve, id, dbNew, action, newState, res, next, key = null, bypass = false) {
    var messageType = action + 'Message';
    Container.findOne({ 'ID': id }, function(err, container) {
        if (err)
            return next(err);
        if (!container)
            return res.status(404).json({ type: messageType, message: 'No container found.' });
        if (!container.active)
            return res.status(500).json({ type: messageType, message: 'Container not available.' });
        if (action === 'Rent')
            if (container.storeID !== dbNew.role.storeID)
                return res.status(403).json({
                    'type': messageType,
                    'message': 'Container not belone to this store.'
                });
        validateStateChanging(bypass, container.statusCode, newState, function(succeed, err) {
            if (!succeed) {
                if (resolve !== false)
                    return resolve([false, id, container.statusCode, newState]);
                if (err)
                    return res.status(500).json({
                        type: messageType,
                        message: 'Container Origin State Unusual. Origin Status Code: ' + container.statusCode
                    });
                return res.status(403).json({
                    "type": messageType,
                    "message": action + " Error",
                    "stateExplanation": status,
                    "listExplanation": ["containerID", "originalState", "newState"],
                    "errorList": [id, container.statusCode, newState]
                });
            }
            var userQuery = {};
            if (action === 'Rent') userQuery = { 'user.apiKey': key };
            else userQuery = { 'user.phone': container.conbineTo };
            User.findOne(userQuery, function(err, dbOri) {
                if (err) return next(err);
                if (!dbOri) {
                    debug('Return unexpect err. Data : ' + JSON.stringify(container) +
                        ' ID in uri : ' + id);
                    if (resolve !== false) next();
                    return res.status(500).json({ type: messageType, message: 'No user found.' });
                } else if (!dbOri.active) {
                    if (resolve !== false) next();
                    return res.status(401).json({ type: messageType, message: 'User has Banned' });
                }
                if (action === 'Rent') {
                    var tmp = dbOri;
                    dbOri = dbNew;
                    dbNew = tmp;
                }
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
                if (action === 'Sign') newTrade.container.box = key;
                container.statusCode = newState;
                container.conbineTo = dbNew.user.phone;
                if (action === 'Delivery') container.cycleCtr++;
                else if (action === 'CancelDelivery') container.cycleCtr--;
                if (action === 'Sign') container.storeID = dbNew.role.storeID;
                else {
                    if (typeof container.storeID === 'Number') container.storeID = undefined;
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
                    saveAll(() => res.status(200).json({ type: messageType, message: action + ' Succeeded' }), next, newTrade)
                } else {
                    var tmpTrade = new Object(newTrade)
                    resolve([true, function(cb, cb2) {
                        saveAll(cb, cb2, tmpTrade)
                    }]);
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
            if (newState <= 2 || newState === 5)
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
            return callback(false, true);
            break;
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