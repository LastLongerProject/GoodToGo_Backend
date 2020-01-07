const express = require('express');
const router = express.Router();
const debug = require('../../helpers/debugger')('containers/index');
const redis = require("../../models/redis");

const DEMO_CONTAINER_ID_LIST = require('../../config/config').demoContainers;

const Box = require('../../models/DB/boxDB');
const Trade = require('../../models/DB/tradeDB');
const User = require('../../models/DB/userDB.js');
const Container = require('../../models/DB/containerDB');
const RoleType = require('../../models/enums/userEnum').RoleType;
const RoleElement = require('../../models/enums/userEnum').RoleElement;
const Action = require('../../models/enums/containerTransactionEnum').Action;
const RentalQualification = require('../../models/enums/userEnum').RentalQualification;
const getGlobalUsedAmount = require('../../models/variables/containerStatistic').global_used;

const tasks = require('../../helpers/tasks');
const NotificationCenter = require('../../helpers/notifications/center');
const NotificationEvent = require('../../helpers/notifications/enums/events');
const userIsAvailableForRentContainer = require('../../helpers/tools').userIsAvailableForRentContainer;
const intReLength = require('../../helpers/toolkit').intReLength;
const dateCheckpoint = require('../../helpers/toolkit').dateCheckpoint;
const validateStateChanging = require('../../helpers/toolkit').validateStateChanging;

const SocketNamespace = require('../../controllers/socket').namespace;
const generateSocketToken = require('../../controllers/socket').generateToken;
const tradeCallback = require('../../controllers/tradeCallback');
const changeContainersState = require('../../controllers/containerTrade');

const validateRequest = require('../../middlewares/validation/validateRequest').JWT;
const checkRoleIs = require('../../middlewares/validation/validateRequest').checkRoleIs;
const checkRoleIsStore = require('../../middlewares/validation/validateRequest').checkRoleIsStore;
const checkRoleIsAdmin = require('../../middlewares/validation/validateRequest').checkRoleIsAdmin;
const checkRoleIsCleanStation = require('../../middlewares/validation/validateRequest').checkRoleIsCleanStation;

const status = [
    'delivering',
    'readyToUse',
    'rented',
    'returned',
    'notClean',
    'boxed'
];

router.use('/get', require('./get'));

/**
 * @apiName Containers global used amount
 * @apiGroup Containers
 *
 * @api {get} /containers/globalUsedAmount Get global used amount
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        res.text: String //amount
 * 
 */
router.get('/globalUsedAmount', function (req, res, next) {
    getGlobalUsedAmount((err, count) => {
        if (err) return next(err);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(count.toString());
        res.end();
    });
});

/**
 * @apiName Containers stock specific box
 * @apiGroup Containers
 *
 * @api {post} /containers/stock/:boxID Stock specific box id
 * @apiPermission admin
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "stockBoxMessage",
            message: "StockBox Succeed"
        }
 * @apiUse StockError
 */
router.post('/stock/:boxID', checkRoleIsCleanStation(), validateRequest, function (req, res, next) {
    const boxID = req.params.boxID;
    Box.findOne({
        boxID: boxID,
    }, function (err, aBox) {
        if (err) return next(err);
        if (!aBox)
            return res.status(403).json({
                code: 'F007',
                type: 'stockBoxMessage',
                message: "Can't Find The Box",
            });
        aBox.stocking = true;
        aBox.save(function (err) {
            if (err) return next(err);
            return res.json({
                type: 'stockBoxMessage',
                message: 'StockBox Succeed'
            });
        });
    });
});

/**
 * @apiName Containers delivery box to store
 * @apiGroup Containers
 *
 * @api {post} /containers/delivery/:boxID/:store Delivery box id to store
 * @apiPermission admin
 * @apiUse JWT
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "DeliveryMessage",
            message: "Delivery Succeed"
        }
 * @apiUse DeliveryError
 * @apiUse ChangeStateError
 */
