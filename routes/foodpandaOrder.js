const express = require('express');
const router = express.Router();
const fs = require('fs');
const request = require('axios');
const redis = require('../models/redis');
const debug = require('../helpers/debugger')('foodpandaOrder');

const validateLine = require('../middlewares/validation/authorization/validateLine').all;
const validateStoreCode = require('../middlewares/validation/content/userOrder').storeCode;

const FoodpandaOrder = require('../models/DB/foodpandaOrderDB');
const UserOrder = require('../models/DB/userOrderDB');
const config = require("../config/config");
const { intReLength } = require('../helpers/toolkit');
const computeDaysToDue = require('../models/computed/dueStatus').daysToDue;
const DataCacheFactory = require('../models/dataCacheFactory');
const { checkRoleIsAdmin } = require('../middlewares/validation/authorization/validateRequest');
const validateRequest = require('../middlewares/validation/authorization/validateRequest').JWT;

const mapFoodpandaOrderToPlainObject = (order) => ({
    orderID: order.orderID,
    userOrders: order.userOrders,
    storeID: order.storeID,
    archived: order.archived
})

const queue = require('queue')({
    concurrency: 1,
    autostart: true
});

const getFoodpandaOrderIDStoreCodeMap = () => require('../config/foodpanda.json').idMap;

router.get('/stores', validateLine, (req, res, next) => {
    const storeIDs = Object.values(getFoodpandaOrderIDStoreCodeMap())
        .map(storeCode => Number.parseInt(storeCode.slice(0, -1), 10))

    return res.json({ids: storeIDs})
})

router.get('/challenge/:foodpandaOrderID', validateLine, (req, res, next) => {
    const { foodpandaOrderID } = req.params
    const segments = foodpandaOrderID.split('-')
    const storeCode = getFoodpandaOrderIDStoreCodeMap()[segments[0]]

    if (segments.length !== 2 || typeof storeCode !== 'string') {
        return res.status(403).json({
            code: 'L026',
            type: 'validatingFoodpandaOrder',
            message: 'Illegal FoodpandaOrder'
        })
    }

    FoodpandaOrder.findOne({
        "orderID": foodpandaOrderID
    })
        .populate({ path: 'userOrders', select: 'containerID -_id'})
        .exec()
        .then(order => {
            if (order) {
                return res.status(403).json({
                    code: 'L027',
                    type: 'validatingFoodpandaOrder',
                    message: 'Order had been registered',
                    data: {
                        orderId: order.orderID,
                        containers: order.userOrders.map(userOrder => userOrder.containerID)
                    }
                })  
            }

            return res.json({
                storeCode
            })
        })
        .catch( err => {
            return res.status(422).send(err)
        })
})

router.post('/add', validateLine, validateStoreCode, (req, res, next) => {
    queue.push(cb => {
        const { orderID, userOrders } = req.body;
        const user = req._user;

        if (userOrders.length === 0) {
            return res.status(403).json({
                code: 'L025',
                type: 'validatingUserOrders',
                message: 'You should at least assign one user order'
            })
        }

        FoodpandaOrder
            .findOne({"orderID": orderID})
            .populate({ path: 'userOrders', select: 'containerID -_id'})
            .exec()
            .then(order => {
                if (order) {
                    return res.status(403).json({
                        code: 'L027',
                        type: 'validatingFoodpandaOrder',
                        message: 'Order had been registered',
                        data: {
                            orderId: order.orderID,
                            containers: order.userOrders.map(userOrder => userOrder.containerID)
                        }
                    })
                }

                UserOrder.find({
                    "orderID": { $in: userOrders },
                    "user": user._id
                })
                    .then(orders => {
                        if (orders.filter(order=>order.storeID === req._storeID).length !== userOrders.length) {
                            return res.status(403).json({
                                code: 'L021',
                                type: 'validatingUserOrder',
                                message: 'User Order not found'
                            })
                        }

                        const promises = userOrders.map(userOrderID => {
                            return new Promise((resolve, reject) => {
                                redis.get(`foodpandaOrder:usedUserOrders:${userOrderID}`, (err, string) => {
                                    if (err) {
                                        return reject(err)
                                    }
                                    return resolve(string)
                                })
                            })
                                .then(string => {
                                    if (string === 'true') {
                                        return false
                                    }
                                    return true
                                })
                        })

                        return Promise.all(promises)
                            .then(values => {
                                if (values.includes(false)) {
                                    throw {
                                        code: 'L028',
                                        type: 'validatingUserOrder',
                                        message: 'User Order has been registered'
                                    }
                                }
                            })
                            .then(_ => {
                                const foodpandaOrder = new FoodpandaOrder();
                                foodpandaOrder.orderID = orderID;
                                foodpandaOrder.user = user;
                                foodpandaOrder.userOrders = orders.map(order=>order._id);
                                foodpandaOrder.storeID = req._storeID;
                    
                                return foodpandaOrder.save();
                            })
                    })
                    .then( _ => {
                        userOrders.forEach(userOrderID => {
                            redis.set(`foodpandaOrder:usedUserOrders:${userOrderID}`, 'true')
                        })
                        
                        res.status(200).send()
                    })
                    .catch( err => {
                        return res.status(typeof err.code === 'string' ? 403 : 422).send(err)
                    })
            })
            .catch(err => {
                return res.status(422).json(err)
            })
            .then(() => cb())
    })
})

