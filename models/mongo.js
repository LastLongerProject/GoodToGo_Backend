const config = require('../config/config');

const debug = require('debug')('goodtogo_backend:mongo');
debug.log = console.log.bind(console);
const debugError = require('debug')('goodtogo_backend:mongoERR');

const appInit = require('../helpers/appInit');
const scheduler = require('../helpers/scheduler');

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

module.exports = function (done) {
    mongoose.connect(config.dbUrl, config.dbOptions, function (err) {
        if (err) throw err;
        debug('mongoDB connect succeed');
        // require('../tmp/modifyContainerSchema.js')
        Promise
            .all([
                new Promise((resolve, reject) => {
                    appInit.container(err => {
                        if (err) return reject(err);
                        resolve();
                    });
                }),
                new Promise((resolve, reject) => {
                    appInit.store(err => {
                        if (err) return reject(err);
                        resolve();
                    });
                })
            ])
            .then(() => {
                debug("Done App Initializing");
                if (process.env.NODE_ENV && process.env.NODE_ENV.replace(/"|\s/g, "") === "develop") {
                    scheduler();
                } else if (process.env.NODE_ENV && process.env.NODE_ENV.replace(/"|\s/g, "") === "testing") {
                    debug("Local Testing no scheduler");
                } else {
                    debug("Deploy Server no scheduler");
                }
                done();
            })
            .catch(err => debugError(err));
    });
};