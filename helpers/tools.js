const getDateCheckpoint = require('@lastlongerproject/toolkit').getDateCheckpoint;

const User = require('../models/DB/userDB');
const Trade = require('../models/DB/tradeDB');
const UserOrder = require('../models/DB/userOrderDB');
const Container = require('../models/DB/containerDB');

const DataCacheFactory = require("../models/dataCacheFactory.js");
const userUsingAmount = require('../models/variables/containerStatistic').line_user_using;
const RentalQualification = require("../models/enums/userEnum").RentalQualification;
const HoldingQuantityLimitation = require("../models/enums/userEnum").HoldingQuantityLimitation;

const tradeCallback = require("../controllers/tradeCallback");

exports.getDeliverContent = function (containerList) {
    let container = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_WITH_DEACTIVE);
    let deliverContent = {};
    containerList.forEach(element => {
        if (!deliverContent[container[element]]) deliverContent[container[element]] = {
            amount: 0
        };
        deliverContent[container[element]]['amount']++;
    });

    return Object.keys(deliverContent).map(containerType => {
        return {
            containerType,
            amount: deliverContent[containerType]['amount']
        }
    });
};

exports.generateUUID = function () {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

exports.computeDaysOfUsing = function (dateToCompute, now) {
    return Math.ceil((now - getDateCheckpoint(dateToCompute)) / (1000 * 60 * 60 * 24));
};

exports.userIsAvailableForRentContainer = function (dbUser, amountOrdered, byPassCheck, cb) {
    if (byPassCheck)
        return cb(null, true);
    userUsingAmount(dbUser, (err, usingAmount) => {
        if (err) return cb(err);
        if (dbUser.hasBanned)
            return cb(null, false, {
                rentalQualification: RentalQualification.BANNED
            });
        const holdingQuantityLimitation = dbUser.hasPurchase ? HoldingQuantityLimitation.PURCHASED_USER : HoldingQuantityLimitation.FREE_USER;
        if (amountOrdered === null) {
            const availableAmount = holdingQuantityLimitation - usingAmount;
            if (holdingQuantityLimitation !== -1 && availableAmount <= 0)
                return cb(null, false, {
                    rentalQualification: RentalQualification.OUT_OF_QUOTA,
                    data: {
                        usingAmount,
                        availableAmount,
                        holdingQuantityLimitation
                    }
                });
            else
                return cb(null, true, {
                    rentalQualification: RentalQualification.AVAILABLE,
                    data: {
                        usingAmount,
                        availableAmount: availableAmount <= 0 ? null : availableAmount,
                        holdingQuantityLimitation
                    }
                });
        }
        const forecastedHoldingQuantity = amountOrdered + usingAmount;
        const quatityOverLimitaion = holdingQuantityLimitation - forecastedHoldingQuantity;
        if (holdingQuantityLimitation !== -1 && quatityOverLimitaion < 0)
            return cb(null, false, {
                rentalQualification: RentalQualification.OUT_OF_QUOTA,
                data: {
                    usingAmount,
                    amountOrdered,
                    quatityOverLimitaion,
                    holdingQuantityLimitation
                }
            });
        return cb(null, true, {
            rentalQualification: RentalQualification.AVAILABLE,
            data: {
                usingAmount,
                amountOrdered,
                quatityOverLimitaion,
                holdingQuantityLimitation
            }
        });
    });
};

exports.solveUnusualUserOrder = function (cb) {
    UserOrder.find({
        "archived": false,
        "containerID": {
            "$ne": null
        }
    }, (err, userOrderList) => {
        if (err) return cb(err);

        Promise
            .all(
                userOrderList.map(aUserOrder => new Promise((resolve, reject) => {
                    User.findById(aUserOrder.user, (err, oriUser) => {
                        if (err) return reject(err);
                        if (!oriUser) return resolve({
                            success: false,
                            orderID: aUserOrder.orderID,
                            msg: `[FixUserOrder] Can't find oriUser, OrderID: ${aUserOrder.orderID}`
                        });

                        Trade.findOne({
                            "container.id": aUserOrder.containerID,
                            "oriUser.phone": oriUser.user.phone,
                            "tradeType.action": "Return"
                        }, {}, {
                            sort: {
                                tradeTime: -1
                            }
                        }, function (err, theTrade) {
                            if (err) return reject(err);
                            if (!theTrade) return resolve({
                                success: true,
                                orderID: null,
                                msg: `[FixUserOrder] Normal User Order, OrderID: ${aUserOrder.orderID}`
                            });

                            User.findOne({
                                "user.phone": theTrade.newUser.phone
                            }, (err, newUser) => {
                                if (err) return reject(err);
                                if (!newUser) return resolve({
                                    success: false,
                                    orderID: aUserOrder.orderID,
                                    msg: `[FixUserOrder] Can't find newUser, OrderID: ${aUserOrder.orderID}`
                                });

                                Container.findOne({
                                    "ID": theTrade.container.id
                                }, (err, theContainer) => {
                                    if (err) return reject(err);
                                    if (!theContainer) return resolve({
                                        success: false,
                                        orderID: aUserOrder.orderID,
                                        msg: `[FixUserOrder] Can't find theContainer, OrderID: ${aUserOrder.orderID}`
                                    });

                                    const tradeDetail = {
                                        oriUser,
                                        newUser,
                                        container: theContainer
                                    };
                                    tradeCallback.return([tradeDetail], {
                                        storeID: theTrade.newUser.storeID
                                    });
                                    resolve({
                                        success: true,
                                        orderID: aUserOrder.orderID,
                                        msg: `[FixUserOrder] Try to fix UserOrder, OrderID: ${aUserOrder.orderID}`
                                    });
                                });
                            });
                        });
                    });
                })))
            .then(results => {
                const successUserOrder = [];
                const failUserOrder = [];
                const successMsg = [];
                const failMsg = [];
                results.forEach(aResult => {
                    if (aResult.success && aResult.orderID !== null) {
                        successUserOrder.push(aResult.orderID);
                        successMsg.push(aResult.msg);
                    } else if (!aResult.success) {
                        failUserOrder.push(aResult.orderID);
                        failMsg.push(aResult.msg);
                    }
                });
                cb(null, {
                    successUserOrder,
                    successMsg,
                    failUserOrder,
                    failMsg
                });
            })
            .catch(cb)
    });
}