router.patch('/update', validateLine, validateStoreCode, (res, req, next) => {
    queue.push(cb => {
        const { userOrders, order } = req.body;
        const user = req._user;

        if (userOrders.length === 0) {
            return res.status(403).json({
                code: 'L025',
                type: 'validatingUserOrders',
                message: 'You should at least assign one user order'
            })
        }

        UserOrder.find({
            "orderID": { $in: userOrders },
            "user": user._id
        })
            .exec()
            .then(orders => {
                if (orders.length !== userOrders.length) {
                    return res.status(403).json({
                        code: 'L021',
                        type: 'validatingUserOrder',
                        message: 'User Order not found'
                    })
                }
                let originOrders = []
                return FoodpandaOrder
                    .findOne({ orderID: order })
                    .then((foodpandaOrder) => {
                        originOrders = foodpandaOrder.userOrders
                        foodpandaOrder.userOrders = orders.map(order=>order._id)
                        return foodpandaOrder.save()
                    })
                    .then(() => {
                        originOrders.forEach(userOrderID => {
                            redis.set(`foodpandaOrder:usedUserOrders:${userOrderID}`, 'false')
                        })
                        userOrders.forEach(userOrderID => {
                            redis.set(`foodpandaOrder:usedUserOrders:${userOrderID}`, 'true')
                        })
                    })
                    .catch(_ => {
                        return res.status(403).json({
                            code: 'L022',
                            type: 'validatingFoodpandaOrder',
                            message: 'Foodpanda Order not found'
                        })
                    })
            })
            .then( _ => {
                return res.status(200).send()
            })
            .catch( err => {
                return res.status(422).send(err)
            })
            .then(() => cb())
    })
})

router.put('/archive', checkRoleIsAdmin(), validateRequest, (req, res, next) => {
    queue.push(cb => {
        const { order, message } = req.body

        FoodpandaOrder.findOne({
            "orderID": order,
        })
            .populate([{ path: 'userOrders', select: 'archived'}, { path: 'user', select: 'user'}])
            .exec()
            .then((foodpandaOrder) => {
                const shouldFail = foodpandaOrder.userOrders.map((userOrder) => userOrder.archived).includes(false);

                if (shouldFail) {
                    return res.status(403).json({
                        code: 'L023',
                        type: 'validatingFoodpandaOrder',
                        message: 'User Orders not finished'
                    })
                }

                if (foodpandaOrder.userOrders.length === 0) {
                    return res.status(403).json({
                        code: 'L025',
                        type: 'validatingUserOrders',
                        message: 'You should at least assign one user order'
                    })
                }

                foodpandaOrder.archived = true;
                return foodpandaOrder.save()
            })
            .then(foodpandaOrder => {
                const user = foodpandaOrder.user.user
                const lineId = user.line_channel_userID || user.line_liff_userID
                return new Promise((resolve, reject) => {
                    fs.readFile(`${config.staticFileDir}/assets/json/webhook_submission.json`, (err, webhookSubmission) => {
                        if (err) return reject(err);
                        webhookSubmission = JSON.parse(webhookSubmission);
                        request
                            .post(webhookSubmission.message.url, {
                                messages: [{ 
                                    lineId, message
                                }]
                            })
                            .then(() => {
                                debug.log(`Send Line message to ${lineId}`)
                                resolve()
                            })
                            .catch((err) => {
                                debug.error(`Send Line message failed: ${err}`)
                                reject(err)
                            })
                    });
                })
            })
            .then(() => {
                return res.status(200).send()
            })
            .catch( err => {
                return res.status(422).send(err)
            })
            .then(() => cb())
    })
})

