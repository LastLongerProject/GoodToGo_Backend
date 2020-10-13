const express = require('express');
const router = express.Router();

const debug = require('../helpers/debugger')('foodpandaOrder');

const validateRequest = require('../middlewares/validation/authorization/validateRequest').JWT;
const validateLine = require('../middlewares/validation/authorization/validateLine').all;
const validateStoreCode = require('../middlewares/validation/content/userOrder').storeCode;

const FoodpandaOrder = require('../models/DB/foodpandaOrderDB');
const UserOrder = require('../models/DB/userOrderDB');
const User = require('../models/DB/userDB');

const DataCacheFactory = require('../models/dataCacheFactory');
const { generateUUID } = require('../helpers/tools');

router.post('/', validateRequest, validateLine, validateStoreCode, (req, res, next) => {
    const {phone, userOrders} = req.body;
    
    User.findOne({ "user.phone": phone })
        .then((user) => {
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
                    foodpandaOrder.orderID = generateUUID();
                    foodpandaOrder.user = user;
                    foodpandaOrder.userOrders = orders;
                    foodpandaOrder.storeID = req._storeID;

                    return foodpandaOrder.save();
                })
                .then( _ => {
                    return res.status(200).json()
                })
                .catch((_) => {
                    return res.status(403).json({
                        code: 'L021',
                        type: 'validatingUserOrder',
                        message: 'User Order not found'
                    })
                })
        })
        .catch((_) => {
            return res.status(401).json({
                code: 'B002',
                type: 'validatingUser',
                message: 'User not Found'
            })
        })
})

router.patch('/', validateRequest, validateLine, validateStoreCode, (res, req, next) => {
    const { phone, userOrders, order } = req.body;

    User.findOne({ "user.phone": phone })
        .then((user) => {
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
                            foodpandaOrder.userOrders = orders
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
                    return res.status(200).json()
                })
                .catch((_) => {
                    return res.status(403).json({
                        code: 'L021',
                        type: 'validatingUserOrder',
                        message: 'User Order not found'
                    })
                })
        })
        .catch((_) => {
            return res.status(401).json({
                code: 'B002',
                type: 'validatingUser',
                message: 'User not Found'
            })
        })
})

router.put('/archive', validateRequest, validateLine, (req, res, next) => {

})

module.exports = router;