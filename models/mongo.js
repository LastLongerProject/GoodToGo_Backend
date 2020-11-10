const config = require('../config/config');

const debug = require('../helpers/debugger')('mongo');
const appInit = require('../helpers/appInit');

module.exports = function (mongoose, done) {
    mongoose.set('useNewUrlParser', true);
    mongoose.set('useCreateIndex', true);
    mongoose.set('useUnifiedTopology', true);
    mongoose.connect(config.mongodbUrl, config.mongodbOptions, function (err) {
        if (err) return done(err);
        debug.log('mongoDB connect succeed');
        // require('../tmp/changeUserStruc.js')
        appInit.beforeStartUp(() => {
            done();
            appInit.afterStartUp();
        });
    });
};