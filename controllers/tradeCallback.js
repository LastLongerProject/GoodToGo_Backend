const debug = require('../helpers/debugger')('tradeCallback');

const UserOrder = require('../models/DB/userOrderDB');
const DataCacheFactory = require('../models/dataCacheFactory');

const pointTrade = require('../controllers/pointTrade');

const checkUserShouldUnban = require('../helpers/appInit').checkUsersShouldBeBanned;
const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../helpers/notifications/enums/events');

module.exports = {
    rent: function (tradeDetail) {
        if (tradeDetailIsEmpty(tradeDetail)) return;
        integrateTradeDetailForNotification(tradeDetail,
                aTradeDetail => aTradeDetail.newUser,
                aTradeDetail => aTradeDetail.container)
            .forEach(aCustomerTradeDetail => {
                NotificationCenter.emit(NotificationEvent.CONTAINER_RENT, {
                    customer: aCustomerTradeDetail.customer
                }, {
                    containerList: aCustomerTradeDetail.containerList
                });
            });
    },
    return: function (tradeDetail, options) {
        if (tradeDetailIsEmpty(tradeDetail)) return;
        if (!options) options = {};
        tradeDetail.forEach((aTradeDetail) => {
            UserOrder.updateMany({
                "containerID": aTradeDetail.container.ID,
                "archived": false
            }, {
                "archived": true
            }, (err) => {
                if (err) return debug.error(err);
            });
        });
        const toStore = typeof options.storeID === "undefined" ?
            tradeDetail[0].newUser.roles.clerk.storeID :
            options.storeID;
        integrateTradeDetail(tradeDetail,
                aTradeDetail => aTradeDetail.oriUser.user.phone, {
                    customer: {
                        type: "unique",
                        extractor: aTradeDetail => aTradeDetail.oriUser
                    },
                    containerList: {
                        type: "array",
                        extractor: aTradeDetail => aTradeDetail.container
                    }
                })
            .forEach(aTradeDetail => {
                const dbCustomer = aTradeDetail.customer;
                const containerList = aTradeDetail.containerList;
                NotificationCenter.emit(NotificationEvent.CONTAINER_RETURN, {
                    customer: dbCustomer
                }, {
                    containerList: containerList
                });

                if (!dbCustomer.agreeTerms) return null;
                const storeDict = DataCacheFactory.get("store");
                const quantity = containerList.length;
                const isOverdueReturn = dbCustomer.hasBanned;
                const isPurchasedUser = dbCustomer.hasPurchase;
                pointTrade.getAndSendPoint(dbCustomer, quantity, (err, point, bonusPointActivity) => {
                    if (err) debug.error(err);
                    checkUserShouldUnban(false, dbCustomer, (err, userDict) => {
                        if (err) debug.error(err);
                        const overdueAmount = userDict[dbCustomer._id].overdue.length;
                        const isBannedAfterReturn = dbCustomer.hasBanned;
                        NotificationCenter.emit(NotificationEvent.CONTAINER_RETURN_LINE, {
                            customer: dbCustomer
                        }, {
                            conditions: {
                                isPurchasedUser,
                                isOverdueReturn,
                                isBannedAfterReturn,
                                isStillHaveOverdueContainer: overdueAmount > 0,
                                isFirstTimeBanned: dbCustomer.bannedTimes <= 1
                            },
                            data: {
                                amount: quantity,
                                point,
                                bonusPointActivity,
                                overdueAmount,
                                bannedTimes: dbCustomer.bannedTimes
                            }
                        });
                    });
                    if (isPurchasedUser)
                        pointTrade.sendPoint(point, dbCustomer, {
                            title: `歸還了${quantity}個容器`,
                            body: `${storeDict[toStore].name}${bonusPointActivity === null? "": `-${bonusPointActivity}`}`
                        });
                });
            });
    }
};

function tradeDetailIsEmpty(tradeDetail) {
    return !(tradeDetail && tradeDetail.length > 0);
}

function integrateTradeDetail(oriTradeDetail, keyGenerator, dataExtractor) {
    let seen = {};
    oriTradeDetail.forEach(ele => {
        let thisKey = keyGenerator(ele);
        if (!seen.hasOwnProperty(thisKey)) {
            seen[thisKey] = {};
            for (let dataKey in dataExtractor) {
                if (dataExtractor[dataKey].type === "array")
                    seen[thisKey][dataKey] = [];
            }
        }
        for (let dataKey in dataExtractor) {
            if (dataExtractor[dataKey].type === "unique") {
                seen[thisKey][dataKey] = dataExtractor[dataKey].extractor(ele);
            } else if (dataExtractor[dataKey].type === "array") {
                let thisData = dataExtractor[dataKey].extractor(ele);
                seen[thisKey][dataKey].push(thisData);
            }
        }
    });
    return Object.values(seen);
}

function integrateTradeDetailForNotification(oriTradeDetail, keyGenerator, dataExtractor) {
    let seen = {};
    oriTradeDetail.forEach(ele => {
        let thisKey = keyGenerator(ele);
        let thisData = dataExtractor(ele);
        if (seen.hasOwnProperty(thisKey)) seen[thisKey].containerList.push(thisData);
        else seen[thisKey] = {
            customer: thisKey,
            containerList: [thisData]
        };
    });
    return Object.values(seen);
}