router.post('/delivery/:boxID/:store', checkRoleIsCleanStation(), validateRequest, function (req, res, next) {
    const dbAdmin = req._user;
    const boxID = req.params.boxID;
    const storeID = parseInt(req.params.store);

    if (isNaN(storeID))
        return res.status(403).json({
            code: 'F???',
            type: 'DeliveryMessage',
            message: "StoreID Invalid",
        });
    Box.findOne({
        boxID: boxID,
    }, function (err, aBox) {
        if (err) return next(err);
        if (!aBox)
            return res.status(403).json({
                code: 'F007',
                type: 'DeliveryMessage',
                message: "Can't Find The Box",
            });
        if (aBox.delivering)
            return res.status(403).json({
                code: 'F007',
                type: 'DeliveryMessage',
                message: 'Box Already Delivering',
            });
        changeContainersState(
            aBox.containerList,
            dbAdmin, {
                action: Action.DELIVERY,
                newState: 0,
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
                    //test
                    User.find({
                        roleList: {
                            $elemMatch: {
                                storeID
                            }
                        }
                    }, function (err, userList) {
                        if (err) return debug.error(err);
                        userList.forEach(aClerk =>
                            NotificationCenter.emit(NotificationEvent.CONTAINER_DELIVERY, {
                                clerk: aClerk
                            }, {
                                boxID
                            })
                        );
                    });
                });
            }
        );
    });
});

/**
 * @apiName Containers cancel delivery
 * @apiGroup Containers
 *
 * @api {post} /containers/cancelDelivery/:boxID Cancel box id delivery
 * @apiPermission admin
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "CancelDeliveryMessage",
            message: "CancelDelivery Succeed"
        }
 * @apiUse CancelDeliveryError
 * @apiUse ChangeStateError
 */
router.post('/cancelDelivery/:boxID', checkRoleIsCleanStation(), validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    var boxID = req.params.boxID;
    Box.findOne({
        boxID: boxID,
    }, function (err, aBox) {
        if (err) return next(err);
        if (!aBox)
            return res.status(403).json({
                code: 'F007',
                type: 'CancelDeliveryMessage',
                message: "Can't Find The Box",
            });
        if (!aBox.delivering)
            return res.status(403).json({
                code: 'F007',
                type: 'DeliveryMessage',
                message: "Box Isn't Delivering"
            });
        changeContainersState(
            aBox.containerList,
            dbAdmin, {
                action: Action.CANCEL_DELIVERY,
                newState: 5
            }, {
                bypassStateValidation: true,
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
            }
        );
    });
});

/**
 * @apiName Containers Sign box id
 * @apiGroup Containers
 *
 * @api {post} /containers/sign/:boxID Sign box id
 * @apiPermission clerk_manager
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "SignMessage",
            message: "Sign Succeed"
        }
 * @apiUse SignError
 * @apiUse ChangeStateError
 */

router.post('/sign/:boxID', checkRoleIsStore(), checkRoleIsCleanStation(), validateRequest, function (req, res, next) {
    const dbUser = req._user;
    const dbRole = req._thisRole;
    const boxID = req.params.boxID;
    let thisStoreID;
    const thisRoleType = dbRole.roleType;
    try {
        switch (thisRoleType) {
            case RoleType.CLEAN_STATION:
                break;
            case RoleType.STORE:
                thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
                break;
            default:
                next();
        }
    } catch (error) {
        next(error);
    }
    const reqByCleanStation = thisRoleType === RoleType.CLEAN_STATION;

    Box.findOne({
        boxID: boxID,
    }, function (err, aDelivery) {
        if (err) return next(err);
        if (!aDelivery)
            return res.status(403).json({
                code: 'F007',
                type: 'SignMessage',
                message: "Can't Find The Box"
            });
        if (!reqByCleanStation && aDelivery.storeID !== thisStoreID)
            return res.status(403).json({
                code: 'F008',
                type: 'SignMessage',
                message: "Box is not belong to user's store"
            });
        changeContainersState(
            aDelivery.containerList,
            dbUser, {
                action: Action.SIGN,
                newState: 1
            }, {
                boxID,
                storeID: aDelivery.storeID,
            },
            (err, tradeSuccess, reply) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(reply);
                Box.remove({
                    boxID
                }, (err) => {
                    if (err) return next(err);
                    return res.json(reply);
                });
            }
        );
    });
});

/**
 * @apiName Containers rent container
 * @apiGroup Containers
 *
 * @api {post} /containers/rent/:container Rent specific container
 * @apiPermission clerk
 * @apiUse JWT_orderTime
 * 
 * @apiHeader {String} userapikey User api key
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "RentMessage",
            message: "Rent Succeeded",
            oriUser: "09xxxxxxxx",
            containerList: [ 
                {
                    typeName: String,
                    typeCode: Number,
                    id: Number
                },
                ...
            ]
        }
 * @apiUse RentError
 * @apiUse ChangeStateError
 * @apiUse RentalQualificationError
 */