router.get('/candidates', checkRoleIsAdmin(), validateRequest, (req, res, next) => {
    FoodpandaOrder
        .find({
            "archived": false
        })
        .populate({ path: 'userOrders', select: 'orderID containerID storeID archived orderTime -_id'})
        .exec()
        .then(orders => {            
            return res.send(orders.filter(order => order.userOrders.find(o => o.archived === false) === undefined).map(order => mapFoodpandaOrderToPlainObject(order)))
        })
})

router.get('/all', validateLine, (req, res, next) => {
    const user = req._user
    const archived = req.query.archived
    const query = archived  === undefined 
        ? {
            "user": user._id
        }
        : {
            "user": user._id,
            "archived": archived
        }
    
    FoodpandaOrder
        .find(query)
        .populate({ path: 'userOrders', select: 'orderID containerID storeID archived orderTime -_id'})
        .exec()
        .then(orders => {
            return res.send(orders.map(order => mapFoodpandaOrderToPlainObject(order)))
        })
        .catch( err => {
            return res.status(422).send(err)
        })
})

router.delete('/:id', checkRoleIsAdmin(), validateRequest, (req, res, next) => {
    queue.push(cb => {
        const orderID = req.params.id

        if (typeof orderID !== 'string' || orderID.length === 0) {
            return res.status(403).json({
                code: 'L024',
                type: 'validatingFoodpandaOrder',
                message: 'illegal orderID'
            })
        }

        FoodpandaOrder.findOneAndDelete({
            "orderID": orderID,
        })
            .populate({ path: 'userOrders', select: 'orderID -_id'})
            .exec()
            .then(order => {
                order.userOrders.forEach(userOrder => {
                    redis.set(`foodpandaOrder:usedUserOrders:${userOrder.orderID}`, 'false')
                })
                return res.status(200).send()
            })
            .catch((err) => {
                return res.status(404).json(err)
            })
            .then(() => cb())
    })
})

router.get('/qualifiedUserOrders', validateLine, validateStoreCode, (req, res, next) => {
    const storeID = req._storeID
    const now = Date.now()

    UserOrder.find({
        "storeID": storeID,
        "user": req._user._id,
        "archived": false,
        "containerID": { $ne: null } 
    })
        .exec()
        .then( (userOrders) => {
            return Promise.all(userOrders.map(userOrder => {
                return new Promise((resolve, reject) => {
                    redis.get(`foodpandaOrder:usedUserOrders:${userOrder.orderID}`, (err, string) => {
                        if (err) reject(err)

                        resolve({
                            ...userOrder._doc,
                            hasBinded: string === 'true' ? true : false
                        })
                    })
                })
            }))
        })
        .then(userOrders => {
            const orders = userOrders
                .filter(userOrder => userOrder.hasBinded === false)
                .map(userOrder => {
                    const StoreDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
                    const ContainerDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_WITH_DEACTIVE);
                    const daysToDue = computeDaysToDue(userOrder.orderTime, req._user.getPurchaseStatus(), now);
                    return ({
                        orderID: userOrder.orderID,
                        containerID: `#${intReLength(userOrder.containerID, 4)}`,
                        containerType: ContainerDict[userOrder.containerID],
                        orderTime: userOrder.orderTime,
                        storeName: StoreDict[userOrder.storeID].name,
                        storeID: userOrder.storeID,
                        daysToDue
                    })
                })

            return res.send(orders)
        })
        .catch(err => res.status(422).send(err))
})

router.get('/:id', validateLine, (req, res, next) => {
    const orderID = req.params.id

    if (typeof orderID !== 'string' || orderID.length === 0) {
        return res.status(403).json({
            code: 'L024',
            type: 'validatingFoodpandaOrder',
            message: 'illegal orderID'
        })
    }

    FoodpandaOrder.findOne({
        "orderID": orderID,
        "user": req._user._id
    })
        .populate({ path: 'userOrders', select: 'orderID containerID storeID archived orderTime -_id'})
        .exec()
        .then((order) => {
            return res.send(mapFoodpandaOrderToPlainObject(order))
        })
        .catch( err => {
            return res.status(404).send(err)
        })
})

module.exports = router;