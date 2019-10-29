const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('userOrder');

const validateLine = require('../middlewares/validation/validateLine').all;

const userTrade = require('../controllers/userTrade');
const tradeCallback = require('../controllers/tradeCallback');
const changeContainersState = require('../controllers/containerTrade');

const intReLength = require('../helpers/toolkit').intReLength;

const generateUUID = require('../helpers/tools').generateUUID;
const computeDaysOfUsing = require("../helpers/tools").computeDaysOfUsing;
const userIsAvailableForRentContainer = require('../helpers/tools').userIsAvailableForRentContainer;

const User = require('../models/DB/userDB');
const UserOrder = require('../models/DB/userOrderDB');
const DueDays = require('../models/enums/userEnum').DueDays;
const RentalQualification = require('../models/enums/userEnum').RentalQualification;
const DataCacheFactory = require('../models/dataCacheFactory');

const storeCodeValidater = /\d{4}/;

function isValidStoreCode(storeCode) {
    const StoreDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    const storeID = parseInt(storeCode.substring(0, 3));
    return (getCheckCode(storeID) === parseInt(storeCode.substring(3, 4)) &&
        StoreDict[storeID]);
}

function getCheckCode(storeID) {
    return (parseInt(storeID / 100) % 10 * 1 + parseInt(storeID / 10) % 10 * 2 + parseInt(storeID / 1) % 10 * 3) % 10;
}

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
        userOrderList.sort((a, b) => b.orderTime - a.orderTime);
        userOrderList.forEach(aUserOrder => {
            const daysToDue = DueDays[dbUser.getPurchaseStatus()] - computeDaysOfUsing(aUserOrder.orderTime, Date.now());
            const storeCode = aUserOrder.storeID.toString().padStart(3, '0') + `${getCheckCode(aUserOrder.storeID)}`
            if (aUserOrder.containerID === null) {
                if (orderListWithoutID[aUserOrder.orderID]) {
                    orderListWithoutID[aUserOrder.orderID].containerAmount++;
                } else {
                    let aFormattedUserOrder = {
                        orderID: aUserOrder.orderID,
                        containerAmount: 1,
                        orderTime: aUserOrder.orderTime,
                        storeName: StoreDict[aUserOrder.storeID].name,
                        storeCode,
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
                    storeCode,
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

router.post('/add', validateLine, function (req, res, next) {
    const dbUser = req._user;
    const bypassCheck = req.body.byCallback == true;
    const storeCode = req.body.storeCode;
    const StoreDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    const containerAmount = parseInt(req.body.containerAmount);

    if (typeof storeCode !== "string" || !storeCodeValidater.test(storeCode) || isNaN(containerAmount) || containerAmount <= 0)
        return res.status(403).json({
            code: 'L002',
            type: 'userOrderMessage',
            message: `Content not in Correct Format.\n` +
                `StoreCode: ${storeCode}, ContainerAmount: ${containerAmount}`,
            txt: "系統維修中>< 請稍後再試！"
        });
    if (!isValidStoreCode(storeCode))
        return res.status(403).json({
            code: 'L003',
            type: 'userOrderMessage',
            message: `StoreCode not Correct`,
            txt: "店舖代碼錯誤，請輸入正確店舖代碼！"
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

        const storeID = parseInt(storeCode.substring(0, 3));
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
                userTrade.refreshUserUsingStatus(false, dbUser, err => {
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
        User.findOne({
            "user.phone": "0900000000"
        }, (err, dbBot) => {
            if (err) return next(err);
            if (!dbBot) {
                dbBot = new User({
                    user: {
                        phone: "0900000000",
                        password: null,
                        name: "GoodToGoBot"
                    },
                    roles: {
                        typeList: ["bot", "clerk"],
                        clerk: {
                            storeID: 17,
                            manager: false
                        }
                    }
                });
                dbBot.save(err => {
                    if (err) debug.error(err);
                });
            }
            if (!dbBot.roles.clerk) {
                dbBot.roles.typeList.push("clerk");
                dbBot.roles.clerk = {
                    storeID: 17,
                    manager: false
                };
            }
            dbBot.roles.clerk.storeID = theUserOrder.storeID;
            changeContainersState(containerID, dbBot, {
                action: "Rent",
                newState: 2
            }, {
                rentToUser: dbUser,
                orderTime: theUserOrder.orderTime,
                activity: "沒活動",
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
                });
                tradeCallback.rent(tradeDetail, null);
                userTrade.refreshUserUsingStatus(false, dbUser, err => {
                    if (err) return debug.error(err);
                });
            });
        });
    });
});

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

router.post('/addWithContainer', validateLine, async function (req, res, next) {
    const dbUser = req._user;
    const storeCode = req.body.storeCode;
    let containers = req.body.containers;
    const bypassCheck = req.body.byCallback === true;
    const ContainerDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_ONLY_ACTIVE);

    if (Array.isArray(containers) || storeCodeValidater.test(storeCode))
        return res.status(403).json({
            code: 'L005',
            type: 'userOrderMessage',
            message: `Content format incorrect`,
            txt: "系統維修中>< 請稍後再試！"
        });

    containers = containers.map(id=>parseInt(id));

    for (let id in containers) {
        if (!ContainerDict[id])
            return res.status(403).json({
                code: 'L006',
                type: 'userOrderMessage',
                message: `Can't find the Container. ContainerID: ${id}`,
                txt: "容器ID錯誤，請輸入正確容器 ID！"
            });
    }

    const containerAmount = containers.length;

    userIsAvailableForRentContainer(dbUser, containerAmount, bypassCheck, async (err, isAvailable, detail) => {
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

        const session = await UserOrder.db.startSession();
        session.startTransaction()

        const storeID = parseInt(storeCode.substring(0, 3));
        const now = Date.now();
        const docs = containers.map(id => ({
                orderID: generateUUID(),
                user: dbUser._id,
                containerID: id,
                storeID,
                orderTime: now
            })
        );

        let dbBot = await User.findOne({
            "user.phone": "0900000000"
        }) || await (new User({
            user: {
                phone: "0900000000",
                password: null,
                name: "GoodToGoBot"
            },
            roles: {
                typeList: ["bot", "clerk"],
                clerk: {
                    storeID: 17,
                    manager: false
                }
            }
        }).save());

        if (!dbBot.roles.clerk) {
            dbBot.roles.typeList.push("clerk");
            dbBot.roles.clerk = {
                storeID: 17,
                manager: false
            };
        }
        dbBot.roles.clerk.storeID = storeID;

        UserOrder.create(docs, {session: session}, (err, userOrders) => {
            if (err) next(err);

            Promise.all(userOrders.map(order => {
                return new Promise((resolve, reject) => {
                    changeContainersState(order.containerID, dbBot, {
                        action: "Rent",
                        newState: 2
                    }, {
                        rentToUser: dbUser,
                        orderTime: order.orderTime,
                        activity: "沒活動",
                        inLineSystem: true
                    }, (err, tradeSuccess, reply, tradeDetail) => {
                        if (err) return next(err);
                        return  tradeSuccess ?
                            resolve(tradeCallback.rent(tradeDetail, null)) :
                            reject({status: 403, json: Object.assign(reply, {
                                txt: "容器ID錯誤，請輸入正確容器 ID！"
                            })})
                    });
                })
            }))
                .then(() => session.commitTransaction())
                .then(() => {
                    session.endSession()

                    res.status(200).json({
                        code: '???',
                        type: 'userOrderMessage',
                        message: 'Register ContainerID of UserOrder Success'
                    })
                    
                    return userTrade.refreshUserUsingStatus(false, dbUser, err => {
                        if (err) return debug.error(err);
                    });
                })
                .catch(async err => {
                    if (err.status && err.json) {
                        res.status(err.status).json(err.json)
                    } else {
                        next(err)
                    }

                    await session.abortTransaction()
                    return session.endSession()
                })
        })
    });
});

module.exports = router;