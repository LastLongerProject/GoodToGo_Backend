const debug = require('../helpers/debugger')('userTrade');

const couponTrade = require('./couponTrade');

const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../helpers/notifications/enums/events');

const User = require('../models/DB/userDB');
const UserTradeLog = require("../models/DB/userTradeLogDB");
const TradeAction = require("../models/enums/userEnum").TradeAction;
const UserRole = require('../models/enums/userEnum').UserRole;
const RegisterMethod = require('../models/enums/userEnum').RegisterMethod;

module.exports = {
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
}

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