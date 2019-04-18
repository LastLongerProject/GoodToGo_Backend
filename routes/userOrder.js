const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('userOrder');

const validateLine = require('../middlewares/validation/validateLine');

const intReLength = require('@lastlongerproject/toolkit').intReLength;

const UserOrder = require('../models/DB/userOrderDB');
const DataCacheFactory = require('../models/dataCacheFactory');

/**
 * @apiName DataForLine
 * @apiGroup Users
 * 
 * @api {get} /userOrder/list Get user data for Line
 * @apiUse JWT
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
 * @apiGroup Users
 * 
 * @api {get} /userOrder/add Get user data for Line
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *           code: '???',
 *          type: 'userOrderMessage',
 *          message: 'Add UserOrder Success'
 *      }
 */

router.post('/add', validateLine, function (req, res, next) {
    const dbUser = req._user;
    const storeID = parseInt(req.body.storeID);
    const containerAmount = parseInt(req.body.containerAmount);

    if (isNaN(storeID) || isNaN(containerAmount))
        return res.status(401).json({
            code: '???',
            type: 'userOrderMessage',
            message: `Content not in Correct Format. \n` +
                `StoreID: ${storeID}, ContainerAmount: ${containerAmount}`
        });

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