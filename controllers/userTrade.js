const debug = require('../helpers/debugger')('userTrade');

const couponTrade = require('./couponTrade');

const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../helpers/notifications/enums/events');

const User = require('../models/DB/userDB');
const UserOrder = require('../models/DB/userOrderDB');
const UserTradeLog = require("../models/DB/userTradeLogDB");

const UserRole = require('../models/enums/userEnum').UserRole;
const TradeAction = require("../models/enums/userEnum").TradeAction;
const RegisterMethod = require('../models/enums/userEnum').RegisterMethod;

const DueStatus = require('../models/enums/userEnum').DueStatus;
const getDueStatus = require('../models/computed/dueStatus').dueStatus;
const UserOrderCatalog = require('../models/variable/userOrderCatalog');

const ID = require('../models/enums/analyzedOrderEnum').ID;
const ReduceBy = require('../models/enums/analyzedOrderEnum').ReduceBy;

const thisModule = module.exports = {
    refreshUserUsingStatus: function (specificUser, toggle, cb) {
        const sendNotice = toggle.sendNotice || false;
        const banOrUnbanUser = toggle.banOrUnbanUser || false;
        if (!(specificUser instanceof User)) specificUser = null;
        findUsersToCheckStatus(specificUser, (userDict, userObjectIDList) => {
            analyzeUserOrder(userDict, userObjectIDList, (dbUser, analyzedUserOrder, summary) => {
                if (banOrUnbanUser) {
                    if (summary.hasOverdueContainer) {
                        const overdueList = analyzedUserOrder[ID.isRegistered][DueStatus.OVERDUE].concat(analyzedUserOrder[ID.notRegistered][DueStatus.OVERDUE]);
                        thisModule.banUser(dbUser, overdueList);
                    } else if (dbUser.bannedTimes <= 1) {
                        thisModule.unbanUser(dbUser, true);
                    }
                }
                if (sendNotice) {
                    let event = null;
                    if (summary.hasLastCallContainer) {
                        event = NotificationEvent.USER_LAST_CALL;
                    } else if (summary.hasAlmostOverdueContainer) {
                        event = NotificationEvent.USER_ALMOST_OVERDUE;
                    }
                    if (event !== null)
                        thisModule.noticeUser(dbUser, event, {
                            almostOverdueAmount: summary.almostOverdueAmount,
                            lastCallAmount: summary.lastCallAmount
                        });
                }
                NotificationCenter.emit(NotificationEvent.USER_STATUS_UPDATE, dbUser, {
                    userIsBanned: dbUser.hasBanned,
                    hasOverdueContainer: summary.hasOverdueContainer,
                    hasUnregisteredOrder: summary.hasUnregisteredOrder,
                    hasAlmostOverdueContainer: summary.hasAlmostOverdueContainer
                });
            }, (err, userDict) => {
                if (err) return cb(err);
                cb(null, userDict);
            });
        });
    },
    banUser: function (dbUser, overdueList, byUser) {
        if (!dbUser.hasBanned) {
            dbUser.hasBanned = true;
            dbUser.bannedTimes++;
            dbUser.save(err => {
                if (err) return debug.error(err);
                UserTradeLog.create({
                    "user": dbUser.user.phone,
                    "action": TradeAction.BANNED,
                    "describe": (overdueList !== null) ?
                        `Relevant Orders: [${overdueList.map(aOrder => `{Order: ${aOrder.orderID}, Container: ${aOrder.containerID}}`).join(", ")}]` : `Manual, By: ${byUser}`
                }, err => {
                    if (err) return debug.error(err);
                });
            });
            NotificationCenter.emit(NotificationEvent.USER_BANNED, dbUser, {
                bannedTimes: dbUser.bannedTimes,
                overdueAmount: overdueList === null ? -1 : overdueList.length
            });
        }
    },
    unbanUser: function (dbUser, isAutoProcess, byUser) {
        if (dbUser.hasBanned) {
            dbUser.hasBanned = false;
            dbUser.save(err => {
                if (err) return debug.error(err);
                UserTradeLog.create({
                    "user": dbUser.user.phone,
                    "action": TradeAction.UNBANNED,
                    "describe": isAutoProcess ? "By automatic process" : `Manual, By: ${byUser}`
                }, err => {
                    if (err) return debug.error(err);
                });
            });
            NotificationCenter.emit(NotificationEvent.USER_UNBANNED, dbUser, {
                bannedTimes: dbUser.bannedTimes,
                purchaseStatus: dbUser.getPurchaseStatus()
            });
        }
    },
    noticeUser: function (dbUser, event, summary) {
        if (!dbUser.hasBanned) {
            const data = {
                bannedTimes: dbUser.bannedTimes
            };
            Object.assign(data, {
                summary
            });
            NotificationCenter.emit(event, dbUser, data);
        }
    },
    purchase: function (aUser, cb) {
        User.findOne({
            "user.phone": aUser.phone
        }, (err, theUser) => {
            if (err) return cb(err);
            if (!theUser) {
                let newUser = new User({
                    user: {
                        phone: aUser.phone,
                        password: null,
                        name: aUser.name
                    },
                    hasPurchase: true,
                    registerMethod: RegisterMethod.PURCHASE,
                    roles: {
                        typeList: [UserRole.CUSTOMER]
                    }
                });
                newUser.save(err => {
                    if (err) return cb(err);
                    cb(null, newUser);
                    userPurchased(newUser);
                });
            } else {
                if (theUser.hasPurchase) return cb(null, null);
                theUser.hasPurchase = true;
                theUser.save(err => {
                    if (err) return cb(err);
                    cb(null, theUser);
                    userPurchased(theUser);
                    NotificationCenter.emit(NotificationEvent.USER_PURCHASED, theUser);
                });
            }
        });
    },
    fixPoint: function (dbUser, newPoint) {
        const oriPoint = dbUser.point;
        dbUser.point = newPoint;
        dbUser.save(err => {
            if (err) return debug.error(err);
            UserTradeLog.create({
                "user": dbUser.user.phone,
                "action": TradeAction.FIX_POINT,
                "describe": `OriPoint: ${oriPoint}, NewPoint: ${newPoint}`
            }, err => {
                if (err) return debug.error(err);
            });
        });
    }
};

