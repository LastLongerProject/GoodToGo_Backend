const request = require('supertest');
const app = require('../../../app');
const jwt = require('jwt-simple');
const secret = require('../../../config/secret_key.json');
const Trade = require('../../../models/DB/tradeDB');

const makeHexString = require('../tool.js').makeHexString;
var typeList = [];
var roles = {
    customer: {
        secretkey: '',
        apiKey: '',
    },
    admin: {
        secretkey: '',
        apiKey: '',
    },
    clerk: {
        secretkey: '',
        apiKey: '',
    },
};

describe.only('api-manage', function() {

    before(function(done) {
        setTimeout(done, 8000);
    });

    describe.only('POST /login', function() {
        it('should response in json with roles', function(done) {
            request(app)
                .post('/users/login')
                .set('Content-Type', 'application/json')
                .set('reqID', makeHexString())
                .set('reqTime', Date.now())
                .send({
                    phone: '0905519292',
                    password: '',
                })
                .expect(200)
                .expect(function(res) {
                    let decode = jwt.decode(res.header.authorization, secret.text);
                    if (!('customer' || 'admin' || 'clerk' in decode.roles)) throw new Error("Missing roles");
                })
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    let decode = jwt.decode(res.header.authorization, secret.text);
                    typeList = decode.roles.typeList;
                    delete decode.roles.typeList;
                    roles = decode.roles;
                    done();
                });
        });
    });

    describe('GET /manage/index', function() {

        it('status code should be 200 and with correct keys', function(done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/manage/index')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(function(res) {
                    if (!('summary' in res.body)) throw new Error("Missing summary");
                    if (!('activityHistorySummary' in res.body)) throw new Error("Missing activityHistorySummary");
                    if (!('shopRecentHistorySummary' in res.body)) throw new Error("Missing shopRecentHistorySummary");
                    if (!('shopHistorySummary' in res.body)) throw new Error("Missing shopHistorySummary");
                })
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    console.log(res.body);
                    done();
                });
        });
    });

    describe.only('GET /manage/shop', function() {

        it('status code should be 200 and with correct keys', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/manage/shop')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(function(res) {
                    if (!('id' in res.body.list[0])) throw new Error("Missing storeID in list object");
                    if (!('storeName' in res.body.list[0])) throw new Error("Missing storeName in list object");
                    if (!('toUsedAmount' in res.body.list[0])) throw new Error("Missing toUsedAmount in list object");
                    if (!('todayAmount' in res.body.list[0])) throw new Error("Missing todayAmount in list object");
                    if (!('weekAmount' in res.body.list[0])) throw new Error("Missing weekAmount in list object");
                    if (!('weekAverage' in res.body.list[0])) throw new Error("Missing weekAverage in list object");
                })
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    // console.log(res.body);
                    done();
                });
        });
    });

    describe.only('GET /manage/shopDetail', function() {

        it('status code should be 200 and with correct keys', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/manage/shopDetail?id=17')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(checkShopDetailKeys)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    // console.log(res.body);
                    done();
                });
        });
    });

    describe('GET /manage/user', function() {

        it('status code should be 200 and with correct keys', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/manage/user')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(checkUserKeys)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }

                    done();
                });
        });
    });

    describe('GET /manage/userDetail?id=0900000000', function() {
        this.slow(1000);

        it('status code should be 200 and with correct keys', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/manage/userDetail?id=0900000000')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(checkUserDetailKeys)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    console.log(res.body);
                    done();
                });
        });
    });

    describe('GET /manage/container', function() {
        this.slow(1000);

        it('status code should be 200 and with correct keys', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/manage/container')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(checkContainerKeys)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /manage/containerDetail', function() {
        this.slow(1000);

        it('status code should be 200 and with correct keys', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/manage/containerDetail?id=3')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(checkContainerDetailKeys)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }

                    done();
                });
        });
    });

    describe('GET /manage/console', function() {
        this.slow(1000);

        it('status code should be 200 and with correct keys', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/manage/console')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /manage/shopSummary', function() {
        this.slow(1000);

        it('status code should be 200 and write summary to google sheet', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/manage/shopSummary')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('PATCH /manage/refresh/store', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .patch('/manage/refresh/store')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }

                    done();
                });
        });
    });

    describe('PATCH /manage/refresh/container', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .patch('/manage/refresh/container')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                        return done(err);
                    }

                    done();
                });
        });
    });

    describe('PATCH /manage/refresh/storeImg/:id', function() {
        this.slow(1000);

        it('status code should be 200 and with data', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .patch('/manage/refresh/storeImg/1')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(function(res) {
                    if (!('data' in res.body)) throw new Error('Missing data');
                })
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('PATCH /manage/refresh/containerIcon/:id', function() {
        this.slow(1000);

        it('status code should be 200 and with correct keys', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .patch('/manage/refresh/containerIcon/1')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(function(res) {
                    if (!('data' in res.body)) throw new Error('Missing data');
                })
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }

                    done();
                });
        });
    });
});

