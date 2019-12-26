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

function driveCb(succeed, data) {
    if (succeed) {
        debug.log(data.type + ' succeed');
    } else {
        debug.error(data.type + ' fail: ', data.data);
    }
}

module.exports = function () {
    getSystemBot((err, dbBot) => {
        if (err) return debug.error(err);

        const shouldWait = dateCheckpoint(1) - Date.now();
        debug.log(`[Scheduler | Setting] First task will start in ${shouldWait / 1000} seconds`);

        setTimeout(function timeSensitiveTask() {
            let taskList = function taskList() {
                debug.log('[Scheduler | Time-Sensitive] start');
                tasks.checkCouponIsExpired(generalCb);
                tasks.refreshAllUserUsingStatus(false, generalCb);
            };
            taskList();
            setInterval(taskList, 1000 * 60 * 60 * 24);
        }, shouldWait);

        setTimeout(function noneTimeSensitiveTask() {
            let taskList = function () {
                debug.log('[Scheduler | None-Time-Sensitive] start');
                setTimeout(tasks.refreshContainer, 0, dbBot, generalCb);
                setTimeout(tasks.refreshStore, 1000 * 60 * 5, generalCb);
                setTimeout(tasks.refreshActivity, 1000 * 60 * 7, generalCb);
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
                            "$ne": /^PostmanRuntime\/.*$/
                        },
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
                setTimeout(tasks.checkUserPoint, 1000 * 60 * 35, generalCb);
            };
            taskList();
            setInterval(taskList, 1000 * 60 * 60 * 24);
        }, shouldWait + 1000 * 60 * 60);

        setTimeout(function taskToDoAtTenInTheMorning() {
            let taskList = function taskList() {
                debug.log('[Scheduler | Ten In The Morning] start');
                tasks.refreshAllUserUsingStatus(true, generalCb);
            };
            taskList();
            setInterval(taskList, 1000 * 60 * 60 * 24);
        }, shouldWait + 1000 * 60 * 60 * 10);
    });
};