const debug = require('../helpers/debugger')('userTrade');

const couponTrade = require('./couponTrade');

const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../helpers/notifications/enums/events');

const User = require('../models/DB/userDB');
const UserOrder = require('../models/DB/userOrderDB');
const UserTradeLog = require("../models/DB/userTradeLogDB");

const UserRole = require('../models/enums/userEnum').UserRole;
const DueStatus = require('../models/enums/userEnum').DueStatus;
const TradeAction = require("../models/enums/userEnum").TradeAction;
const RegisterMethod = require('../models/enums/userEnum').RegisterMethod;

const getDueStatus = require('../models/computed/dueStatus').dueStatus;
const UserOrderCatalog = require('../models/variable/userOrderCatalog');

const thisModule = module.exports = {
    refreshUserUsingStatus: function (sendNotice, specificUser, cb) {
        if (!(specificUser instanceof User)) specificUser = null;
        findUsersToCheckStatus(specificUser, reply => {
            const userDict = reply.userDict;
            const userObjectIDList = reply.userObjectIDList;
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
                    const theUserOrderCatalog = userDict[userID];
                    const dueStatus = getDueStatus(aUserOrder.orderTime, theUserOrderCatalog.dbUser.getPurchaseStatus(), now);
                    const isIdRegistered = aUserOrder.containerID === null ? "idNotRegistered" : "idRegistered";
                    switch (dueStatus) {
                        case DueStatus.NOT_DUE:
                            theUserOrderCatalog[isIdRegistered].others.push(aUserOrder);
                            break;
                        case DueStatus.ALMOST_OVERDUE:
                            theUserOrderCatalog[isIdRegistered].almostOverdue.push(aUserOrder);
                            break;
                        case DueStatus.LAST_CALL:
                            theUserOrderCatalog[isIdRegistered].lastCall.push(aUserOrder);
                            break;
                        case DueStatus.OVERDUE:
                            theUserOrderCatalog[isIdRegistered].overdue.push(aUserOrder);
                            break;
                        default:
                            debug.error("Can't identfy due status: ", dueStatus);
                    }
                });

                for (let userID in userDict) {
                    const theUserOrderCatalog = userDict[userID];
                    const dbUser = theUserOrderCatalog.dbUser;

                    const hasUnregisteredOrder = theUserOrderCatalog.idNotRegistered.overdue.length > 0 ||
                        theUserOrderCatalog.idNotRegistered.almostOverdue.length > 0 ||
                        theUserOrderCatalog.idNotRegistered.lastCall.length > 0 ||
                        theUserOrderCatalog.idNotRegistered.others.length > 0;
                    const overdueAmount = theUserOrderCatalog.idRegistered.overdue.length +
                        theUserOrderCatalog.idNotRegistered.overdue.length;
                    const hasOverdueContainer = overdueAmount > 0;
                    const almostOverdueAmount = theUserOrderCatalog.idRegistered.almostOverdue.length +
                        theUserOrderCatalog.idNotRegistered.almostOverdue.length;
                    const hasAlmostOverdueContainer = almostOverdueAmount > 0;
                    const lastCallAmount = theUserOrderCatalog.idNotRegistered.lastCall.length +
                        theUserOrderCatalog.idRegistered.lastCall.length;

                    if (hasOverdueContainer) {
                        thisModule.banUser(dbUser, theUserOrderCatalog.idRegistered.overdue.concat(theUserOrderCatalog.idNotRegistered.overdue));
                    } else {
                        if (hasAlmostOverdueContainer && sendNotice) {
                            thisModule.noticeUserWhoIsGoingToBeBanned(dbUser, almostOverdueAmount);
                        }
                        if (dbUser.bannedTimes <= 1) {
                            thisModule.unbanUser(dbUser, false);
                        }
                    }

                    theUserOrderCatalog.overdueAmount = overdueAmount;
                    theUserOrderCatalog.lastCallAmount = lastCallAmount;
                    theUserOrderCatalog.almostOverdueAmount = almostOverdueAmount;

                    NotificationCenter.emit(NotificationEvent.USER_STATUS_UPDATE, dbUser, {
                        userIsBanned: dbUser.hasBanned,
                        hasOverdueContainer,
                        hasUnregisteredOrder,
                        hasAlmostOverdueContainer
                    });
                }
                if (cb) return cb(null, userDict);
                debug.log('User Status is Refresh');
            });
        });
    },
    banUser: function (dbUser, overdueDetailList, byUser) {
        if (!dbUser.hasBanned) {
            dbUser.hasBanned = true;
            dbUser.bannedTimes++;
            dbUser.save(err => {
                if (err) return debug.error(err);
                if (overdueDetailList !== null)
                    UserTradeLog.create({
                        "user": dbUser.user.phone,
                        "action": TradeAction.BANNED,
                        "describe": `Relevant Orders: [` +
                            `${overdueDetailList.map(aOrder => `{Order: ${aOrder.orderID}, Container: ${aOrder.containerID}}`).join(", ")}` +
                            `]`
                    }, err => {
                        if (err) return debug.error(err);
                    });
                else
                    UserTradeLog.create({
                        "user": dbUser.user.phone,
                        "action": TradeAction.BANNED,
                        "describe": `Manual, By: ${byUser}`
                    }, err => {
                        if (err) return debug.error(err);
                    });
            });
            NotificationCenter.emit(NotificationEvent.USER_BANNED, dbUser, {
                bannedTimes: dbUser.bannedTimes,
                overdueAmount: overdueDetailList === null ? -1 : overdueDetailList.length
            });
        }
    },
    unbanUser: function (dbUser, isTest, byUser) {
        if (dbUser.hasBanned) {
            dbUser.hasBanned = false;
            dbUser.save(err => {
                if (err) return debug.error(err);
                if (!isTest)
                    UserTradeLog.create({
                        "user": dbUser.user.phone,
                        "action": TradeAction.UNBANNED,
                        "describe": "By automatic process"
                    }, err => {
                        if (err) return debug.error(err);
                    });
                else
                    UserTradeLog.create({
                        "user": dbUser.user.phone,
                        "action": TradeAction.UNBANNED,
                        "describe": `Manual, By: ${byUser}`
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
    noticeUserWhoIsGoingToBeBanned: function (dbUser, almostOverdueAmount) {
        if (!dbUser.hasBanned) {
            NotificationCenter.emit(NotificationEvent.USER_ALMOST_OVERDUE, dbUser, {
                bannedTimes: dbUser.bannedTimes,
                almostOverdueAmount
            });
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
        return cb({
            userDict,
            userObjectIDList
        });
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
            return cb({
                userDict,
                userObjectIDList
            });
        })
    }
}