router.post('/rent/:container', checkRoleIsStore(), validateRequest, function (req, res, next) {
    const dbStore = req._user;
    const dbRole = req._thisRole;
    let container = req.params.container;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        next(error);
    }
    const key = req.headers.userapikey;
    if (typeof key === 'undefined' || key.length === 0)
        return res.status(403).json({
            code: 'F009',
            type: 'borrowContainerMessage',
            message: 'Invalid Rent Request'
        });
    if (!res._payload.orderTime)
        return res.status(403).json({
            code: 'F006',
            type: 'borrowContainerMessage',
            message: 'Missing Order Time'
        });
    redis.get('user_token:' + key, (err, userPhone) => {
        if (err) return next(err);
        if (!userPhone)
            return res.status(403).json({
                code: 'F013',
                type: 'borrowContainerMessage',
                message: 'Rent Request Expired'
            });
        let containerAmount = 1;
        if (container === "list") {
            container = req.body.containers;
            containerAmount = req.body.containers.length;
        }
        User.findOne({
            "user.phone": userPhone
        }, (err, theCustomer) => {
            if (err)
                return next(err);
            if (!theCustomer)
                return res.status(403).json({
                    code: 'F004',
                    type: 'RentMessage',
                    message: 'No user found'
                });
            userIsAvailableForRentContainer(theCustomer, containerAmount, false, (err, isAvailable, detail) => {
                if (err) return next(err);
                if (!isAvailable) {
                    if (detail.rentalQualification === RentalQualification.BANNED)
                        return res.status(403).json({
                            code: 'F005',
                            type: 'userSearchingError',
                            message: 'User is banned'
                        });
                    else if (detail.rentalQualification === RentalQualification.OUT_OF_QUOTA)
                        return res.status(403).json({
                            code: 'F015',
                            type: 'userSearchingError',
                            message: 'Container amount is over limitation'
                        });
                    else
                        return next(new Error("User is not available for renting container because of UNKNOWN REASON"));
                }
                changeContainersState(container, dbStore, {
                    action: Action.RENT,
                    newState: 2
                }, {
                    rentToUser: theCustomer,
                    orderTime: res._payload.orderTime,
                    inLineSystem: true,
                    storeID: thisStoreID
                }, (err, tradeSuccess, reply, tradeDetail) => {
                    if (err) return next(err);
                    if (!tradeSuccess) return res.status(403).json(reply);
                    tradeCallback.rent(tradeDetail, thisStoreID);
                    return res.json(reply);
                });
            });
        });
    });
});

/**
 * @apiName Containers return container
 * @apiGroup Containers
 *
 * @api {post} /containers/return/:container Return specific container
 * @apiPermission bot
 * @apiPermission clerk
 * @apiPermission admin
 * 
 * @apiUse JWT_orderTime
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "ReturnMessage",
            message: "Return Succeeded",
            oriUser: "09xxxxxxxx",
            containerList: [ 
                {
                    typeName: String,
                    typeCode: Number,
                    id: Number
                },
                ...
            ]
        }
 * @apiUse ReturnError
 * @apiUse ChangeStateError
 */
router.post('/return/:container', checkRoleIs([{
    roleType: RoleType.STORE
}, {
    roleType: RoleType.CLEAN_STATION
}, {
    roleType: RoleType.BOT
}]), validateRequest, function (req, res, next) {
    if (!res._payload.orderTime)
        return res.status(403).json({
            code: 'F006',
            type: 'returnContainerMessage',
            message: 'Missing Order Time'
        });
    let container = req.params.container;
    let reqStoreID = req.body.storeId;
    const dbStore = req._user;
    const dbRole = req._thisRole;
    const thisRoleType = dbRole.roleType;
    let thisStoreID;
    try {
        switch (thisRoleType) {
            case RoleType.CLEAN_STATION:
                reqStoreID = parseInt(reqStoreID);
                if (typeof reqStoreID === "undefined" || isNaN(reqStoreID))
                    return res.status(403).json({
                        code: 'F???',
                        type: 'returnContainerMessage',
                        message: "StoreID Invalid",
                    });
                thisStoreID = reqStoreID;
                break;
            case RoleType.STORE:
                thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
                break;
            case RoleType.BOT:
                thisStoreID = dbRole.getElement(RoleElement.RETURN_TO_STORE_ID, false);
                break;
            default:
                next();
        }
    } catch (error) {
        next(error);
    }
    if (container === 'list') container = req.body.containers;
    else container = [container];
    changeContainersState(
        container,
        dbStore, {
            action: Action.RETURN,
            newState: 3
        }, {
            storeID: thisStoreID,
            orderTime: res._payload.orderTime
        },
        (err, tradeSuccess, reply, tradeDetail) => {
            if (err) return next(err);
            if (!tradeSuccess) return res.status(403).json(reply);
            res.json(reply);
            tradeCallback.return(tradeDetail, {
                storeID: thisStoreID
            });
        }
    );
});

