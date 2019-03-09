const Trade = require('../../../models/DB/tradeDB');
const User = require('../../../models/DB/userDB');
const UserKey = require('../../../models/DB/userKeysDB');
const Container = require('../../../models/DB/containerDB');

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
            User.updateMany({}, {
                $pull: {
                    'roles.typeList': {
                        $in: ['clerk_沒活動']
                    }
                }
            }).exec().then(_ => {
                done();
            }).catch(err => {
                done();
            });
        });
    });

    describe('migrate-userkey', function () {
        it('should succeed', function (done) {
            UserKey.remove({
                phone: '0905519292'
            }).exec().then(_ => {
                done();
            }).catch(err => {
                done();
            });
        });
    });

    describe.only('migrate-container', function () {
        it('should succeed', function (done) {
            for (let i = 99900; i < 100000; i++) {
                Container.update({
                    'ID': i
                }, {
                    'active': true,
                    'typeCode': (i % 10) + 1,
                    'checkedAt': Date.now(),
                    '$setOnInsert': {
                        'conbineTo': '0900000000'
                    }
                }, {
                    upsert: true,
                    setDefaultsOnInsert: true
                }).exec().then(_ => {
                    done();
                }).catch(err => {
                    done();
                });
            }
        });
    });

});