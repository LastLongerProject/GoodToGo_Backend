const debug = require('../helpers/debugger')('tradeCallback');

const UserOrder = require('../models/DB/userOrderDB');
const DataCacheFactory = require('../models/dataCacheFactory');

const userTrade = require('../controllers/userTrade');
const pointTrade = require('../controllers/pointTrade');

const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../models/enums/notificationEnum').CenterEvent;
const generateUUID = require('../helpers/tools').generateUUID;

module.exports = {
    rent: function (tradeDetail, storeID) {
        if (tradeDetailIsEmpty(tradeDetail)) return;
        integrateTradeDetailForNotification(tradeDetail,
                aTradeDetail => aTradeDetail.newUser,
                aTradeDetail => aTradeDetail.container)
            .forEach(aCustomerTradeDetail => {
                NotificationCenter.emit(NotificationEvent.CONTAINER_RENT, aCustomerTradeDetail.customer, {
                    containerList: aCustomerTradeDetail.containerList
                }, {
                    ignoreSilentMode: true
                });
                if (storeID === null) return;
                const now = Date.now();
                aCustomerTradeDetail.containerList.forEach(aContainer => {
                    let newOrder = new UserOrder({
                        orderID: generateUUID(),
                        user: aCustomerTradeDetail.customer._id,
                        storeID,
                        orderTime: now,
                        containerID: aContainer.ID
                    });
                    newOrder.save((err) => {
                        if (err) return debug.error(err);
                    });
                });
            });
    },
    return: function (tradeDetail, options = {}) {
        if (tradeDetailIsEmpty(tradeDetail)) return;
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
                NotificationCenter.emit(NotificationEvent.CONTAINER_RETURN, dbCustomer, {
                    containerList: containerList
                });

                UserOrder.find({
                    "user": dbCustomer._id,
                    "containerID": {
                        "$in": containerList.map(aContainer => aContainer.ID)
                    },
                    "archived": false
                }, (err, userOrders) => {
                    if (err) return debug.error(err);
                    if (userOrders.length === 0) return;
                    userOrders.forEach(aUserOrder => {
                        aUserOrder.archived = true;
                        aUserOrder.save(err => {
                            if (err) return debug.error(err);
                        });
                    });

                    const storeDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
                    const quantity = containerList.length;
                    const isOverdueReturn = dbCustomer.hasBanned;
                    const isPurchasedUser = dbCustomer.hasPurchase;

                    pointTrade.calculatePoint(dbCustomer, userOrders, (err, pointDetail) => {
                        if (err) return debug.error(err);
                        const point = pointDetail.point;
                        const bonusPointActivity = pointDetail.bonusPointActivity;
                        const overdueReturn = pointDetail.overdueReturn;

                        userTrade.refreshUserUsingStatus(dbCustomer, {
                            sendNotice: false,
                            banOrUnbanUser: true
                        }, (err, userDict) => {
                            if (err) return debug.error(err);
                            const overdueAmount = userDict[dbCustomer._id].summary.overdueAmount;
                            const isBannedAfterReturn = dbCustomer.hasBanned;
                            NotificationCenter.emit(NotificationEvent.CONTAINER_RETURN_LINE, dbCustomer, {
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
                                    bonusPointActivity: bonusPointActivity === null ? null : bonusPointActivity.name,
                                    overdueAmount,
                                    bannedTimes: dbCustomer.bannedTimes,
                                    overdueReturnInThisTrade: overdueReturn,
                                    purchaseStatus: dbCustomer.getPurchaseStatus(),
                                }
                            }, options);
                        });

                        pointTrade.sendPoint(point, dbCustomer, {
                            title: `歸還了${quantity}個容器` + `${overdueReturn > 0? `其中${overdueReturn}個已逾期`:``}`,
                            body: `${containerList.map(aContainerModel=>`#${aContainerModel.ID}`).join(", ")}` +
                                ` @ ${storeDict[toStore].name}${bonusPointActivity === null? "": `-${bonusPointActivity.txt}`}`
                        });
                    });
                });
            });
    }
};

function tradeDetailIsEmpty(tradeDetail) {
    return !(Array.isArray(tradeDetail) && tradeDetail.length > 0);
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