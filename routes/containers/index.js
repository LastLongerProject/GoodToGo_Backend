const express = require('express');
const router = express.Router();
const debug = require('debug')('goodtogo_backend:containers');
const redis = require("../../models/redis");

const Box = require('../../models/DB/boxDB');
const Trade = require('../../models/DB/tradeDB');
const User = require("../../models/DB/userDB");
const Container = require('../../models/DB/containerDB');
const getGlobalUsedAmount = require('../../models/variables/globalUsedAmount');
const DEMO_CONTAINER_ID_LIST = require('../../config/config').demoContainers;

const intReLength = require('@lastlongerproject/toolkit').intReLength;
const dateCheckpoint = require('@lastlongerproject/toolkit').dateCheckpoint;
const validateStateChanging = require('@lastlongerproject/toolkit').validateStateChanging;
const NotificationCenter = require('../../helpers/notifications/center');
const generateSocketToken = require('../../controllers/socket').generateToken;
const changeContainersState = require('../../controllers/containerTrade');
const validateRequest = require('../../middlewares/validation/validateRequest').JWT;
const regAsBot = require('../../middlewares/validation/validateRequest').regAsBot;
const regAsStore = require('../../middlewares/validation/validateRequest').regAsStore;
const regAsAdmin = require('../../middlewares/validation/validateRequest').regAsAdmin;
const regAsAdminManager = require('../../middlewares/validation/validateRequest').regAsAdminManager;

const status = ['delivering', 'readyToUse', 'rented', 'returned', 'notClean', 'boxed'];

router.use('/get', require("./get"));

router.get('/globalUsedAmount', function (req, res, next) {
    getGlobalUsedAmount((err, count) => {
        if (err) return next(err);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(count.toString());
        res.end();
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
            }, (err, tradeSuccess, reply) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(reply);
                aBox.delivering = true;
                aBox.stocking = false;
                aBox.storeID = storeID;
                aBox.user.delivery = dbAdmin.user.phone;
                aBox.save(function (err) {
                    if (err) return next(err);
                    res.json(reply);
                    /*
                    User.find({
                        'roles.clerk.storeID': storeID
                    }, function (err, userList) {
                        if (err) return debug(err);
                        userList.forEach(aClerk => NotificationCenter.emit("container_delivery", {
                            clerk: aClerk
                        }, {
                            boxID
                        }));
                    });
                    */
                });
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
        }, (err, tradeSuccess, reply) => {
            if (err) return next(err);
            if (!tradeSuccess) return res.status(403).json(reply);
            aBox.delivering = false;
            aBox.storeID = undefined;
            aBox.user.delivery = undefined;
            aBox.save(function (err) {
                if (err) return next(err);
                return res.json(reply);
            });
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
        }, (err, tradeSuccess, reply) => {
            if (err) return next(err);
            if (!tradeSuccess) return res.status(403).json(reply);
            Box.remove({
                'boxID': boxID
            }, function (err) {
                if (err) return next(err);
                return res.json(reply);
            });
        });
    });
});

router.post('/rent/:id', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var key = req.headers.userapikey;
    if (typeof key === 'undefined' || typeof key === null || key.length === 0)
        return res.status(403).json({
            code: 'F009',
            type: "borrowContainerMessage",
            message: "Invalid Rent Request"
        });
    if (!res._payload.orderTime)
        return res.status(403).json({
            code: 'F006',
            type: "borrowContainerMessage",
            message: "Missing Order Time"
        });
    redis.get('user_token:' + key, (err, userPhone) => {
        if (err) return next(err);
        if (!userPhone) return res.status(403).json({
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
            rentToUser: userPhone,
            orderTime: res._payload.orderTime
        }, (err, tradeSuccess, reply, tradeUser) => {
            if (err) return next(err);
            if (!tradeSuccess) return res.status(403).json(reply);
            res.json(reply);
            if (tradeUser) {
                NotificationCenter.emit("container_rent", {
                    customer: tradeUser.newUser
                }, {
                    containerList: reply.containerList
                });
            }
        });
    });
});

router.post('/return/:id', regAsBot, regAsStore, regAsAdmin, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    if (!res._payload.orderTime)
        return res.status(403).json({
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
    }, (err, tradeSuccess, reply, tradeUser) => {
        if (err) return next(err);
        if (!tradeSuccess) return res.status(403).json(reply);
        res.json(reply);
        if (tradeUser) {
            NotificationCenter.emit("container_return", {
                customer: tradeUser.oriUser
            }, {
                containerList: reply.containerList
            });
        }
    });
});

router.post('/readyToClean/:id', regAsAdmin, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    if (!res._payload.orderTime)
        return res.status(403).json({
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
    }, (err, tradeSuccess, reply) => {
        if (err) return next(err);
        if (!tradeSuccess) return res.status(403).json(reply);
        res.json(reply);
    });
});

router.post(['/cleanStation/box', '/box'], regAsAdmin, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    let boxID = req.body.boxId;
    const containerList = req.body.containerList;
    if (!containerList || !Array.isArray(containerList))
        return res.status(403).json({
            code: 'F011',
            type: 'BoxingMessage',
            message: 'Boxing req body invalid'
        });
    var task = function (done) {
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
            }, (err, tradeSuccess, reply) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(reply);
                const newBox = new Box({
                    boxID,
                    user: {
                        box: dbAdmin.user.phone
                    },
                    containerList
                });
                Object.assign(reply, {
                    data: newBox
                });
                newBox.save(function (err) {
                    if (err) return next(err);
                    return done(reply);
                });
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
                    task(reply => {
                        res.json(reply);
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

router.post(['/cleanStation/unbox/:id', '/unbox/:id'], regAsAdmin, validateRequest, function (req, res, next) {
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
        }, (err, tradeSuccess, reply) => {
            if (err) return next(err);
            if (!tradeSuccess) return res.status(403).json(reply);
            Box.remove({
                'boxID': boxID
            }, function (err) {
                if (err) return next(err);
                return res.json(reply);
            });
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