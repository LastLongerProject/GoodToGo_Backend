const debug = require('../helpers/debugger')('userTrade');

const couponTrade = require('./couponTrade');

const computeDaysOfUsing = require("../helpers/tools").computeDaysOfUsing;
const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../models/enums/notificationEnum').CenterEvent;

const User = require('../models/DB/userDB');
const UserOrder = require('../models/DB/userOrderDB');
const UserTradeLog = require("../models/DB/userTradeLogDB");

const DueDays = require('../models/enums/userEnum').DueDays;
const RoleType = require('../models/enums/userEnum').RoleType;
const TradeAction = require("../models/enums/userEnum").TradeAction;
const RegisterMethod = require('../models/enums/userEnum').RegisterMethod;

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
                    const purchaseStatus = userDict[userID].dbUser.getPurchaseStatus();
                    const daysOverDue = computeDaysOfUsing(aUserOrder.orderTime, now) - DueDays[purchaseStatus];
                    if (aUserOrder.containerID === null) {
                        if (daysOverDue > 0) {
                            userDict[userID].idNotRegistered.overdue.push(aUserOrder);
                        } else if (daysOverDue === 0) {
                            userDict[userID].idNotRegistered.almostOverdue.push(aUserOrder);
                        } else {
                            userDict[userID].idNotRegistered.others.push(aUserOrder);
                        }
                    } else {
                        if (daysOverDue > 0) {
                            userDict[userID].idRegistered.overdue.push(aUserOrder);
                        } else if (daysOverDue === 0) {
                            userDict[userID].idRegistered.almostOverdue.push(aUserOrder);
                        } else {
                            userDict[userID].idRegistered.others.push(aUserOrder);
                        }
                    }
                });

                for (let userID in userDict) {
                    const classifiedOrder = userDict[userID];
                    const dbUser = classifiedOrder.dbUser;
                    const overdueAmount = classifiedOrder.idRegistered.overdue.length + classifiedOrder.idNotRegistered.overdue.length;
                    const hasOverdueContainer = overdueAmount > 0;
                    const hasUnregisteredOrder = classifiedOrder.idNotRegistered.overdue.length > 0 ||
                        classifiedOrder.idNotRegistered.almostOverdue.length > 0 ||
                        classifiedOrder.idNotRegistered.others.length > 0;
                    const almostOverdueAmount = classifiedOrder.idRegistered.almostOverdue.length + classifiedOrder.idNotRegistered.almostOverdue.length;
                    const hasAlmostOverdueContainer = almostOverdueAmount > 0;
                    if (hasOverdueContainer) {
                        thisModule.banUser(dbUser, classifiedOrder.idRegistered.overdue.concat(classifiedOrder.idNotRegistered.overdue));
                    } else {
                        if (hasAlmostOverdueContainer && sendNotice) {
                            thisModule.noticeUserWhoIsGoingToBeBanned(dbUser, almostOverdueAmount);
                        }
                        if (dbUser.bannedTimes <= 3) {
                            thisModule.unbanUser(dbUser, false);
                        }
                    }
                    classifiedOrder.overdueAmount = overdueAmount;
                    classifiedOrder.almostOverdueAmount = almostOverdueAmount;
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
                        typeList: [RoleType.CUSTOMER]
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
            [userID]: {
                dbUser: specificUser,
                idRegistered: {
                    almostOverdue: [],
                    overdue: [],
                    others: []
                },
                idNotRegistered: {
                    almostOverdue: [],
                    overdue: [],
                    others: []
                }
            }
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
                userDict[userID] = {
                    dbUser: aUser,
                    idRegistered: {
                        almostOverdue: [],
                        overdue: [],
                        others: []
                    },
                    idNotRegistered: {
                        almostOverdue: [],
                        overdue: [],
                        others: []
                    }
                };
                return userID;
            });
            return cb({
                userDict,
                userObjectIDList
            });
        })
    }
}