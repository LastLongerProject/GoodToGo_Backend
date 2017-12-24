var appInit = require('./appInit');
var User = require('./DB/userDB');
var UserKeys = require('./DB/userKeysDB');
var dateCheckpoint = require('./toolKit').dateCheckpoint;

var fs = require('fs');
var crypto = require('crypto');
var debug = require('debug')('goodtogo_backend:scheduler');
debug.log = console.log.bind(console);
var debugError = require('debug')('goodtogo_backend:schedulerERR');

function cb() {} //do nothing
function driveCb(succeed, data) {
    if (succeed) {
        debug(data.type + ' succeed');
    } else {
        debug(data.type + ' fail: ', data.data);
    }
}

module.exports = function(app) {
    appInit.container(app);
    appInit.store(app);
    User.findOne({ 'user.phone': '0900000000' }, (err, bot) => {
        if (err) return debugError(err);
        if (!bot) return debugError('missing bot acount');
        var dateNow = new Date();
        var shouldWait = dateCheckpoint(1) - dateNow;
        setTimeout(function() {
            setInterval(function tasks() {
                debug('scheduler start');
                setTimeout(appInit.refreshContainer, 0, app, bot, cb);
                setTimeout(appInit.refreshStore, 1000 * 60 * 5, app, cb);
                setTimeout(appInit.refreshContainerIcon, 1000 * 60 * 10, false, driveCb);
                setTimeout(appInit.refreshStoreImg, 1000 * 60 * 15, false, driveCb);
                setTimeout(function() {
                    UserKeys.remove({ 'updatedAt': { '$lt': dateCheckpoint(-14) } }, (err) => {
                        if (err) return debugError(err);
                        debug('remove expire login');
                    });
                }, 1000 * 60 * 20);
                setTimeout(function() {
                    fs.readFile("./config/config.json", 'utf8', function(err, data) {
                        if (err) return debugError(err);
                        var config = JSON.parse(data);
                        config.secret_key.text = crypto.randomBytes(48).toString('hex').substr(0, 10);
                        config.secret_key.lastUpdate = Date.now();
                        fs.writeFile("./config/config.json", JSON.stringify(config), 'utf8', function(err) {
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