/**
 * @apiName Containers ready to clean
 * @apiGroup Containers
 *
 * @api {post} /containers/readyToClean/:container Ready to clean specific container
 * @apiPermission admin
 * @apiPermission bot
 * 
 * @apiUse JWT_orderTime
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "ReadyToCleanMessage",
            message: "ReadyToClean Succeeded",
            oriUser: "09xxxxxxxx",
            containerList: [ 
                {
                    typeName: String,
                    typeCode: Number,
                    id: Number
                },
                ...
            ]
        }
 * @apiUse ReadyToCleanError
 * @apiUse ChangeStateError
 */
router.post('/readyToClean/:container', checkRoleIs([{
    roleType: RoleType.CLEAN_STATION
}, {
    roleType: RoleType.BOT
}]), validateRequest, function (req, res, next) {
    const dbUser = req._user;
    if (!res._payload.orderTime)
        return res.status(403).json({
            code: 'F006',
            type: 'readyToCleanMessage',
            message: 'Missing Order Time'
        });
    let container = req.params.container;
    if (container === 'list') container = req.body.containers;
    changeContainersState(
        container,
        dbUser, {
            action: Action.READY_TO_CLEAN,
            newState: 4
        }, {
            orderTime: res._payload.orderTime
        },
        (err, tradeSuccess, reply) => {
            if (err) return next(err);
            if (!tradeSuccess) return res.status(403).json(reply);
            res.json(reply);
        }
    );
});

/**
 * @apiName Containers box container
 * @apiGroup Containers
 *
 * @api {post} /containers/cleanStation/box Box container
 * @apiPermission admin
 * 
 * @apiUse JWT
 * @apiParam {String} phone Boxer's phone
 * @apiParam {Array} containerList Boxed containers
 * @apiParam {String} boxId Box's id
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "BoxingMessage",
            message: "Boxing Succeeded"
        }
 * @apiUse BoxError
 * @apiUse ChangeStateError
 */
router.post(['/cleanStation/box', '/box'], checkRoleIsCleanStation(), validateRequest, function (req, res, next) {
    const dbAdmin = req._user;
    let boxID = req.body.boxId;
    const containerList = req.body.containerList;
    if (!containerList || !Array.isArray(containerList))
        return res.status(403).json({
            code: 'F011',
            type: 'BoxingMessage',
            message: 'Boxing req body invalid'
        });
    const task = function (done) {
        Box.findOne({
            boxID: boxID,
        }, function (err, aBox) {
            if (err) return next(err);
            if (aBox)
                return res.status(403).json({
                    code: 'F012',
                    type: 'BoxingMessage',
                    message: 'Box is already exist'
                });
            changeContainersState(
                containerList,
                dbAdmin, {
                    action: Action.BOXING,
                    newState: 5
                }, {
                    boxID
                }, (err, tradeSuccess, reply) => {
                    if (err) return next(err);
                    if (!tradeSuccess) return res.status(403).json(reply);
                    const newBox = new Box({
                        boxID,
                        user: {
                            box: dbAdmin.user.phone,
                        },
                        containerList,
                    });
                    Object.assign(reply, {
                        data: newBox,
                    });
                    newBox.save(function (err) {
                        if (err) return next(err);
                        return done(reply);
                    });
                }
            );
        });
    };
    if (typeof boxID === 'undefined') {
        redis.get('boxCtr', (err, boxCtr) => {
            if (err) return next(err);
            if (boxCtr == null) boxCtr = 1;
            else boxCtr++;
            redis.setex('boxCtr', Math.floor((dateCheckpoint(1).valueOf() - Date.now()) / 1000), boxCtr, (err, reply) => {
                if (err) return next(err);
                if (reply !== 'OK') return next(reply);
                var today = new Date();
                boxID = today.getMonth() + 1 + intReLength(today.getDate(), 2) + intReLength(boxCtr, 3);
                task(reply => {
                    res.json(reply);
                });
            });
        });
    } else
        task(() => {
            res.status(200).json({
                type: 'BoxingMessage',
                message: 'Boxing Succeeded',
            });
        });
});

