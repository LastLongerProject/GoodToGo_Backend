var express = require('express');
var router = express.Router();
var fs = require('fs');

var debug = require('debug')('goodtogo_backend:containers');
var Delivery = require('../models/DB/deliveringDB');
var Container = require('../models/DB/containerDB');
var Trade = require('../models/DB/tradeDB');
var User = require('../models/DB/userDB');
var validateRequest = require('../models/validateRequest').JWT;
var regAsStore = require('../models/validateRequest').regAsStore;
var regAsAdmin = require('../models/validateRequest').regAsAdmin;

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

router.get('/get/list', regAsStore, validateRequest, function(dbStore, req, res, next) {
    if (dbStore.status) return next(dbStore);
    Container.find(function(err, list) {
        if (err) return next(err);
        var resJSON = {
            containerDict: {}
        };
        for (var i = 0; i < list.length; i++) {
            resJSON.containerDict[list[i].ID] = typeDict.containers[list[i].typeCode].name;
        }
        res.json(resJSON);
    });
});

router.get('/get/toDelivery', regAsAdmin, validateRequest, function(dbAdmin, req, res, next) {
    if (dbAdmin.status) return next(dbAdmin);
    process.nextTick(function() {
        Delivery.find(function(err, deliveryList) {
            if (err) return next(err);
            var deliveryDict = {};
            for (var i = 0; i < deliveryList.length; i++) {
                deliveryDict[deliveryList[i].boxID] = deliveryList[i].storeID;
            }
            Container.find({ 'statusCode': 0 }, function(err, list) {
                if (err) return next(err);
                var boxArr = [];
                var thisBox;
                var thisBoxContainerList;
                for (var i = 0; i < list.length; i++) {
                    thisBox = list[i].conbineTo;
                    thisType = list[i].typeCode;
                    if (boxArr.indexOf(thisBox) < 0) {
                        boxArr.push({
                            boxID: thisBox,
                            time: list[i].updatetime,
                            containerList: [],
                            isDelivering: false,
                            destinationStore: deliveryDict[thisBox]
                        });
                    }
                    thisBoxContainerList = boxArr[boxArr.indexOf(thisBox)].containerList;
                    if (thisBoxContainerList.indexOf(thisType) < 0) {
                        thisBoxContainerList.push({
                            containerType: thisType,
                            list: []
                        });
                    }
                    thisBoxContainerList[thisBoxContainerList.indexOf(thisType)].list.push(list[i].ID);
                }
                Container.find({ 'statusCode': 5 }, function(err, list) {
                    if (err) return next(err);
                    for (var i = 0; i < list.length; i++) {
                        thisBox = list[i].conbineTo;
                        thisType = list[i].typeCode;
                        if (boxArr.indexOf(thisBox) < 0) {
                            boxArr.push({
                                boxID: thisBox,
                                time: list[i].updatetime,
                                containerList: [],
                                isDelivering: true,
                                destinationStore: null
                            });
                        }
                        thisBoxContainerList = boxArr[boxArr.indexOf(thisBox)].containerList;
                        if (thisBoxContainerList.indexOf(thisType) < 0) {
                            thisBoxContainerList.push({
                                containerType: thisType,
                                list: []
                            });
                        }
                        thisBoxContainerList[thisBoxContainerList.indexOf(thisType)].list.push(list[i].ID);
                    }
                    for (var i = 0; i < boxArr.length; i++) {
                        boxArr[i].containerOverview = [];
                        for (var j = 0; j < boxArr[i].containerList.length; j++) {
                            boxArr[i].containerOverview.push({
                                containerType: boxArr[i].containerList[j].containerType,
                                amount: boxArr[i].containerList[j].list.length
                            });
                        }
                    }
                    var resJSON = {
                        typeCodeDict: typeDict,
                        toDelivery: boxArr
                    };
                    res.json(resJSON);
                });
            });
        });
    });
});

router.get('/get/deliveryHistory', regAsAdmin, validateRequest, function(dbAdmin, req, res, next) {
    if (dbAdmin.status) return next(dbAdmin);
    Trade.find({ 'tradeType.action': 'Sign' }, function(err, list) {
        if (err) return next(err);
        var boxArr = [];
        var thisBox;
        var thisBoxContainerList;
        for (var i = 0; i < list.length; i++) {
            thisBox = list[i].container.box;
            thisType = list[i].container.typeCode;
            if (boxArr.indexOf(thisBox) < 0) {
                boxArr.push({
                    boxID: thisBox,
                    time: list[i].tradeTime,
                    containerList: [],
                    isDelivering: false,
                    destinationStore: deliveryDict[thisBox]
                });
            }
            thisBoxContainerList = boxArr[boxArr.indexOf(thisBox)].containerList;
            if (thisBoxContainerList.indexOf(thisType) < 0) {
                thisBoxContainerList.push({
                    containerType: thisType,
                    list: []
                });
            }
            thisBoxContainerList[thisBoxContainerList.indexOf(thisType)].list.push(list[i].container.id);
        }
        var resJSON = {
            typeCodeDict: typeDict,
            pastDelivery: boxArr
        };
        res.json(resJSON);
    });
});

