const Trade = require('../../../models/DB/tradeDB');
const User = require('../../../models/DB/userDB');
const config = require('../../../config/config.js');

const mongoose = require('mongoose');

describe('migration', function () {
    before(function (done) {
        mongoose.connect(config.dbUrl, config.dbOptions, function (err) {
            if (err) {
                console.log(err);
                return done();
            }
            console.log('mongoDB connect succeed');
            return done();
        });
    });

    describe('migrate-trade', function () {
        it('should succeed', function (done) {
            Trade.updateMany({}, {
                $set: {
                    'exception': false
                }
            }).exec().then(_ => {
                console.log(_);
                done();
            }).catch(err => {
                console.log(err);
                done();
            });
        });
    });

    describe('migrate-user', function () {
        it('should succeed', function (done) {
            User.find({
                'roles.clerk.storeID': 17
            }).exec().then(users => {
                console.log(users[0].user.phone);
                done();
            }).catch(err => {
                console.log(err);
                done();
            });
        });
    });
});