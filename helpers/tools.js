const DataCacheFactory = require("../models/dataCacheFactory.js");
const userUsingAmount = require('../models/computed/containerStatistic').line_user_using;
const debug = require('../helpers/debugger')('tools');

const User = require("../models/DB/userDB");
const RoleType = require("../models/enums/userEnum").RoleType;
const RentalQualification = require("../models/enums/userEnum").RentalQualification;
const HoldingQuantityLimitation = require("../models/enums/userEnum").HoldingQuantityLimitation;
const hash = require('object-hash');

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

exports.getContainerHash = function (containerList, isOverview = false) {
    let hashValue
    let set

    if(!isOverview) {
        const containerDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_WITH_DEACTIVE)
        set = new Set(containerList.map(container => containerDict[container]))
    } else {
        set = new Set(containerList.map(content => content.containerType))
    }

    hashValue = hash(set, {
        unorderedSets: true
    })

    return String(set.size) + hashValue
}

exports.generateUUID = function () {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

function getStoreListInArea(stationID) {
    const stationDict = DataCacheFactory.get(DataCacheFactory.keys.STATION);
    return stationDict[stationID].storeList;
}

exports.getStoreListInArea = getStoreListInArea;

exports.checkStoreIsInArea = function (storeID, stationID) {
    return getStoreListInArea(stationID).indexOf(storeID) !== -1;
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

exports.getSystemBot = function (done) {
    User.findOne({
        "user.phone": "0900000000"
    }, (err, dbBot) => {
        if (err) return done(err);
        if (!dbBot) {
            dbBot = new User({
                user: {
                    phone: "0900000000",
                    password: null,
                    name: "GoodToGoBot"
                }
            });
            dbBot.addRole(RoleType.BOT, {}, err => {
                if (err) return debug.error(err);
                dbBot.save(err => {
                    if (err) return debug.error(err);
                });
            });
        }
        done(null, dbBot);
    });
}