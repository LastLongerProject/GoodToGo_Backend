const User = require('../models/DB/userDB');
const UserKeys = require('../models/DB/userKeysDB');
const Coupon = require('../models/DB/couponDB');
const Container = require('../models/DB/containerDB');
const DataCacheFactory = require('../models/dataCacheFactory');

const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../helpers/notifications/enums/events');

const appInit = require('./appInit');
const dateCheckpoint = require('@lastlongerproject/toolkit').dateCheckpoint;

const fs = require('fs');
const ROOT_DIR = require('../config/config').rootDir;
const crypto = require('crypto');
const debug = require('./debugger')('scheduler');

function cb() {} //do nothing
function driveCb(succeed, data) {
    if (succeed) {
        debug.log(data.type + ' succeed');
    } else {
        debug.error(data.type + ' fail: ', data.data);
    }
}

module.exports = function () {
    User.findOne({
        'user.phone': '0900000000'
    }, (err, bot) => {
        if (err) return debug.error(err);
        if (!bot) return debug.error('missing bot acount');
        var dateNow = new Date();
        var shouldWait = dateCheckpoint(1) - dateNow;
        setTimeout(function timeSensitiveTask() {
            setInterval(function tasks() {
                debug.log('[Scheduler | Time-Sensitive] start');
                checkCouponIsExpired();
                checkUsersShouldBeBanned();
            }(), 1000 * 60 * 60 * 24);
        }, shouldWait);
        setTimeout(function noneTimeSensitiveTask() {
            setInterval(function tasks() {
                debug.log('[Scheduler | None-Time-Sensitive] start');
                setTimeout(appInit.refreshContainer, 0, bot, cb);
                setTimeout(appInit.refreshStore, 1000 * 60 * 5, cb);
                setTimeout(appInit.refreshActivity, 1000 * 60 * 7, cb);
                setTimeout(appInit.refreshContainerIcon, 1000 * 60 * 10, false, driveCb);
                setTimeout(appInit.refreshStoreImg, 1000 * 60 * 15, false, driveCb);
                setTimeout(function () {
                    UserKeys.remove({
                        'updatedAt': {
                            '$lt': dateCheckpoint(-14)
                        },
                        "roleType": {
                            "$ne": "bot"
                        }
                    }, (err) => {
                        if (err) return debug.error(err);
                        debug.log('remove expire login');
                    });
                }, 1000 * 60 * 20);
                setTimeout(function () {
                    fs.readFile(ROOT_DIR + "/config/secret_key.json", 'utf8', function (err, secret_key) {
                        if (err) return debug.error(err);
                        secret_key = JSON.parse(secret_key);
                        secret_key.text = crypto.randomBytes(48).toString('hex').substr(0, 10);
                        secret_key.lastUpdate = Date.now();
                        fs.writeFile(ROOT_DIR + "/config/secret_key.json", JSON.stringify(secret_key), 'utf8', function (err) {
                            if (err) return debug.error(err);
                            debug.log('update server secret key');
                        });
                    });
                }, 1000 * 60 * 25);
                return tasks;
            }(), 1000 * 60 * 60 * 24);
        }, shouldWait + 1000 * 60 * 60);
    });
};

const DueDays = {
    free_user: 1,
    purchased_user: 7
};

function checkCouponIsExpired() {
    const CouponTypeDict = DataCacheFactory.get("couponType");
    Coupon.find({
        "expired": false
    }, (err, couponList) => {
        if (err) return debug.error(err);
        const now = Date.now();
        couponList.forEach(aCoupon => {
            if (CouponTypeDict[aCoupon.couponType].expirationDate < now) {
                aCoupon.expired = true;
                aCoupon.save(err => {
                    if (err) return debug.error(err);
                });
            }
        });
    });
}

function checkUsersShouldBeBanned() {
    User.find({
        "agreeTerms": true
    }, (err, userList) => {
        if (err) return debug.error(err);
        const userDict = {};
        const userPhoneList = userList.map(aUser => {
            const userPhone = aUser.user.phone;
            userDict[userPhone] = {
                dbUser: aUser,
                almostOverdue: [],
                overdue: []
            };
            return userPhone;
        });
        Container.find({
            "conbineTo": {
                "$in": userPhoneList
            },
            "statusCode": 2
        }, (err, containerList) => {
            if (err) return debug.error(err);

            const now = Date.now();
            containerList.forEach(aContainer => {
                const userPhone = aContainer.conbineTo;
                const purchaseStatus = userDict[userPhone].dbUser.getPurchaseStatus();
                const daysToDue = computeDaysOfUsing(aContainer.lastUsedAt, now) - DueDays[purchaseStatus];
                if (daysToDue <= 0) {
                    userDict[userPhone].overdue.push(aContainer);
                } else if (daysToDue <= 1) {
                    userDict[userPhone].almostOverdue.push(aContainer);
                }
            });

            for (let userPhone in userDict) {
                const dbUser = userDict[userPhone].dbUser;
                if (userDict[userPhone].overdue.length > 0)
                    banUser(dbUser);
                else if (userDict[userPhone].almostOverdue.length > 0)
                    noticeUserWhoIsGoingToBeBanned(dbUser);
                else if (userDict[userPhone].overdue.length === 0 && dbUser.hasBanned && dbUser.bannedTimes === 1)
                    unbanUser(dbUser);
            }
        });
    });
}

function banUser(dbUser) {
    dbUser.hasBanned = true;
    dbUser.save(err => {
        if (err) return debug.error(err);
    });
    NotificationCenter.emit(NotificationEvent.USER_BANNED, dbUser, null);
}

function noticeUserWhoIsGoingToBeBanned(dbUser) {
    NotificationCenter.emit(NotificationEvent.USER_ALMOST_OVERDUE, dbUser, null);
}

function unbanUser(dbUser) {
    dbUser.hasBanned = false;
    dbUser.save(err => {
        if (err) return debug.error(err);
    });
    NotificationCenter.emit(NotificationEvent.USER_UNBANNED, dbUser, null);
}

function computeDaysOfUsing(dateToCompute, now) {

}