const request = require('supertest');
const app = require('../../../app');
const jwt = require('jwt-simple');
const secret = require('../../../config/secret_key.json');
const makeHexString = require('../tool.js').makeHexString;
const userDB = require('../../../models/DB/userDB');

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

describe('api-stores', function () {
    before(function (done) {
        setTimeout(done, 11000);
    });

    describe('POST /login', function () {
        it('respond in json with roles', function (done) {
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
                .expect(function (res) {
                    let decode = jwt.decode(res.header.authorization, secret.text);
                    if (!('customer' || 'admin' || 'clerk' in decode.roles))
                        throw new Error('Missing roles');
                })
                .end(function (err, res) {
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
    describe('GET /stores/list', function () {
        it('should return 200', function (done) {
            request(app)
                .get('/stores/list')
                .set('Content-Type', 'application/json')
                .set('reqID', makeHexString())
                .set('reqTime', Date.now())
                .expect(200)
                .expect(checkStoreListKeys)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe.only('GET /stores/list/12', function () {
        it('should return 200', function (done) {
            request(app)
                .get('/stores/list/12')
                .set('Content-Type', 'application/json')
                .set('reqID', makeHexString())
                .set('reqTime', Date.now())
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /stores/dict', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/stores/dict')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /stores/clerkList', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/stores/clerkList')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(function (res) {
                    if (!('clerkList' in res.body))
                        throw new Error('Missing clerk list');
                    if (!('phone' in res.body.clerkList[0]))
                        throw new Error('Missing phone in clerk list');
                    if (!('name' in res.body.clerkList[0]))
                        throw new Error('Missing name in clerk list');
                    if (!('isManager' in res.body.clerkList[0]))
                        throw new Error('Missing isManager in clerk list');
                })
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('POST /signup/clerk', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .post('/users/signup/clerk')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .send({
                    phone: '0966666666',
                    password: '',
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('POST /stores/layoff/:id', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .post('/stores/layoff/0966666666')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    userDB.deleteOne({
                        'user.phone': '0966666666',
                    },
                        (err, res) => {
                            if (err) return done(err);
                        }
                    );
                    done();
                });
        });
    });

    describe('GET /stores/status', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .get('/stores/status')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
                .expect(checkStoreStatusKeys)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    console.log(res.body.containers[0].IdList)
                    console.log(res.body.containers[1].IdList)

                    done();
                });
        });
    });

    describe('GET /stores/openingTime', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .get('/stores/openingTime')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
                .expect(checkOpeningTimeKeys)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('POST /stores/unsetDefaultOpeningTime', function () {
        it('status code should be 204', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .post('/stores/unsetDefaultOpeningTime')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(204)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /stores/checkUnReturned', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .get('/stores/checkUnReturned')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
                .expect(function (res) {
                    if (!('data' in res.body)) throw new Error('Missing data')
                })
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('POST /stores/changeOpeningTime', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .post('/stores/changeOpeningTime')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .send({
                    opening_hours: [{
                        close: {
                            time: '21:00',
                            day: 1,
                        },
                        open: {
                            time: '09:00',
                            day: 1,
                        },
                    },],
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /stores/boxToSign', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .get('/stores/boxToSign')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
                .expect(checkBoxToSignKeys)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /stores/usedAmount', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .get('/stores/usedAmount')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
                .expect(checkUsedAmountKeys)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /stores/history', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .get('/stores/history')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
                .expect(checkGetHistoryKeys)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    console.log(res.body);

                    done();
                });
        });
    });

    describe('GET /stores/history/byContainerType', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .get('/stores/history/byContainerType')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
                .expect(checkGetHistoryByContainerKeys)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    console.log(res.body);

                    done();
                });
        });
    });

    describe('GET /stores/history/byCustomer', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .get('/stores/history/byCustomer')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
                .expect(function (res) {
                    if (!('totalDistinctCustomer' in res.body)) throw new Error('Missing totalDistinctCustomer');
                    if (!('customerSummary' in res.body)) throw new Error('Missing customerSummary');
                })
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }

                    done();
                });
        });
    });

    describe('GET /stores/performance?date', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .get('/stores/performance')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /stores/favorite', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .get('/stores/favorite')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
                .expect(checkFavoriteKeys)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /stores/activity/0', function () {
        it('status code should be 200', function (done) {
            request(app)
                .get('/stores/activity/0')
                .set('Content-Type', 'application/json')
                .set('reqID', makeHexString())
                .set('reqTime', Date.now())
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    console.log(res.body);
                    done();
                });
        });
    });

    describe('GET /stores/activityList', function () {
        it('status code should be 200', function (done) {
            request(app)
                .get('/stores/activityList')
                .set('Content-Type', 'application/json')
                .set('reqID', makeHexString())
                .set('reqTime', Date.now())
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    console.log(res.body);
                    done();
                });
        });
    });
});

function checkStoreListKeys(res) {
    if (!('title' in res.body)) throw new Error('Missing title');
    if (!('contract_code_explanation' in res.body))
        throw new Error('Missing contract_code_explanation');
    if (!('globalAmount' in res.body)) throw new Error('Missing globalAmount');
    if (!('shop_data' in res.body)) throw new Error('Missing shop_data');
    if (!('id' in res.body.shop_data[0]))
        throw new Error('Missing id in shop_data');
    if (!('name' in res.body.shop_data[0]))
        throw new Error('Missing id name shop_data');
    if (!('img_info' in res.body.shop_data[0]))
        throw new Error('Missing img_info in shop_data');
    if (!('opening_hours' in res.body.shop_data[0]))
        throw new Error('Missing opening_hours in shop_data');
    if (!('contract' in res.body.shop_data[0]))
        throw new Error('Missing contract in shop_data');
    if (!('location' in res.body.shop_data[0]))
        throw new Error('Missing location in shop_data');
    if (!('address' in res.body.shop_data[0]))
        throw new Error('Missing address in shop_data');
    if (!('type' in res.body.shop_data[0]))
        throw new Error('Missing type in shop_data');
    if (!('category' in res.body.shop_data[0]))
        throw new Error('Missing category in shop_data');
    if (!('testing' in res.body.shop_data[0]))
        throw new Error('Missing testing in shop_data');
}

