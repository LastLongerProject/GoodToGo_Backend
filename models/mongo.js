const config = require('../config/config');

const debug = require('../helpers/debugger')('mongo');
const appInit = require('../helpers/appInit');

module.exports = function (mongoose, done) {
    mongoose.connect(config.dbUrl, config.dbOptions, function (err) {
        if (err) throw err;
        debug.log('mongoDB connect succeed');
        require('../tmp/checkUserPoint.js')
        appInit.beforeStartUp(() => {
            done();
            appInit.afterStartUp();
        });
    });
};