const express = require('express');
const router = express.Router();
const fs = require('fs');
const request = require('axios');

const debug = require('../helpers/debugger')('foodpandaOrder');

const validateLine = require('../middlewares/validation/authorization/validateLine').all;
const validateStoreCode = require('../middlewares/validation/content/userOrder').storeCode;

const FoodpandaOrder = require('../models/DB/foodpandaOrderDB');
const UserOrder = require('../models/DB/userOrderDB');
const config = require("../config/config");

const mapFoodpandaOrderToPlainObject = (order) => ({
    orderID: order.orderID,
    userOrders: order.userOrders,
    storeID: order.storeID,
    archived: order.archived
})

const foodpandaOrderIDStoreCodeMap = {
    "z0lf": "2324",
    "h3cs": "2337",
    "y1iz": "0526",
    "d3gx": "2353",
    "f4sa": "2366",
    "e5mr": "2379",
    "y0vc": "2382",
    "d3zi": "2395",
    "z9wp": "2400",
    "u4lx": "2413",
    "a8ba": "0788",
    "f7cv": "2340",
    "z9ae": "2426",
    "y7ph": "0026",
    "y2in": "2439",
    "z2st": "2442",
    "a2qj": "2455",
    "q4ug": "2468",
    "a7wu": "2471",
    "z2cl": "2484",
    "b8ig": "2497",
    "o1dx": "2502",
}

router.get('/challenge/:foodpandaOrderID', validateLine, (req, res, next) => {
    const { foodpandaOrderID } = req.params
    const segments = foodpandaOrderID.split('-')
    const storeCode = foodpandaOrderIDStoreCodeMap[segments[0]]

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
        
                    const foodpandaOrder = new FoodpandaOrder();
                    foodpandaOrder.orderID = orderID;
                    foodpandaOrder.user = user;
                    foodpandaOrder.userOrders = orders.map(order=>order._id);
                    foodpandaOrder.storeID = req._storeID;
        
                    return foodpandaOrder.save();
                })
                .then( _ => {
                    return res.status(200).send()
                })
                .catch( err => {
                    return res.status(422).send(err)
                })
        })
        .catch(err => {
            return res.status(422).json(err)
        })
})

router.patch('/update', validateLine, validateStoreCode, (res, req, next) => {
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

            return FoodpandaOrder
                .findOne({ orderID: order })
                .then((foodpandaOrder) => {
                    foodpandaOrder.userOrders = orders.map(order=>order._id)
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
})

let messages = []

const sendLineMessage = (lineId, message) => {
    debug.log(`Send message to ${lineId}`)
    messages.push({ lineId, message })
}

setInterval(() => {
    if (messages.length === 0) {
        return
    }

    fs.readFile(`${config.staticFileDir}/assets/json/webhook_submission.json`, (err, webhookSubmission) => {
        if (err)
            return debug.error(err);
        webhookSubmission = JSON.parse(webhookSubmission);
        request
            .post(webhookSubmission.message.url, {
                messages
            })
            .then(() => {
                messages = []
            })
    });
}, 1000)

router.put('/archive', validateLine, (req, res, next) => {
    const { order, message } = req.body

    FoodpandaOrder.findOne({
        "orderID": order,
        "user": req._user._id
    })
        .populate([{ path: 'userOrders', select: 'archived'}])
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

            foodpandaOrder.archived = true;
            return foodpandaOrder.save()
        })
        .then(_ => {
            sendLineMessage(req._user.user.line_channel_userID || req._user.user.line_liff_userID, message);
            return res.status(200).send()
        })
        .catch( err => {
            return res.status(422).send(err)
        })
})

router.get('/candidates', validateLine, (req, res, next) => {
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