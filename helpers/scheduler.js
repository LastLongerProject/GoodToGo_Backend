const fs = require('fs');
const crypto = require('crypto');
const debug = require('./debugger')('scheduler');

const tasks = require('./tasks');
const UserKeys = require('../models/DB/userKeysDB');
const ROOT_DIR = require('../config/config').rootDir;
const getSystemBot = require('./tools').getSystemBot;
const dateCheckpoint = require('./toolkit').dateCheckpoint;

function generalCb(err) {
    if (err) return debug.error(err);
}

function logCb(err, msg) {
    if (err) return debug.error(err);
    if (msg) return debug.log(msg);
}

function driveCb(succeed, data) {
    if (succeed) {
        debug.log(data.type + ' succeed');
    } else {
        debug.error(data.type + ' fail: ', data.data);
    }
}

const MILLISECONDS_OF_AN_HOUR = 1000 * 60 * 60;
const MILLISECONDS_OF_A_DAY = MILLISECONDS_OF_AN_HOUR * 24;

function getShouldWait(scheduledHour) {
    const now = new Date();
    const MILLISECONDS_TO_NEXT_DAY = dateCheckpoint(1) - now;
    const hourNow = parseInt(now.toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        hour: "2-digit",
        hour12: false
    }).slice(0, 2));
    if (hourNow >= scheduledHour) {
        return MILLISECONDS_TO_NEXT_DAY + MILLISECONDS_OF_AN_HOUR * scheduledHour;
    } else {
        return MILLISECONDS_TO_NEXT_DAY - MILLISECONDS_OF_AN_HOUR * (24 - scheduledHour);
    }
}

module.exports = {
    production: function () {
        const shouldWait = {
            TWO_IN_THE_MORNING: getShouldWait(2)
        };
        debug.log(`[Scheduler | Setting] First task will start in ${Math.floor(Math.min(...Object.values(shouldWait)) / 1000)} seconds`);

        setTimeout(function noneTimeSensitiveTask() {
            let taskList = function () {
                debug.log('[Scheduler | None-Time-Sensitive] start');
                setTimeout(tasks.containerListCaching, 0, generalCb);
                setTimeout(tasks.couponListCaching, 1000 * 60 * 3, generalCb);
                setTimeout(tasks.storeListCaching, 1000 * 60 * 5, generalCb);
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
                }, 1000 * 60 * 10);
            };
            taskList();
            setInterval(taskList, MILLISECONDS_OF_A_DAY);
        }, shouldWait.TWO_IN_THE_MORNING);
    },
    fullDailyJob: function () {
        getSystemBot((err, dbBot) => {
            if (err) return debug.error(err);

            const shouldWait = {
                MIDNIGHT: getShouldWait(0),
                ONE_IN_THE_MORNING: getShouldWait(1),
                TEN_IN_THE_MORNING: getShouldWait(10)
            };
            debug.log(`[Scheduler | Setting] First task will start in ${Math.floor(Math.min(...Object.values(shouldWait)) / 1000)} seconds`);

            setTimeout(function timeSensitiveTask() {
                let taskList = function taskList() {
                    debug.log('[Scheduler | Time-Sensitive] start');
                    tasks.checkCouponIsExpired(generalCb);
                    tasks.refreshAllUserUsingStatus(false, generalCb);
                };
                taskList();
                setInterval(taskList, MILLISECONDS_OF_A_DAY);
            }, shouldWait.MIDNIGHT);

            setTimeout(function noneTimeSensitiveTask() {
                let taskList = function () {
                    debug.log('[Scheduler | None-Time-Sensitive] start');
                    setTimeout(tasks.refreshContainer, 0, dbBot, generalCb);
                    setTimeout(tasks.refreshStore, 1000 * 60 * 3, generalCb);
                    setTimeout(tasks.refreshStation, 1000 * 60 * 5, generalCb);
                    setTimeout(tasks.refreshCoupon, 1000 * 60 * 8, generalCb);
                    setTimeout(tasks.refreshContainerIcon, 1000 * 60 * 10, false, driveCb);
                    setTimeout(tasks.refreshStoreImg, 1000 * 60 * 15, false, driveCb);
                    setTimeout(tasks.refreshCouponImage, 1000 * 60 * 17, false, driveCb);
                    setTimeout(function () {
                        UserKeys.remove({
                            'updatedAt': {
                                '$lt': dateCheckpoint(-14)
                            },
                            "roleType": {
                                "$ne": "bot"
                            },
                            "userAgent": {
                                "$not": /^PostmanRuntime\/\d*\.\d*\.\d*$/
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
                    setTimeout(tasks.solveUnusualUserOrder, 1000 * 60 * 30, (err, results) => {
                        if (err) return debug.error(err);
                        results.failMsg.forEach(debug.error);
                        results.successMsg.forEach(debug.log);
                    });
                    setTimeout(tasks.checkUserPoint, 1000 * 60 * 35, logCb);
                    setTimeout(tasks.migrateUserRoleStructure, 1000 * 60 * 40, logCb);
                    setTimeout(tasks.migrateBoxStructure, 1000 * 60 * 45, logCb);
                    setTimeout(tasks.uploadShopOverview, 1000 * 60 * 50, logCb);
                    setTimeout(tasks.updateSuperUserRole, 1000 * 60 * 55, logCb);
                };
                taskList();
                setInterval(taskList, MILLISECONDS_OF_A_DAY);
            }, shouldWait.ONE_IN_THE_MORNING);

            setTimeout(function taskToDoAtTenInTheMorning() {
                let taskList = function taskList() {
                    debug.log('[Scheduler | Ten In The Morning] start');
                    setTimeout(tasks.reloadSuspendedNotifications, 0, generalCb);
                    setTimeout(tasks.refreshAllUserUsingStatus, 1000 * 60 * 2, true, generalCb);
                };
                taskList();
                setInterval(taskList, MILLISECONDS_OF_A_DAY);
            }, shouldWait.TEN_IN_THE_MORNING);
        });
    }
};