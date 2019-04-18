const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('userOrder');

const validateLine = require('../middlewares/validation/validateLine');

const intReLength = require('@lastlongerproject/toolkit').intReLength;

const UserOrder = require('../models/DB/userOrderDB');
const DataCacheFactory = require('../models/dataCacheFactory');

const storeCodeValidater = /\d{4}/;

function isValidStoreCode(storeCode) {
    if (typeof storeCode !== "string") return false;
    if (storeCodeValidater.test(storeCode)) return false;
    if (getCheckCode(parseInt(storeCode.substring(0, 3))) !== parseInt(storeCode.substring(3, 4))) return false;
    return true;
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
        console.log(userOrderList);
        userOrderList.forEach(aUserOrder => {
            if (aUserOrder.containerID === null) {
                if (orderListWithoutID[aUserOrder.orderID]) {
                    orderListWithoutID[aUserOrder.orderID].containerAmount++;
                } else {
                    let aFormattedUserOrder = {
                        orderID: aUserOrder.orderID,
                        containerAmount: 1,
                        orderTime: aUserOrder.orderTime,
                        storeName: StoreDict[aUserOrder.storeID]
                    };
                    orderListWithoutID[aUserOrder.orderID] = aFormattedUserOrder;
                }
            } else {
                let aFormattedUserOrder = {
                    containerID: `#${intReLength(aUserOrder.containerID, 4)}`,
                    containerType: ContainerDict[aUserOrder.containerID],
                    orderTime: aUserOrder.orderTime,
                    storeName: StoreDict[aUserOrder.storeID]
                };
                orderListWithID.push(aFormattedUserOrder);
            }
        });
        res.json({
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
 *          code: '???',
 *          type: 'userOrderMessage',
 *          message: 'Add UserOrder Success'
 *      }
 */

router.post('/add', validateLine, function (req, res, next) {
    const dbUser = req._user;
    const storeCode = req.body.storeCode;
    const containerAmount = parseInt(req.body.containerAmount);

    if (isValidStoreCode(storeCode) || isNaN(containerAmount))
        return res.status(401).json({
            code: '???',
            type: 'userOrderMessage',
            message: `Content not in Correct Format. \n` +
                `StoreID: ${storeID}, ContainerAmount: ${req.body.containerAmount}`
        });

    const storeID = parseInt(storeCode.substring(0, 3));
    let newOrder = new UserOrder({
        orderID: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        user: dbUser._id,
        storeID
    });
    newOrder.save((err) => {
        if (err) return next(err);
        res.json({
            code: '???',
            type: 'userOrderMessage',
            message: 'Add UserOrder Success'
        });
    });
});

/**
 * @apiName RegisterContainerID
 * @apiGroup UserOrder
 * 
 * @api {get} /userOrder/registerContainer Register ContainerID of UserOrder
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
        return res.status(401).json({
            code: '???',
            type: 'userOrderMessage',
            message: `Content not in Correct Format. \n` +
                `OrderID: ${orderID}, ContainerID: ${req.body.containerID}`
        });
    if (!ContainerDict[containerID])
        return res.status(401).json({
            code: '???',
            type: 'userOrderMessage',
            message: `Can't find the Container. ContainerID: ${containerID}`
        });

    UserOrder.findOne({
        "user": dbUser._id,
        "orderID": orderID,
        "containerID": null
    }, (err, theUserOrder) => {
        if (err) return next(err);
        if (!theUserOrder)
            return res.status(401).json({
                code: '???',
                type: 'userOrderMessage',
                message: `Can't find the UserOrder. orderID: ${orderID}`
            });

        theUserOrder.containerID = containerID;
        res.json({
            code: '???',
            type: 'userOrderMessage',
            message: 'Register ContainerID of UserOrder Success'
        });
    });
});