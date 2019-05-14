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
    banUser: function (dbUser, overdueDetailList, sendNotice) {
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
            });
            if (sendNotice)
                NotificationCenter.emit(NotificationEvent.USER_BANNED, dbUser, {
                    bannedTimes: dbUser.bannedTimes,
                    overdueAmount: overdueDetailList === null ? -1 : overdueDetailList.length
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
    unbanUser: function (dbUser, isTest) {
        if (dbUser.hasBanned) {
            dbUser.hasBanned = false;
            dbUser.save(err => {
                if (err) return debug.error(err);
                if (!isTest)
                    UserTradeLog.create({
                        "user": dbUser.user.phone,
                        "action": TradeAction.UNBANNED,
                        "describe": null
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
    purchase: function (aUser, cb) {
        User.findOneAndUpdate({
            "user.phone": aUser.phone
        }, {
            "hasPurchase": true,
            '$setOnInsert': {
                'user.password': null,
                "user.name": aUser.name,
                "registerMethod": RegisterMethod.PURCHASE,
                'roles.typeList': [UserRole.CUSTOMER]
            }
        }, {
            upsert: true,
            setDefaultsOnInsert: true,
            new: true
        }, (err, theUser) => {
            if (err) return cb(err);
            cb(null, theUser);
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
        });
    }
}