router.post('/delivery/:id/:store', regAsAdmin, validateRequest, function(dbAdmin, req, res, next) {
    if (dbAdmin.status) return next(dbAdmin);
    if (!res._payload.orderTime) return res.status(401).json({ "type": "DeliveryMessage", "message": "Missing Time" });
    var boxID = req.params.id;
    var storeID = req.params.store;
    var newDelivery = new Delivery();
    newDelivery.boxID = boxID;
    newDelivery.storeID = storeID;
    newDelivery.save((err) => {
        if (err) return next(err);
        process.nextTick(() => {
            Container.find({ 'conbineTo': boxID, 'statusCode': 5 }, 'ID', function(err, containerIdList) {
                if (err) return next(err);
                var funcList = [];
                for (var i = 0; i < containerIdList.length; i++) {
                    funcList.push(
                        new Promise((resolve, reject) => {
                            changeState(resolve, containerIdList[i].ID, dbAdmin, 'Delivery', 0, res, reject);
                        })
                    );
                }
                Promise
                    .all(funcList)
                    .then((err) => {
                        for (var i = 0; i < err.length; i++) {
                            if (err[i]) {
                                debug(JSON.stringify(err[i]));
                                return next(err[i]);
                            }
                        }
                        return res.status(200).end();
                    })
                    .catch((err) => {
                        debug(err);
                        return next(err);
                    });
            });
        });
    });
});

router.post('/sign/:id', regAsStore, validateRequest, function(dbStore, req, res, next) {
    if (dbStore.status) return next(dbStore);
    if (!res._payload.orderTime) return res.status(401).json({ "type": "SignMessage", "message": "Missing Time" });
    var boxID = req.params.id;
    process.nextTick(() => {
        Delivery.findOne({ 'boxID': boxID, 'storeID': dbStore.role.storeID }, function(err, aDelivery) {
            if (err) return next(err);
            if (!aDelivery)
                return res.status(401).json({
                    "type": "SignMessage",
                    "message": "Box not belone to the store which user's store."
                });
            Container.find({ 'conbineTo': boxID, 'statusCode': 0 }, 'ID', function(err, containerIdList) {
                if (err) return next(err);
                var funcList = [];
                for (var i = 0; i < containerIdList.length; i++) {
                    funcList.push(
                        new Promise((resolve, reject) => {
                            changeState(resolve, containerIdList[i].ID, dbStore, 'Sign', 1, res, reject, boxID);
                        })
                    );
                }
                Promise
                    .all(funcList)
                    .then((err) => {
                        for (var i = 0; i < err.length; i++) {
                            if (err[i]) {
                                debug(JSON.stringify(err[i]));
                                return next(err[i]);
                            }
                        }
                        Delivery.remove({ 'boxID': boxID, 'storeID': dbStore.role.storeID }, function(err) {
                            if (err) return next(err);
                            return res.status(200).end();
                        });
                    })
                    .catch((err) => {
                        debug(err);
                        return next(err);
                    });
            });
        });
    });
});