/**
 * @apiName Containers Unbox 
 * @apiGroup Containers
 *
 * @api {post} /containers/cleanStation/unbox/:boxID Unbox 
 * @apiPermission admin
 * 
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "UnboxingMessage",
            message: "Unboxing Succeeded",
            oriUser: "09xxxxxxxx",
            containerList: [ 
                {
                    typeName: String,
                    typeCode: Number,
                    id: Number
                },
                ...
            ]
        }
 * @apiUse UnboxError
 * @apiUse ChangeStateError
 */
router.post(['/cleanStation/unbox/:boxID', '/unbox/:boxID'], checkRoleIsCleanStation(), validateRequest, function (req, res, next) {
    const dbAdmin = req._user;
    const boxID = req.params.boxID;
    Box.findOne({
        boxID: boxID,
    }, function (err, aBox) {
        if (err) return next(err);
        if (!aBox)
            return res.status(403).json({
                code: 'F007',
                type: 'UnboxingMessage',
                message: "Can't Find The Box"
            });
        changeContainersState(
            aBox.containerList,
            dbAdmin, {
                action: Action.UNBOXING,
                newState: 4
            }, {
                bypassStateValidation: true
            }, (err, tradeSuccess, reply) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(reply);
                Box.remove({
                    boxID: boxID
                }, function (err) {
                    if (err) return next(err);
                    return res.json(reply);
                });
            }
        );
    });
});

/**
 * @apiName Containers Undo action 
 * @apiGroup Containers
 *
 * @api {post} /containers/undo/:action/:container Undo action to specific container 
 * @apiPermission admin_manager
 * 
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "UndoMessage",
            message: "Undo " + action + " Succeeded"
        }
 * @apiUse UndoError
 */
const actionCanUndo = {
    Return: 3,
    ReadyToClean: 4
};
router.post('/undo/:action/:container', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    const dbAdmin = req._user;
    const action = req.params.action;
    const containerID = req.params.container;
    if (!(action in actionCanUndo)) return next();
    Trade.findOne({
        'container.id': containerID,
        'tradeType.action': action,
    }, {}, {
        sort: {
            logTime: -1,
        },
    }, function (err, theTrade) {
        if (err) return next(err);
        Container.findOne({
            ID: containerID
        }, function (err, theContainer) {
            if (err) return next(err);
            if (!theContainer || !theTrade)
                return res.json({
                    code: 'F002',
                    type: 'UndoMessage',
                    message: 'No container found',
                    data: containerID
                });
            if (theContainer.statusCode !== actionCanUndo[action])
                return res.status(403).json({
                    code: 'F00?',
                    type: 'UndoMessage',
                    message: 'Container is not in that state'
                });
            theContainer.conbineTo = theTrade.oriUser.phone;
            theContainer.statusCode = theTrade.tradeType.oriState;
            theContainer.storeID = [1, 3].indexOf(theTrade.tradeType.oriState) >= 0 ? theTrade.oriUser.storeID : undefined;
            let newTrade = new Trade();
            newTrade.tradeTime = Date.now();
            newTrade.tradeType = {
                action: 'Undo' + action,
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
            newTrade.save(err => {
                if (err) return next(err);
                theContainer.save(err => {
                    if (err) return next(err);
                    res.json({
                        type: 'UndoMessage',
                        message: 'Undo ' + action + ' Succeeded'
                    });
                });
            });
        });
    });
});

/**
 * @apiName Containers get challenge token 
 * @apiGroup Containers
 *
 * @api {get} /containers/challenge/token Get challenge token 
 * @apiPermission admin
 * @apiPermission bot
 * @apiPermission clerk
 * 
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            uri: uri,
            token: String
        }
 */
