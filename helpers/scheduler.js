const User = require('../models/DB/userDB');
const UserKeys = require('../models/DB/userKeysDB');
const appInit = require('./appInit');
const dateCheckpoint = require('@lastlongerproject/toolkit').dateCheckpoint;

const fs = require('fs');
const ROOT_DIR = require('../config/config').rootDir;
const crypto = require('crypto');
const debug = require('debug')('goodtogo_backend:scheduler');
debug.log = console.log.bind(console);
const debugError = require('debug')('goodtogo_backend:schedulerERR');

function cb() {} //do nothing
function driveCb(succeed, data) {
    if (succeed) {
        debug(data.type + ' succeed');
    } else {
        debug(data.type + ' fail: ', data.data);
    }
}

module.exports = function () {
    User.findOne({
        'user.phone': '0900000000'
    }, (err, bot) => {
        if (err) return debugError(err);
        if (!bot) return debugError('missing bot acount');
        var dateNow = new Date();
        var shouldWait = dateCheckpoint(1) - dateNow;
        setTimeout(function () {
            setInterval(function tasks() {
                debug('scheduler start');
                setTimeout(appInit.refreshContainer, 0, bot, cb);
                setTimeout(appInit.refreshStore, 1000 * 60 * 5, cb);
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
                        if (err) return debugError(err);
                        debug('remove expire login');
                    });
                }, 1000 * 60 * 20);
                setTimeout(function () {
                    fs.readFile(ROOT_DIR + "/config/secret_key.json", 'utf8', function (err, secret_key) {
                        if (err) return debugError(err);
                        secret_key = JSON.parse(secret_key);
                        secret_key.text = crypto.randomBytes(48).toString('hex').substr(0, 10);
                        secret_key.lastUpdate = Date.now();
                        fs.writeFile(ROOT_DIR + "/config/secret_key.json", JSON.stringify(secret_key), 'utf8', function (err) {
                            if (err) return debugError(err);
                            debug('update server secret key');
                        });
                    });
                }, 1000 * 60 * 25);
                return tasks;
            }(), 1000 * 60 * 60 * 24);
        }, shouldWait + 1000 * 60 * 60);
    });
};