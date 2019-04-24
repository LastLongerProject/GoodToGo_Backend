const User = require('../models/DB/userDB');
const UserKeys = require('../models/DB/userKeysDB');

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
        if (!bot) {
            bot = new User({
                user: {
                    phone: "0900000000",
                    password: null,
                    name: "SchedulerBot"
                },
                roles: {
                    typeList: ["bot"]
                }
            });
            bot.save(err => {
                if (err) debug.error(err);
            });
        }
        const shouldWait = dateCheckpoint(1) - Date.now();
        setTimeout(function timeSensitiveTask() {
            setInterval(function tasks() {
                debug.log('[Scheduler | Time-Sensitive] start');
                appInit.checkCouponIsExpired(cb);
                appInit.checkUsersShouldBeBanned(false, cb);
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