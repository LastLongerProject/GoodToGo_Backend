const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('userOrder');

const validateLine = require('../middlewares/validation/validateLine').liff;

const changeContainersState = require('../controllers/containerTrade');

const intReLength = require('@lastlongerproject/toolkit').intReLength;
const generateUUID = require('../helpers/tools').generateUUID;

const NotificationCenter = require('../helpers/notifications/center');

const UserOrder = require('../models/DB/userOrderDB');
const User = require('../models/DB/userDB');
const userUsingAmount = require('../models/variables/containerStatistic').user_using;
const DataCacheFactory = require('../models/dataCacheFactory');

const storeCodeValidater = /\d{4}/;

function isValidStoreCode(storeCode) {
    const StoreDict = DataCacheFactory.get('store');
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
 *			    storeName : String // 正興咖啡館
 *		    }, ...
 *	        ],
 *	        orderListWithID : [
 *		    {
 *			    containerID : String, // #001
 *			    containerType : String, // 12oz 玻璃杯
 *			    orderTime : Date,
 *			    storeName : String // 正興咖啡館
 *		    }, ...
 *	        ]
 *      }
 */

router.get('/list', validateLine, function (req, res, next) {
    const dbUser = req._user;
    const StoreDict = DataCacheFactory.get('store');
    const ContainerDict = DataCacheFactory.get('containerWithDeactive');
    UserOrder.find({
        "user": dbUser._id
    }, (err, userOrderList) => {
        if (err) return next(err);
        let orderListWithoutID = {};
        let orderListWithID = [];
        userOrderList.sort((a, b) => b.orderTime - a.orderTime);
        userOrderList.forEach(aUserOrder => {
            if (aUserOrder.containerID === null) {
                if (orderListWithoutID[aUserOrder.orderID]) {
                    orderListWithoutID[aUserOrder.orderID].containerAmount++;
                } else {
                    let aFormattedUserOrder = {
                        orderID: aUserOrder.orderID,
                        containerAmount: 1,
                        orderTime: aUserOrder.orderTime,
                        storeName: StoreDict[aUserOrder.storeID].name
                    };
                    orderListWithoutID[aUserOrder.orderID] = aFormattedUserOrder;
                }
            } else {
                let aFormattedUserOrder = {
                    containerID: `#${intReLength(aUserOrder.containerID, 4)}`,
                    containerType: ContainerDict[aUserOrder.containerID],
                    orderTime: aUserOrder.orderTime,
                    storeName: StoreDict[aUserOrder.storeID].name
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
    const storeCode = req.body.storeCode;
    const StoreDict = DataCacheFactory.get('store');
    const containerAmount = parseInt(req.body.containerAmount);

    if (dbUser.hasBanned)
        return res.status(403).json({
            code: 'L001',
            type: 'userOrderMessage',
            message: `User is Banned.`,
            txt: "你還有容器未歸還喔"
        });
    if (typeof storeCode !== "string" || !storeCodeValidater.test(storeCode) || isNaN(containerAmount) || containerAmount <= 0)
        return res.status(403).json({
            code: 'L002',
            type: 'userOrderMessage',
            message: `Content not in Correct Format.\n` +
                `StoreCode: ${storeCode}, ContainerAmount: ${req.body.containerAmount}`,
            txt: "服務維修中... 請稍後再試"
        });
    if (!isValidStoreCode(storeCode))
        return res.status(403).json({
            code: 'L003',
            type: 'userOrderMessage',
            message: `StoreCode not Correct`,
            txt: "店鋪代碼輸入錯誤"
        });

    userUsingAmount(dbUser, {
        "inLineSystem": true
    }, (err, usingAmount) => {
        if (err) return next(err);
        if ((!dbUser.hasPurchase && containerAmount + usingAmount > 1))
            return res.status(403).json({
                code: 'L004',
                type: 'userOrderMessage',
                message: `ContainerAmount is Over Quantity Limitation. \n` +
                    `ContainerAmount: ${req.body.containerAmount}, UsingAmount: ${usingAmount}`,
                txt: "超過借用數量限制"
            });

        const storeID = parseInt(storeCode.substring(0, 3));

        const funcList = [];
        for (let i = 0; i < containerAmount; i++) {
            funcList.push(new Promise((resolve, reject) => {
                let newOrder = new UserOrder({
                    orderID: generateUUID(),
                    user: dbUser._id,
                    storeID
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
                    time: Date.now()
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
    const ContainerDict = DataCacheFactory.get('container');

    if (typeof orderID !== "string" || isNaN(containerID))
        return res.status(403).json({
            code: 'L005',
            type: 'userOrderMessage',
            message: `Content not in Correct Format. \n` +
                `OrderID: ${orderID}, ContainerID: ${req.body.containerID}`,
            txt: "服務維修中... 請稍後再試"
        });
    if (!ContainerDict[containerID])
        return res.status(403).json({
            code: 'L006',
            type: 'userOrderMessage',
            message: `Can't find the Container. ContainerID: ${containerID}`,
            txt: "沒有這個容器"
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
                txt: "服務維修中... 請稍後再試"
            });

        theUserOrder.containerID = containerID;
        User.findOne({
            "user.phone": "bot00003"
        }, (err, dbBot) => {
            if (err) return next(err);
            if (!dbBot) return next(new Error("server ERR"));
            dbBot.roles.clerk.storeID = theUserOrder.storeID;
            changeContainersState(containerID, dbBot, {
                action: "Rent",
                newState: 2
            }, {
                rentToUser: dbUser.user.phone,
                orderTime: theUserOrder.orderTime,
                activity: "沒活動",
                inLineSystem: true
            }, (err, tradeSuccess, reply, tradeDetail) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(Object.assign(reply, {
                    txt: "登記失敗"
                }));
                theUserOrder.save(err => {
                    if (err) return next(err);
                    res.json({
                        code: '???',
                        type: 'userOrderMessage',
                        message: 'Register ContainerID of UserOrder Success'
                    });
                });
                if (tradeDetail) {
                    NotificationCenter.emit("container_rent", {
                        customer: tradeDetail[0].newUser
                    }, {
                        containerList: reply.containerList
                    });
                }
            });

        });
    });
});

module.exports = router;