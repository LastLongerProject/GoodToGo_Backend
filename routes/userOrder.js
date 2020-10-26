const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('userOrder');

const checkRoleIsBot = require('../middlewares/validation/authorization/validateRequest').checkRoleIsBot;
const validateRequest = require('../middlewares/validation/authorization/validateRequest').JWT;
const validateLine = require('../middlewares/validation/authorization/validateLine').all;
const validateStoreCode = require('../middlewares/validation/content/userOrder').storeCode;

const userTrade = require('../controllers/userTrade');
const tradeCallback = require('../controllers/tradeCallback');
const changeContainersState = require('../controllers/containerTrade');

const intReLength = require('../helpers/toolkit').intReLength;

const generateUUID = require('../helpers/tools').generateUUID;
const getSystemBot = require('../helpers/tools').getSystemBot;
const userIsAvailableForRentContainer = require('../helpers/tools').userIsAvailableForRentContainer;

const User = require('../models/DB/userDB');
const UserOrder = require('../models/DB/userOrderDB');
const ContainerAction = require('../models/enums/containerEnum').Action;
const ContainerState = require('../models/enums/containerEnum').State;
const RentalQualification = require('../models/enums/userEnum').RentalQualification;
const computeDaysToDue = require('../models/computed/dueStatus').daysToDue;
const DataCacheFactory = require('../models/dataCacheFactory');

/**
 * @apiName DataForLine
 * @apiGroup UserOrder
 * 
 * @api {get} /userOrder/list Get user data for Line
 * @apiUse LINE
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *          containerAmount: Number,
 *          purchaseStatus: String, // "free_user" or "purchased_user"
 *	        orderListWithoutID : [
 *		    {
 *			    orderID : String,
 *			    containerAmount : Number,
 *			    orderTime : Date,
 *			    storeName : String, // 正興咖啡館
 *              daysToDue : Number
 *		    }, ...
 *	        ],
 *	        orderListWithID : [
 *		    {
 *              orderID : String,
 *			    containerID : String, // #001
 *			    containerType : String, // 12oz 玻璃杯
 *			    orderTime : Date,
 *			    storeName : String, // 正興咖啡館
 *              daysToDue : Number
 *		    }, ...
 *	        ]
 *      }
 */

router.get('/list', validateLine, function (req, res, next) {
    const dbUser = req._user;
    const StoreDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    const ContainerDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_WITH_DEACTIVE);
    UserOrder.find({
        "user": dbUser._id,
        "archived": false
    }, (err, userOrderList) => {
        if (err) return next(err);
        let orderListWithoutID = {};
        let orderListWithID = [];
        const now = Date.now();
        userOrderList.sort((a, b) => b.orderTime - a.orderTime);
        userOrderList.forEach(aUserOrder => {
            const daysToDue = computeDaysToDue(aUserOrder.orderTime, dbUser.getPurchaseStatus(), now);
            if (aUserOrder.containerID === null) {
                if (orderListWithoutID[aUserOrder.orderID]) {
                    orderListWithoutID[aUserOrder.orderID].containerAmount++;
                } else {
                    let aFormattedUserOrder = {
                        orderID: aUserOrder.orderID,
                        containerAmount: 1,
                        orderTime: aUserOrder.orderTime,
                        storeName: StoreDict[aUserOrder.storeID].name,
                        daysToDue
                    };
                    orderListWithoutID[aUserOrder.orderID] = aFormattedUserOrder;
                }
            } else {
                let aFormattedUserOrder = {
                    containerID: `#${intReLength(aUserOrder.containerID, 4)}`,
                    containerType: ContainerDict[aUserOrder.containerID],
                    orderTime: aUserOrder.orderTime,
                    storeName: StoreDict[aUserOrder.storeID].name,
                    daysToDue
                };
                orderListWithID.push(aFormattedUserOrder);
            }
        });
        res.json({
            containerAmount: userOrderList.length,
            purchaseStatus: dbUser.getPurchaseStatus(),
            orderListWithoutID: Object.values(orderListWithoutID),
            orderListWithID
        });
    });
});

/**
 * @apiName AddUserOrderByBot
 * @apiGroup UserOrder
 * 
 * @api {post} /userOrder/addByBot Add User Order
 * @apiUse LINE
 * 
 * @apiParam {String} storeCode storeCode.
 * @apiParam {String} phone phone
 * @apiParam {Number} containerAmount containerAmount.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *          storeName: String,
 *          containerAmount: Number,
 *          time: Date
 *      }
 */

