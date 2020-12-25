const config = require('../config/config');

const debug = require('../helpers/debugger')('mongo');
const appInit = require('../helpers/appInit');

module.exports = function (mongoose, init, done) {
    mongoose.set('useNewUrlParser', true);
    mongoose.set('useCreateIndex', true);
    mongoose.set('useUnifiedTopology', true);
    mongoose.connect(config.mongodbUrl, config.mongodbOptions, function (err) {
        if (err) return done(err);
        debug.log('mongoDB connect succeed');
        // require('../tmp/changeUserStruc.js')
        if (!init) return done();
        appInit.beforeStartUp(() => {
            done();
            appInit.afterStartUp();
        });
    });
};