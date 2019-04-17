const config = require('../config/config');

const debug = require('../helpers/debugger')('mongo');
const appInit = require('../helpers/appInit');
const scheduler = require('../helpers/scheduler');

module.exports = function (mongoose, done) {
    mongoose.connect(config.dbUrl, config.dbOptions, function (err) {
        if (err) throw err;
        debug.log('mongoDB connect succeed');
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
                debug.log("Done App Initializing");
                if (process.env.NODE_ENV && process.env.NODE_ENV.replace(/"|\s/g, "") === "develop") {
                    scheduler();
                } else if (process.env.NODE_ENV && process.env.NODE_ENV.replace(/"|\s/g, "") === "testing") {
                    debug.log("Local Testing no scheduler");
                } else {
                    debug.log("Deploy Server no scheduler");
                }
                done();
            })
            .catch(err => debug.error(err));
    });
};