router.post('/addByBot', checkRoleIsBot(), validateRequest, validateStoreCode, function (req, res, next) {
    const bypassCheck = false;
    const storeCode = req.body.storeCode;
    const StoreDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    const containerAmount = parseInt(req.body.containerAmount);
    const phone = req.body.phone;

    if (isNaN(containerAmount) || containerAmount <= 0 || !phone)
        return res.status(403).json({
            code: 'L002',
            type: 'userOrderMessage',
            message: `Content not in Correct Format.\n` +
                `StoreCode: ${storeCode}, ContainerAmount: ${containerAmount}, phone: ${phone}`,
            txt: "系統維修中>< 請稍後再試！"
        });

    User.findOne({ "user.phone": phone })
        .then((dbUser) => {
            userIsAvailableForRentContainer(dbUser, containerAmount, bypassCheck, (err, isAvailable, detail) => {
                if (err)
                    return next(err);
                if (!isAvailable) {
                    if (detail.rentalQualification === RentalQualification.BANNED)
                        return res.status(403).json({
                            code: 'L001',
                            type: 'userOrderMessage',
                            message: `User is Banned.`,
                            txt: dbUser.getBannedTxt("借用")
                        });
                    if (detail.rentalQualification === RentalQualification.OUT_OF_QUOTA)
                        return res.status(403).json({
                            code: 'L004',
                            type: 'userOrderMessage',
                            message: `ContainerAmount is Over Quantity Limitation. \n` +
                                `ContainerAmount: ${containerAmount}, UsingAmount: ${detail.data.usingAmount}`,
                            txt: `您最多只能借 ${detail.data.holdingQuantityLimitation} 個容器`
                        });
                    else
                        return next(new Error("User is not available for renting container because of UNKNOWN REASON"));
                }
        
                const storeID = req._storeID;
                const funcList = [];
                const now = Date.now();
                for (let i = 0; i < containerAmount; i++) {
                    funcList.push(new Promise((resolve, reject) => {
                        let newOrder = new UserOrder({
                            orderID: generateUUID(),
                            user: dbUser._id,
                            storeID,
                            orderTime: now
                        });
                        newOrder.save((err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                    }));
                }
                Promise
                    .all(funcList)
                    .then(() => {
                        res.json({
                            storeName: StoreDict[storeID].name,
                            containerAmount,
                            time: now
                        });
                        userTrade.refreshUserUsingStatus(dbUser, {
                            sendNotice: false,
                            banOrUnbanUser: true
                        }, err => {
                            if (err) return debug.error(err);
                        });
                    })
                    .catch(next);
            });
        })
        .catch((err) => {
            return res.status(401).json({
                code: 'E001',
                type: "userSearchingError",
                message: "No User: [" + phone + "] Found",
                data: {
                    phone
                }
            })
        });
});

/**
 * @apiName AddUserOrder
 * @apiGroup UserOrder
 * 
 * @api {post} /userOrder/add Add User Order
 * @apiUse LINE
 * 
 * @apiParam {String} storeCode storeCode.
 * @apiParam {Number} containerAmount containerAmount.
 * @apiParam {Boolean} byCallback byCallback.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *          storeName: String,
 *          containerAmount: Number,
 *          time: Date
 *      }
 */

router.post('/add', validateLine, validateStoreCode, function (req, res, next) {
    const dbUser = req._user;
    const bypassCheck = req.body.byCallback == true;
    const storeCode = req.body.storeCode;
    const StoreDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    const containerAmount = parseInt(req.body.containerAmount);

    if (isNaN(containerAmount) || containerAmount <= 0)
        return res.status(403).json({
            code: 'L002',
            type: 'userOrderMessage',
            message: `Content not in Correct Format.\n` +
                `StoreCode: ${storeCode}, ContainerAmount: ${containerAmount}`,
            txt: "系統維修中>< 請稍後再試！"
        });

    userIsAvailableForRentContainer(dbUser, containerAmount, bypassCheck, (err, isAvailable, detail) => {
        if (err)
            return next(err);
        if (!isAvailable) {
            if (detail.rentalQualification === RentalQualification.BANNED)
                return res.status(403).json({
                    code: 'L001',
                    type: 'userOrderMessage',
                    message: `User is Banned.`,
                    txt: dbUser.getBannedTxt("借用")
                });
            if (detail.rentalQualification === RentalQualification.OUT_OF_QUOTA)
                return res.status(403).json({
                    code: 'L004',
                    type: 'userOrderMessage',
                    message: `ContainerAmount is Over Quantity Limitation. \n` +
                        `ContainerAmount: ${containerAmount}, UsingAmount: ${detail.data.usingAmount}`,
                    txt: `您最多只能借 ${detail.data.holdingQuantityLimitation} 個容器`
                });
            else
                return next(new Error("User is not available for renting container because of UNKNOWN REASON"));
        }

        const storeID = req._storeID;
        const funcList = [];
        const now = Date.now();
        for (let i = 0; i < containerAmount; i++) {
            funcList.push(new Promise((resolve, reject) => {
                let newOrder = new UserOrder({
                    orderID: generateUUID(),
                    user: dbUser._id,
                    storeID,
                    orderTime: now
                });
                newOrder.save((err) => {
                    if (err) return reject(err);
                    resolve();
                });
            }));
        }
        Promise
            .all(funcList)
            .then(() => {
                res.json({
                    storeName: StoreDict[storeID].name,
                    containerAmount,
                    time: now
                });
                userTrade.refreshUserUsingStatus(dbUser, {
                    sendNotice: false,
                    banOrUnbanUser: true
                }, err => {
                    if (err) return debug.error(err);
                });
            })
            .catch(next);
    });
});

/**
 * @apiName RegisterContainerID
 * @apiGroup UserOrder
 * 
 * @api {post} /userOrder/registerContainer Register ContainerID of UserOrder
 * @apiUse LINE
 * 
 * @apiParam {String} orderID orderID.
 * @apiParam {String} containerID containerID.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *          code: '???',
 *          type: 'userOrderMessage',
 *          message: 'Register ContainerID of UserOrder Success'
 *      }
 */

router.post('/registerContainer', validateLine, function (req, res, next) {
    const dbUser = req._user;
    const orderID = req.body.orderID;
    const containerID = parseInt(req.body.containerID);
    const ContainerDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_ONLY_ACTIVE);

    if (typeof orderID !== "string" || isNaN(containerID))
        return res.status(403).json({
            code: 'L005',
            type: 'userOrderMessage',
            message: `Content not in Correct Format. \n` +
                `OrderID: ${orderID}, ContainerID: ${req.body.containerID}`,
            txt: "系統維修中>< 請稍後再試！"
        });
    if (!ContainerDict[containerID])
        return res.status(403).json({
            code: 'L006',
            type: 'userOrderMessage',
            message: `Can't find the Container. ContainerID: ${containerID}`,
            txt: "容器ID錯誤，請輸入正確容器 ID！"
        });

    UserOrder.findOne({
        "user": dbUser._id,
        "orderID": orderID,
        "containerID": null
    }, (err, theUserOrder) => {
        if (err) return next(err);
        if (!theUserOrder)
            return res.status(403).json({
                code: 'L007',
                type: 'userOrderMessage',
                message: `Can't find the UserOrder. orderID: ${orderID}`,
                txt: "系統維修中>< 請稍後再試！"
            });

        theUserOrder.containerID = containerID;
        getSystemBot((err, dbBot) => {
            if (err) return next(err);
            changeContainersState(containerID, dbBot, {
                action: ContainerAction.RENT,
                newState: ContainerState.USING
            }, {
                rentToUser: dbUser,
                storeID: theUserOrder.storeID,
                orderTime: theUserOrder.orderTime,
                inLineSystem: true
            }, (err, tradeSuccess, reply, tradeDetail) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(Object.assign(reply, {
                    txt: "容器ID錯誤，請輸入正確容器 ID！"
                }));
                theUserOrder.save(err => {
                    if (err) return next(err);
                    res.json({
                        code: '???',
                        type: 'userOrderMessage',
                        message: 'Register ContainerID of UserOrder Success'
                    });
                    tradeCallback.rent(tradeDetail, null);
                    userTrade.refreshUserUsingStatus(dbUser, {
                        sendNotice: false,
                        banOrUnbanUser: true
                    }, err => {
                        if (err) return debug.error(err);
                    });
                });
            });
        });
    });
});

