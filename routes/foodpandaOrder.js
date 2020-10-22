const express = require('express');
const router = express.Router();
const fs = require('fs');

const debug = require('../helpers/debugger')('foodpandaOrder');

const validateRequest = require('../middlewares/validation/authorization/validateRequest').JWT;
const validateLine = require('../middlewares/validation/authorization/validateLine').all;
const validateStoreCode = require('../middlewares/validation/content/userOrder').storeCode;

const FoodpandaOrder = require('../models/DB/foodpandaOrderDB');
const UserOrder = require('../models/DB/userOrderDB');
const User = require('../models/DB/userDB');
const config = require("../config/config");

const DataCacheFactory = require('../models/dataCacheFactory');
const { generateUUID } = require('../helpers/tools');

const mapFoodpandaOrderToPlainObject = (order) => ({
    orderID: order.orderID,
    userOrders: order.userOrders,
    storeID: order.storeID,
    archived: order.archived
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

    UserOrder.find({
        "orderID": { $in: userOrders },
        "user": user._id
    })
        .then(orders => {
            if (orders.length !== userOrders.length) {
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
            return res.status(422).json(err)
        })
})

let messages = []

const sendLineMessage = (lineId, message) => {
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
        webhookSubmission.client.forEach(aClient => {
            if ((typeof aClient.event_listened === "string" && aClient.event_listened === "all") ||
                (Array.isArray(aClient.event_listened) && aClient.event_listened.indexOf(this.options.event) !== -1)) {
                    request
                    .post(aClient.url, {
                        messages
                    })
                    .then(() => {
                        messages = []
                    })
            }
        });
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
            sendLineMessage(req._user.line_liff_userID, message);
            return res.status(200).send()
        })
        .catch( err => {
            return res.status(422).json(err)
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
    console.log(query)
    FoodpandaOrder
        .find(query)
        .populate({ path: 'userOrders', select: 'containerID storeID archived orderTime'})
        .exec()
        .then(orders => {
            console.log(orders)
            return res.send(orders.map(order => mapFoodpandaOrderToPlainObject(order)))
        })
        .catch( err => {
            return res.status(422).json(err)
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
        .populate({ path: 'userOrders', select: 'containerID storeID archived orderTime'})
        .exec()
        .then((order) => {
            return res.send(mapFoodpandaOrderToPlainObject(order))
        })
        .catch( err => {
            return res.status(404).json(err)
        })
})

module.exports = router;