function userPurchased(theUser) {
    UserTradeLog.create({
        "user": theUser.user.phone,
        "action": TradeAction.PURCHASED,
        "describe": null
    }, err => {
        if (err) return debug.error(err);
    });
    couponTrade.welcomeCoupon(theUser, err => {
        if (err) return debug.error(err);
    });
}

function findUsersToCheckStatus(specificUser, cb) {
    if (specificUser) {
        const userID = specificUser._id;
        const userDict = {
            [userID]: new UserOrderCatalog(specificUser)
        };
        const userObjectIDList = [userID];
        return cb(userDict, userObjectIDList);
    } else {
        User.find({
            "agreeTerms": true
        }, (err, userList) => {
            if (err) return debug.error(err);
            const userDict = {};
            const userObjectIDList = userList.map(aUser => {
                const userID = aUser._id;
                userDict[userID] = new UserOrderCatalog(aUser);
                return userID;
            });
            return cb(userDict, userObjectIDList);
        })
    }
}

function analyzeUserOrder(userDict, userObjectIDList, taskPerUser, cb) {
    UserOrder.find({
        "user": {
            "$in": userObjectIDList
        },
        "archived": false
    }, (err, userOrderList) => {
        if (err) return cb(err);

        const now = Date.now();
        userOrderList.forEach(aUserOrder => {
            const userID = aUserOrder.user;
            const analyzedUserOrder = userDict[userID].analyzedUserOrder;
            const dueStatus = getDueStatus(aUserOrder.orderTime, userDict[userID].dbUser.getPurchaseStatus(), now);
            const isIdRegistered = aUserOrder.containerID !== null ? ID.isRegistered : ID.notRegistered;
            analyzedUserOrder[isIdRegistered][dueStatus].push(aUserOrder);
        });

        for (let userID in userDict) {
            const analyzedUserOrder = userDict[userID].analyzedUserOrder;
            const dbUser = userDict[userID].dbUser;

            const unregisteredAmount = analyzedDataCounter(analyzedUserOrder, ReduceBy.idRegistered, ID.notRegistered);
            const hasUnregisteredOrder = unregisteredAmount > 0;
            const overdueAmount = analyzedDataCounter(analyzedUserOrder, ReduceBy.dueStatus, DueStatus.OVERDUE);
            const hasOverdueContainer = overdueAmount > 0;
            const almostOverdueAmount = analyzedDataCounter(analyzedUserOrder, ReduceBy.dueStatus, DueStatus.ALMOST_OVERDUE);
            const hasAlmostOverdueContainer = almostOverdueAmount > 0;
            const lastCallAmount = analyzedDataCounter(analyzedUserOrder, ReduceBy.dueStatus, DueStatus.LAST_CALL);
            const hasLastCallContainer = lastCallAmount > 0;

            const summary = {
                unregisteredAmount,
                hasUnregisteredOrder,
                almostOverdueAmount,
                hasAlmostOverdueContainer,
                lastCallAmount,
                hasLastCallContainer,
                overdueAmount,
                hasOverdueContainer
            };

            Object.assign(userDict[userID], {
                summary
            });
            taskPerUser(dbUser, analyzedUserOrder, summary);
        }
        cb(null, userDict);
    });
}

function analyzedDataCounter(analyzedData, reduceBy, dataToReduce) {
    if (reduceBy === ReduceBy.idRegistered) {
        return Object.values(analyzedData[dataToReduce]).reduce((accumulator, aList) => accumulator + aList.length, 0);
    } else if (reduceBy === ReduceBy.dueStatus) {
        let result = 0;
        const keyList = Object.keys(analyzedData);
        keyList.forEach(aKey => {
            result += analyzedData[aKey][dataToReduce].length;
        });
        return result;
    } else {
        return 0;
    }
}