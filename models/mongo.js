const config = require('../config/config');

const debug = require('../helpers/debugger')('mongo');
const appInit = require('../helpers/appInit');
const scheduler = require('../helpers/scheduler');

module.exports = function (mongoose, done) {
    mongoose.connect(config.dbUrl, config.dbOptions, function (err) {
        if (err) throw err;
        debug.log('mongoDB connect succeed');
        // require('../tmp/addKeyToOrder.js')
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
                }),
                new Promise((resolve, reject) => {
                    appInit.coupon(err => {
                        if (err) return reject(err);
                        resolve();
                    });
                })
            ])
            .then(() => {
                debug.log("Done App Initializing");
                done();
                if (process.env.NODE_ENV && process.env.NODE_ENV.replace(/"|\s/g, "") === "testing") {
                    scheduler();
                } else if (process.env.NODE_ENV && process.env.NODE_ENV.replace(/"|\s/g, "") === "development") {
                    debug.log("Development Server no scheduler");
                } else {
                    debug.log("Deploy Server no scheduler");
                }

                Promise
                    .all([
                        new Promise((resolve, reject) => {
                            appInit.checkCouponIsExpired(err => {
                                if (err) return reject(err);
                                resolve();
                            });
                        }),
                        new Promise((resolve, reject) => {
                            appInit.checkUsersShouldBeBanned(true, null, err => {
                                if (err) return reject(err);
                                resolve();
                            });
                        })
                    ])
                    .then(() => {
                        debug.log("Done App Startup Check List");
                    })
                    .catch(err => debug.error(err));
            })
            .catch(err => debug.error(err));
    });
};