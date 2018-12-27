const request = require('supertest');
const app = require('../../../app');
const jwt = require('jwt-simple');
const secret = require('../../../config/secret_key.json');
const userDB = require('../../../models/DB/userDB');
const redis = require('../../../models/redis');
const Container = require('../../../models/DB/containerDB');
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

describe.only('api-stores', function() {
    describe.only('POST /login', function() {
        it('respond in json with roles', function(done) {
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
    describe('GET /stores/list', function() {
        it('should return 200', function(done) {
            request(app)
                .get('/stores/list')
                .set('Content-Type', 'application/json')
                .set('reqID', makeHexString())
                .set('reqTime', Date.now())
                .expect(200)
                .expect(checkStoreListKeys)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /stores/dict', function() {
        it('status code should be 200', function(done) {
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
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /stores/clerkList', function() {
        it('status code should be 200', function(done) {
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
                .expect(function(res) {
                    if (!('clerkList' in res.body)) throw new Error('Missing clerk list');
                    if (!('phone' in res.body.clerkList[0])) throw new Error('Missing phone in clerk list');
                    if (!('name' in res.body.clerkList[0])) throw new Error('Missing name in clerk list');
                    if (!('isManager' in res.body.clerkList[0])) throw new Error('Missing isManager in clerk list');
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

    describe('POST /signup/clerk', function() {
        it('status code should be 200', function(done) {
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
                    phone: '0999999999',
                    password: '',
                })
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

    describe('POST /stores/layoff/:id', function() {
        it('status code should be 200', function(done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .post('/stores/layoff/0999999999')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
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

    describe.only('GET /stores/status', function() {
        it('status code should be 200', function(done) {
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
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /stores/openingTime', function() {
        it('status code should be 200', function(done) {
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

    describe('POST /stores/unsetDefaultOpeningTime', function() {
        it('status code should be 204', function(done) {
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

    describe('GET /stores/checkUnReturned', function() {
        it('status code should be 200', function(done) {
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

    describe('POST /stores/changeOpeningTime', function() {
        it('status code should be 200', function(done) {
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
                            time: "21:00",
                            day: 1
                        },
                        open: {
                            time: "09:00",
                            day: 1
                        }
                    }]
                })
                .expect(200)
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

    describe('GET /stores/boxToSign', function() {
        it('status code should be 200', function(done) {
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

    describe('GET /stores/usedAmount', function() {
        it('status code should be 200', function(done) {
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

    describe('GET /stores/history', function() {
        it('status code should be 200', function(done) {
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

    describe('GET /stores/history/byContainerType', function() {
        it('status code should be 200', function(done) {
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

    describe('GET /stores/history/byCustomer', function() {
        it('status code should be 200', function(done) {
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

    describe('GET /stores/performance', function() {
        it('status code should be 200', function(done) {
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

    describe('GET /stores/favorite', function() {
        it('status code should be 200', function(done) {
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
});

function checkStoreListKeys(res) {
    if (!('title' in res.body)) throw new Error('Missing title');
    if (!('contract_code_explanation' in res.body)) throw new Error('Missing contract_code_explanation');
    if (!('globalAmount' in res.body)) throw new Error('Missing globalAmount');
    if (!('shop_data' in res.body)) throw new Error('Missing shop_data');
    if (!('id' in res.body.shop_data[0])) throw new Error('Missing id in shop_data');
    if (!('name' in res.body.shop_data[0])) throw new Error('Missing id name shop_data');
    if (!('img_info' in res.body.shop_data[0])) throw new Error('Missing img_info in shop_data');
    if (!('opening_hours' in res.body.shop_data[0])) throw new Error('Missing opening_hours in shop_data');
    if (!('contract' in res.body.shop_data[0])) throw new Error('Missing contract in shop_data');
    if (!('location' in res.body.shop_data[0])) throw new Error('Missing location in shop_data');
    if (!('address' in res.body.shop_data[0])) throw new Error('Missing address in shop_data');
    if (!('type' in res.body.shop_data[0])) throw new Error('Missing type in shop_data');
    if (!('testing' in res.body.shop_data[0])) throw new Error('Missing testing in shop_data');
}

function checkStoreStatusKeys(res) {
    if (!('containers' in res.body)) throw new Error('Missing containers');
    if (!('toReload' in res.body)) throw new Error('Missing toReload');
    if (!('todayData' in res.body)) throw new Error('Missing todayData');

    if (!('typeCode' in res.body.containers[0])) throw new Error('Missing typeCode in containers');
    if (!('name' in res.body.containers[0])) throw new Error('Missing name in containers');
    if (!('IdList' in res.body.containers[0])) throw new Error('Missing IdList in containers');
    if (!('amount' in res.body.containers[0])) throw new Error('Missing amount in containers');
    if (!('typeCode' in res.body.toReload[0])) throw new Error('Missing typeCode in containers');
    if (!('name' in res.body.toReload[0])) throw new Error('Missing name in toReload');
    if (!('IdList' in res.body.toReload[0])) throw new Error('Missing IdList in toReload');
    if (!('amount' in res.body.toReload[0])) throw new Error('Missing amount in toReload');
    if (!('rent' in res.body.todayData)) throw new Error('Missing rent in todayData');
    if (!('amount' in res.body.todayData)) throw new Error('Missing amount in todayData');
}