function checkShopDetailKeys(res) {
    if (!('storeName' in res.body)) throw new Error("Missing storeName");
    if (!('toUsedAmount' in res.body)) throw new Error("Missing toUsedAmount");
    if (!('todayAmount' in res.body)) throw new Error("Missing todayAmount");
    if (!('weekAmount' in res.body)) throw new Error("Missing weekAmount");
    if (!('weekAmountPercentage' in res.body)) throw new Error("Missing weekAmountPercentage");
    if (!('totalAmount' in res.body)) throw new Error("Missing totalAmount");
    if (!('joinedDate' in res.body)) throw new Error("Missing joinedDate");
    if (!('contactNickname' in res.body)) throw new Error("Missing contactNickname");
    if (!('contactPhone' in res.body)) throw new Error("Missing contactPhone");
    if (!('weekAverage' in res.body)) throw new Error("Missing weekAverage");
    if (!('shopLostAmount' in res.body)) throw new Error("Missing shopLostAmount");
    if (!('customerLostAmount' in res.body)) throw new Error("Missing customerLostAmount");
    if (!('history' in res.body)) throw new Error("Missing history");
    if (!('chartData' in res.body)) throw new Error("Missing chartData");
    if (!('time' in res.body.history[0])) throw new Error('Missing time in hisory key');
    if (!('action' in res.body.history[0])) throw new Error('Missing time in hisory key');
    if (!('content' in res.body.history[0])) throw new Error('Missing time in hisory key');
    if (!('contentDetail' in res.body.history[0])) throw new Error('Missing time in hisory key');
    if (!('owner' in res.body.history[0])) throw new Error('Missing time in hisory key');
    if (!('by' in res.body.history[0])) throw new Error('Missing time in hisory key');
}

function checkUserKeys(res) {
    if (!('totalUserAmount' in res.body)) throw new Error("Missing totalUserAmount");
    if (!('totalUsageAmount' in res.body)) throw new Error("Missing totalUsageAmount");
    if (!('weeklyAverageUsage' in res.body)) throw new Error("Missing weeklyAverageUsage");
    if (!('totalLostAmount' in res.body)) throw new Error("Missing totalLostAmount");
    if (!('list' in res.body)) throw new Error("Missing list");
    if (!('id' in res.body.list[0])) throw new Error("Missing id in list");
    if (!('phone' in res.body.list[0])) throw new Error("Missing phone in list");
    if (!('usingAmount' in res.body.list[0])) throw new Error("Missing usingAmount in list");
    if (!('lostAmount' in res.body.list[0])) throw new Error("Missing lostAmount in list");
    if (!('totalUsageAmount' in res.body.list[0])) throw new Error("Missing totalUsageAmount in list");
}