router.get('/challenge/token', checkRoleIs([{
    roleType: RoleType.STORE
}, {
    roleType: RoleType.CLEAN_STATION
}, {
    roleType: RoleType.BOT
}]), validateRequest, generateSocketToken(SocketNamespace.CHALLENGE));

/**
 * @apiName Containers do action to specific container
 * @apiGroup Containers
 *
 * @api {get} /containers/challenge/:action/:container Do action to specific container
 * @apiPermission admin
 * @apiPermission clerk
 * 
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "ChallengeMessage",
            message: "Can be " + action
        }
 * @apiUse ChanllengeActionError
 */
var actionTodo = [
    'Delivery',
    'Sign',
    'Rent',
    'Return',
    'ReadyToClean',
    'Boxing',
    'dirtyReturn'
];
router.get('/challenge/:action/:container', checkRoleIsStore(), checkRoleIsCleanStation(), validateRequest, function (req, res, next) {
    const action = req.params.action;
    const containerID = parseInt(req.params.container);
    const newState = actionTodo.indexOf(action);
    if (newState === -1) return next();
    req.headers['if-none-match'] = 'no-match-for-this';
    if (DEMO_CONTAINER_ID_LIST.indexOf(containerID) !== -1)
        return res.json({
            type: 'ChallengeMessage',
            message: 'Can be ' + action
        });
    if (isNaN(containerID))
        return res.status(403).json({
            code: 'F002',
            type: 'ChallengeMessage',
            message: 'No container found',
            data: containerID
        });
    Container.findOne({
        ID: containerID,
    }, function (err, theContainer) {
        if (err) return next(err);
        if (!theContainer)
            return res.status(403).json({
                code: 'F002',
                type: 'ChallengeMessage',
                message: 'No container found',
                data: containerID
            });
        validateStateChanging(false, theContainer.statusCode, newState, function (succeed) {
            if (!succeed) {
                return res.status(403).json({
                    code: 'F001',
                    type: 'ChallengeMessage',
                    message: 'Can NOT be ' + action,
                    stateExplanation: status,
                    listExplanation: ['containerID', 'originalState', 'newState'],
                    errorList: [
                        [containerID, theContainer.statusCode, newState]
                    ],
                    errorDict: [{
                        containerID: containerID,
                        originalState: theContainer.statusCode,
                        newState: newState
                    }, ]
                });
            } else {
                return res.json({
                    type: 'ChallengeMessage',
                    message: 'Can be ' + action,
                });
            }
        });
    });
});

router.post('/triggerTradeCallback/return/all', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    tasks.solveUnusualUserOrder((err, results) => {
        if (err) return next(err);
        res.json({
            success: true,
            msg: "Try To Fix Following User Order",
            results
        });
    });
});

router.post('/triggerTradeCallback/return/:container/:userPhone', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    const containerID = req.params.container;
    const userPhone = req.params.userPhone;
    Trade.findOne({
        "container.id": containerID,
        "oriUser.phone": userPhone,
        "tradeType.action": "Return"
    }, {}, {
        sort: {
            tradeTime: -1
        }
    }, function (err, theTrade) {
        if (err) return next(err);
        if (!theTrade)
            return res.status(403).json({
                success: false,
                msg: "Can't find that trade"
            });
        User.findOne({
            "user.phone": theTrade.oriUser.phone
        }, (err, oriUser) => {
            if (err) return next(err);
            if (!oriUser)
                return res.status(403).json({
                    success: false,
                    msg: "Can't find oriUser"
                });
            User.findOne({
                "user.phone": theTrade.newUser.phone
            }, (err, newUser) => {
                if (err) return next(err);
                if (!newUser)
                    return res.status(403).json({
                        success: false,
                        msg: "Can't find newUser"
                    });
                Container.findOne({
                    "ID": theTrade.container.id
                }, (err, theContainer) => {
                    if (err) return next(err);
                    if (!theContainer)
                        return res.status(403).json({
                            success: false,
                            msg: "Can't find theContainer"
                        });
                    const tradeDetail = {
                        oriUser,
                        newUser,
                        container: theContainer
                    };
                    tradeCallback.return([tradeDetail], {
                        storeID: theTrade.newUser.storeID
                    });
                    res.json({
                        success: true,
                        msg: "Doing task"
                    });
                });
            });
        });
    });
});

module.exports = router;