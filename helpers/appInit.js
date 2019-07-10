const debug = require('../helpers/debugger')('appInit');

const tasks = require('../helpers/tasks');
const scheduler = require('../helpers/scheduler');

module.exports = {
    beforeStartUp: function (done) {
        Promise
            .all([
                new Promise((resolve, reject) => {
                    tasks.containerListInit(err => {
                        if (err) return reject(err);
                        resolve();
                    });
                }),
                new Promise((resolve, reject) => {
                    tasks.storeListInit(err => {
                        if (err) return reject(err);
                        resolve();
                    });
                }),
                new Promise((resolve, reject) => {
                    tasks.couponListInit(err => {
                        if (err) return reject(err);
                        resolve();
                    });
                })
            ])
            .then(() => {
                debug.log("Done App Initializing");
                done();
            })
            .catch(debug.error);
    },
    afterStartUp: function () {
        if (process.env.NODE_ENV) {
            const ENV = process.env.NODE_ENV.replace(/"|\s/g, "");
            if (ENV === "testing") {
                scheduler();
            } else if (ENV === "development") {
                debug.log("Development Server no scheduler");
            } else {
                debug.log(`${ENV} Server no scheduler`);
            }
        } else {
            debug.log("Undefined Server no scheduler");
        }

        Promise
            .all([
                new Promise((resolve, reject) => {
                    tasks.checkCouponIsExpired(err => {
                        if (err) return reject(err);
                        resolve();
                    });
                }),
                new Promise((resolve, reject) => {
                    tasks.refreshAllUserUsingStatus(false, err => {
                        if (err) return reject(err);
                        resolve();
                    });
                })
            ])
            .then(() => {
                debug.log("Done App Startup Check List");
            })
            .catch(debug.error);
    }
};