/**
 * @apiName Challenge store code
 * @apiGroup UserOrder
 * 
 * @api {post} /userOrder/challenge/storeCode Check is store code valid
 * @apiUse LINE
 * 
 * @apiParam {String} storeCode storeCode.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *          code: '???',
 *          type: 'userOrderMessage',
 *          message: 'Verified'
 *      }
 */

router.post('/challenge/storeCode', validateLine, validateStoreCode, async (req, res, next) => {
    res.status(200).json({
        code: '???',
        type: 'userOrderMessage',
        message: 'Verified'
    })
})

/**
 * @apiName RegisterContainerID
 * @apiGroup UserOrder
 * 
 * @api {post} /userOrder/addWithContainer Add user order and register container id
 * @apiUse LINE
 * 
 * @apiParam {String} storeCode storeCode.
 * @apiParam {String[]} containers containerIDs.
 * @apiParam {Boolean} byCallback byCallback.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *          code: '???',
 *          type: 'userOrderMessage',
 *          message: 'Add user order with containerID successfully'
 *      }
 */

router.post('/addWithContainer', validateLine, validateStoreCode, function (req, res, next) {
    const dbUser = req._user;
    let containers = req.body.containers;
    const bypassCheck = req.body.byCallback === true;
    const ContainerDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_ONLY_ACTIVE);
    const StoreDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);

    if (!Array.isArray(containers))
        return res.status(403).json({
            code: 'L005',
            type: 'userOrderMessage',
            message: `Content format incorrect`,
            txt: "系統維修中>< 請稍後再試！"
        });

    containers = containers.map(id => parseInt(id));

    for (let id of containers) {
        if (!ContainerDict[id])
            return res.status(403).json({
                code: 'L006',
                type: 'userOrderMessage',
                message: `Can't find the Container. ContainerID: ${id}`,
                txt: "容器ID錯誤，請輸入正確容器 ID！"
            });
    }

    const containerAmount = containers.length;

    userIsAvailableForRentContainer(dbUser, containerAmount, bypassCheck, (err, isAvailable, detail) => {
        if (err) return next(err);
        if (!isAvailable) {
            if (detail.rentalQualification === RentalQualification.BANNED)
                return res.status(403).json({
                    code: 'L001',
                    type: 'userOrderMessage',
                    message: `User is Banned.`,
                    txt: dbUser.getBannedTxt("借用")
                });
            if (detail.rentalQualification === RentalQualification.OUT_OF_QUOTA)
                return res.status(403).json({
                    code: 'L004',
                    type: 'userOrderMessage',
                    message: `ContainerAmount is Over Quantity Limitation. \n` +
                        `ContainerAmount: ${containerAmount}, UsingAmount: ${detail.data.usingAmount}`,
                    txt: `您最多只能借 ${detail.data.holdingQuantityLimitation} 個容器`
                });
            else
                return next(new Error("User is not available for renting container because of UNKNOWN REASON"));
        }

        const storeID = req._storeID
        const now = Date.now();

        getSystemBot((err, dbBot) => {
            if (err) return next(err);
            let userOrders = containers.map(id =>
                new UserOrder({
                    orderID: generateUUID(),
                    user: dbUser._id,
                    containerID: id,
                    storeID,
                    orderTime: now
                })
            );

            new Promise((resolve, reject) => {
                    changeContainersState(containers, dbBot, {
                        action: ContainerAction.RENT,
                        newState: ContainerState.USING
                    }, {
                        rentToUser: dbUser,
                        storeID,
                        orderTime: now,
                        inLineSystem: true
                    }, (err, tradeSuccess, reply, tradeDetail) => {
                        if (err) return next(err);
                        return tradeSuccess ?
                            resolve(tradeCallback.rent(tradeDetail, null)) :
                            reject({
                                status: 403,
                                json: Object.assign(reply, {
                                    txt: "容器ID錯誤，請輸入正確容器 ID！"
                                })
                            });
                    });
                })
                .then(() => userOrders.map(order => order.save()))
                .then(() => {
                    res.status(200).json({
                        code: '???',
                        type: 'userOrderMessage',
                        message: 'Create user order with containers successfully',
                        storeName: StoreDict[storeID].name
                    });

                    return userTrade.refreshUserUsingStatus(dbUser, {
                        sendNotice: false,
                        banOrUnbanUser: true
                    }, err => {
                        if (err) return debug.error(err);
                    });
                })
                .catch(err => {
                    if (err.status && err.json) {
                        res.status(err.status).json(err.json);
                    } else {
                        next(err);
                    }
                });
        });
    });
});

module.exports = router;