function checkUserDetailKeys(res) {
    if (!('userPhone' in res.body)) throw new Error("Missing userPhone");
    if (!('usingAmount' in res.body)) throw new Error("Missing usingAmount");
    if (!('lostAmount' in res.body)) throw new Error("Missing lostAmount");
    if (!('totalUsageAmount' in res.body)) throw new Error("Missing totalUsageAmount");
    if (!('joinedDate' in res.body)) throw new Error("Missing joinedDate");
    if (!('joinedMethod' in res.body)) throw new Error("Missing joinedMethod");
    if (!('recentAmount' in res.body)) throw new Error("Missing recentAmount");
    if (!('recentAmountPercentage' in res.body)) throw new Error("Missing recentAmountPercentage");
    if (!('weekAverage' in res.body)) throw new Error("Missing weekAverage");
    if (!('averageUsingDuration' in res.body)) throw new Error("Missing averageUsingDuration");
    if (!('contribution' in res.body)) throw new Error("Missing contribution");
    if (!('amountOfBorrowingFromDiffPlace' in res.body)) throw new Error("Missing amountOfBorrowingFromDiffPlace");
    if (!('history' in res.body)) throw new Error("Missing history");
    if (!('containerType' in res.body.history[0])) throw new Error("Missing containerType in history");
    if (!('containerID' in res.body.history[0])) throw new Error("Missing containerID in history");
    if (!('rentTime' in res.body.history[0])) throw new Error("Missing rentTime in history");
    if (!('rentPlace' in res.body.history[0])) throw new Error("Missing rentPlace in history");
    if (!('returnTime' in res.body.history[0])) throw new Error("Missing returnTime in history");
    if (!('returnPlace' in res.body.history[0])) throw new Error("Missing returnPlace in history");
    if (!('usingDuration' in res.body.history[0])) throw new Error("Missing usingDuration in history");

}

function checkContainerKeys(res) {
    if (!('list' in res.body)) throw new Error("Missing list");
    if (!('id' in res.body.list[0])) throw new Error("Missing id in list");
    if (!('type' in res.body.list[0])) throw new Error("Missing id in list");
    if (!('totalAmount' in res.body.list[0])) throw new Error("Missing totalAmount in list");
    if (!('toUsedAmount' in res.body.list[0])) throw new Error("Missing toUsedAmount in list");
    if (!('usingAmount' in res.body.list[0])) throw new Error("Missing usingAmount in list");
    if (!('returnedAmount' in res.body.list[0])) throw new Error("Missing returnedAmount in list");
    if (!('toCleanAmount' in res.body.list[0])) throw new Error("Missing toCleanAmount in list");
    if (!('toDeliveryAmount' in res.body.list[0])) throw new Error("Missing toDeliveryAmount in list");
    if (!('toSignAmount' in res.body.list[0])) throw new Error("Missing toSignAmount in list");
    if (!('inStorageAmount' in res.body.list[0])) throw new Error("Missing inStorageAmount in list");
    if (!('lostAmount' in res.body.list[0])) throw new Error("Missing lostAmount in list");
}

function checkContainerDetailKeys(res) {
    if (!('containerID' in res.body)) throw new Error("Missing containerID");
    if (!('containerType' in res.body)) throw new Error("Missing containerType");
    if (!('reuseTime' in res.body)) throw new Error("Missing reuseTime");
    if (!('status' in res.body)) throw new Error("Missing status");
    if (!('bindedUser' in res.body)) throw new Error("Missing bindedUser");
    if (!('joinedDate' in res.body)) throw new Error("Missing joinedDate");
    if (!('history' in res.body)) throw new Error("Missing history");

    if (!('txt' in res.body.containerType)) throw new Error("Missing txt in containerType");
    if (!('code' in res.body.containerType)) throw new Error("Missing code in containerType");

    if (!('tradeTime' in res.body.history[0])) throw new Error("Missing id in history");
    if (!('action' in res.body.history[0])) throw new Error("Missing type in history");
    if (!('newUser' in res.body.history[0])) throw new Error("Missing totalAmount in history");
    if (!('oriUser' in res.body.history[0])) throw new Error("Missing toUsedAmount in history");
    if (!('comment' in res.body.history[0])) throw new Error("Missing usingAmount in history");
}