router.post('/rent/:id', regAsStore, validateRequest, function(dbStore, req, res, next) {
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

router.post('/return/:id', regAsStore, validateRequest, function(dbStore, req, res, next) {
    if (dbStore.status) return next(dbStore);
    if (!res._payload.orderTime) return res.status(401).json({ "type": "returnContainerMessage", "message": "Missing Time" });
    var id = req.params.id;
    process.nextTick(() => changeState(false, id, dbStore, 'Return', 3, res, next));
});

router.post('/readyToClean/:id', regAsAdmin, validateRequest, function(dbAdmin, req, res, next) {
    if (dbAdmin.status) return next(dbAdmin);
    if (!res._payload.orderTime) return res.status(401).json({ "type": "readyToCleanMessage", "message": "Missing Time" });
    var id = req.params.id;
    process.nextTick(() => changeState(false, id, dbAdmin, 'ReadyToClean', 4, res, next));
});

router.post('/cleanStation/box', regAsAdmin, validateRequest, function(dbAdmin, req, res, next) {
    if (dbAdmin.status) return next(dbAdmin);
    var body = req.body;
    var funcList = [];
    for (var i = 0; i < body.containerList.length; i++) {
        funcList.push(
            new Promise((resolve, reject) => {
                changeState(resolve, body.containerList[i], dbAdmin, 'Boxing', 5, res, reject, body.boxId);
            })
        );
    }
    process.nextTick(() => {
        Promise
            .all(funcList)
            .then((err) => {
                for (var i = 0; i < err.length; i++) {
                    if (err[i]) {
                        debug('1: ' + JSON.stringify(err[i]));
                        return next(err[i]);
                    }
                }
                return res.status(200).end();
            })
            .catch((err) => {
                debug(err);
                return next(err);
            });
    });
});

function changeState(boxing, id, dbNew, action, newState, res, next, key = null) {
    var messageType = action + 'Message';
    Container.findOne({ 'ID': id }, function(err, container) {
        if (err)
            return next(err);
        if (!container)
            return res.status(404).json({ type: messageType, message: 'No container found.' });
        if (!container.active)
            return res.status(500).json({ type: messageType, message: 'Container not available.' });
        if (action === 'Rent' && (container.conbineTo !== dbNew.role.storeID))
            return res.status(403).json({
                'type': messageType,
                'message': 'Container not belone to this store.'
            });
        validateStateChanging(container.statusCode, newState, function(succeed, err) {
            if (!succeed) {
                if (err) {
                    return res.status(500).json({
                        'type': messageType,
                        'message': 'Container Origin State Unusual. Origin Status: ' + status[container.statusCode] +
                            ' New Status: ' + status[newState]
                    });
                }
                return res.status(403).json({
                    'type': messageType,
                    'message': 'Error on changing state. Origin Status: ' + status[container.statusCode] +
                        ' New Status: ' + status[newState]
                });
            }
            var userQuery = {};
            if (action === 'Rent') userQuery = { 'user.apikey': key };
            else userQuery = { 'user.phone': container.conbineTo };
            User.findOne(userQuery, function(err, dbOri) {
                if (err) return next(err);
                if (!dbOri) {
                    debug('Return unexpect err. Data : ' + JSON.stringify(container.container) +
                        ' ID in uri : ' + id);
                    return res.status(500).json({ type: messageType, message: 'No user found.' });
                } else if (!dbOri.active)
                    return res.status(401).json({ type: messageType, message: 'User has Banned' });
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
                newTrade.save(function(err) {
                    if (err) return next(err);
                    container.statusCode = newState;
                    container.updatetime = Date.now();
                    if (action === 'Delivery') container.cycleCtr++;
                    else if (action === 'Boxing') container.conbineTo = key;
                    else if (action === 'Sign') container.conbineTo = dbNew.role.storeID;
                    else container.conbineTo = dbNew.user.phone;
                    container.save(function(err) {
                        if (err) return next(err);
                        if (boxing === false)
                            return res.status(200).json({ type: messageType, message: action + ' Succeeded' });
                        else
                            return boxing();
                    });
                });
            });
        });
    });
}

function validateStateChanging(oriState, newState, callback) {
    switch (oriState) {
        case 0: // delivering
            if (newState !== 1)
                callback(false);
            break;
        case 1: // readyToUse
            if (newState <= 1 || newState === 5)
                callback(false);
            break;
        case 2: // rented
            if (newState <= 2 || newState === 5)
                callback(false);
            break;
        case 3: // returned
            if (newState <= 3 || newState === 5)
                callback(false);
            break;
        case 4: // notClean
            if (newState !== 5)
                callback(false);
            break;
        case 5: // boxed
            if (newState !== 0 && newState !== 4)
                callback(false);
            break;
        default:
            callback(false, false);
            break;
    }
    callback(true);
}

router.post('/add/:id', function(req, res, next) {
    containerData = req.body['container'];
    if (!containerData) {
        res.status(401);
        res.json({
            "status": 401,
            "message": "Invalid Request, no container data"
        });
        return;
    }
    var id = req.params.id;
    process.nextTick(function() {
        Container.findOne({ 'container.ID': id }, function(err, container) {
            if (err)
                return next(err);
            if (container) {
                return res.status(404).json({ type: 'addContainerMessage', message: 'That ID is already exist.' });
            } else {
                var newContainer = new Container();
                newContainer.ID = id;
                newContainer.typeCode = containerData.typeCode;
                newContainer.statusCode = 0;
                newContainer.usedCounter = 0;
                newContainer.conbineTo = null;
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