function checkStoreStatusKeys(res) {
    if (!('containers' in res.body)) throw new Error('Missing containers');
    if (!('toReload' in res.body)) throw new Error('Missing toReload');
    if (!('todayData' in res.body)) throw new Error('Missing todayData');
    if (!('lostList' in res.body)) throw new Error('Missing lostList');

    if (!('typeCode' in res.body.containers[0]))
        throw new Error('Missing typeCode in containers');
    if (!('name' in res.body.containers[0]))
        throw new Error('Missing name in containers');
    if (!('IdList' in res.body.containers[0]))
        throw new Error('Missing IdList in containers');
    if (!('amount' in res.body.containers[0]))
        throw new Error('Missing amount in containers');
    if (!('typeCode' in res.body.toReload[0]))
        throw new Error('Missing typeCode in containers');
    if (!('name' in res.body.toReload[0]))
        throw new Error('Missing name in toReload');
    if (!('IdList' in res.body.toReload[0]))
        throw new Error('Missing IdList in toReload');
    if (!('amount' in res.body.toReload[0]))
        throw new Error('Missing amount in toReload');
    if (!('rent' in res.body.todayData))
        throw new Error('Missing rent in todayData');
    if (!('return' in res.body.todayData))
        throw new Error('Missing return in todayData');
}

function checkOpeningTimeKeys(res) {
    if (!('opening_hours' in res.body))
        throw new Error('Missing opening_hours');
    if (!('isSync' in res.body)) throw new Error('Missing isSync');

    if (!('close' in res.body.opening_hours[0]))
        throw new Error('Missing close in opening_hours');
    if (!('open' in res.body.opening_hours[0]))
        throw new Error('Missing open in opening_hours');
    if (!('_id' in res.body.opening_hours[0]))
        throw new Error('Missing _id in opening_hours');
    if (!('day' in res.body.opening_hours[0].close))
        throw new Error('Missing day in close');
    if (!('time' in res.body.opening_hours[0].close))
        throw new Error('Missing time in close');
    if (!('day' in res.body.opening_hours[0].open))
        throw new Error('Missing day in open');
    if (!('time' in res.body.opening_hours[0].open))
        throw new Error('Missing time in open');
}

function checkBoxToSignKeys(res) {
    if (!('toSign' in res.body))
        throw new Error('Missing toSign');
    if (!('boxID' in res.body.toSign[0]))
        throw new Error('Missing boxID in toSign');
    if (!('boxTime' in res.body.toSign[0]))
        throw new Error('Missing boxTime in toSign');
    if (!('typeList' in res.body.toSign[0]))
        throw new Error('Missing typeList in toSign');
    if (!('containerList' in res.body.toSign[0]))
        throw new Error('Missing containerList in toSign');
    if (!('isDelivering' in res.body.toSign[0]))
        throw new Error('Missing isDelivering in toSign');
    if (!('destinationStore' in res.body.toSign[0]))
        throw new Error('Missing destinationStore in toSign');
    if (!('containerOverview' in res.body.toSign[0]))
        throw new Error('Missing containerOverview in toSign');
}

function checkUsedAmountKeys(res) {
    if (!('store' in res.body))
        throw new Error('Missing store');
    if (!('total' in res.body))
        throw new Error('Missing total');
    if (!('typeCode' in res.body.store[0]))
        throw new Error('Missing typeCode in store');
    if (!('amount' in res.body.store[0]))
        throw new Error('Missing amount in store');
}

function checkGetHistoryKeys(res) {
    if (!('rentHistory' in res.body))
        throw new Error('Missing rentHistory');
    if (!('returnHistory' in res.body))
        throw new Error('Missing returnHistory');
    if (!('amount' in res.body.rentHistory))
        throw new Error('Missing amount in rentHistory');
    if (!('dataList' in res.body.rentHistory))
        throw new Error('Missing dataList in rentHistory');
    if (!('amount' in res.body.returnHistory))
        throw new Error('Missing amount in returnHistory');
    if (!('dataList' in res.body.returnHistory))
        throw new Error('Missing dataList in returnHistory');
}

function checkGetHistoryByContainerKeys(res) {
    if (!('personalLostHistory' in res.body)) throw new Error('Missing personalLostHistory');
    if (!('storeLostHistory' in res.body)) throw new Error('Missing storeLostHistory');
    if (!('cleanReloadHistory' in res.body)) throw new Error('Missing cleanReloadHistory');
    if (!('usedHistory' in res.body)) throw new Error('Missing usedHistory');
    if (!('rentHistory' in res.body)) throw new Error('Missing rentHistory');
    if (!('returnHistory' in res.body)) throw new Error('Missing returnHistory');
}

function checkFavoriteKeys(res) {
    if (!('userList' in res.body)) throw new Error('Missing userList');

    if (!('phone' in res.body.userList[0])) throw new Error('Missing phone');
    if (!('times' in res.body.userList[0])) throw new Error('Missing times');
}