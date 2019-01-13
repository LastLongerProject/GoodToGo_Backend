const request = require('supertest');
const app = require('../../../app');
const jwt = require('jwt-simple');
const secret = require('../../../config/secret_key.json');
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

describe('api-containers', function() {
    before(function(done) {
        setTimeout(done, 13000);
    });

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
                    if (!('customer' || 'admin' || 'clerk' in decode.roles))
                        throw new Error('Missing roles');
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

    describe('GET /containers/globalUsedAmount', function() {
        it('status code should be 200', function(done) {
            request(app)
                .get('/containers/globalUsedAmount')
                .expect(200)
                .expect(function(res) {
                    if (!res.text) throw new Error('Missing amount in text')
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

    describe.skip('GET /containers/stock/:id', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/containers/stock/:id')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(function(res) {
                    res.body.message = 'refresh succeed' && Array.isArray(res.body.data)
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

    describe('GET /containers/challenge/token', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/containers/challenge/token')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(function(res) {
                    if (!res.body.uri) throw new Error('Missing uri');
                    if (!res.body.token) throw new Error('Missing token');
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

    describe('POST /containers/add/:id/:type', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            request(app)
                .post('/containers/add/99998/0')
                .expect(200)
                .expect(function(res) {
                    res.body.message === 'Add succeeded'
                })
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }

                    Container.deleteOne({
                        ID: 99998
                    }, (err, res) => {
                        if (err) return console.log(err);
                    });
                    done();
                });
        });
    });

    describe('GET /containers/get/list', function() {
        it('should return 200', function(done) {
            request(app)
                .get('/containers/get/list')
                .set('Content-Type', 'application/json')
                .set('reqID', makeHexString())
                .set('reqTime', Date.now())
                .expect(200)
                .expect(function(res) {
                    if (!res.body.containerType) throw new Error('Missing containerType');
                    if (!res.body.containerDict) throw new Error('Missing containerDict');
                    if (!(res.body.containerType[0].typeCode === 0 ? 1 : res.body.containerType[0].typeCode)) throw new Error('Missing typeCode in containerType');
                    if (!res.body.containerType[0].name) throw new Error('Missing name in containerType');
                    if (!res.body.containerType[0].version) throw new Error('Missing version in containerType');
                    if (!res.body.containerType[0].icon) throw new Error('Missing icon in containerType');

                })
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body.containerType[0].typeCode);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe.only('GET /containers/get/toDelivery', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/containers/get/toDelivery')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(checkToDeliveryKeys)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body.toDelivery[0]);
                        return done(err);
                    }
                    console.log(res.body)
                    done();
                });
        });
    });

    describe('GET /containers/get/deliveryHistory', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/containers/get/deliveryHistory')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(checkDeliveryHistoryKeys)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }

                    done();
                });
        });
    });

    describe('GET /containers/get/reloadHistory', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/containers/get/reloadHistory')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(checkReloadHistoryKeys)
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

function checkToDeliveryKeys(res) {
    if (!res.body.toDelivery) throw new Error('Missing toDelivery');
    if (!res.body.toDelivery[0].boxID) throw new Error('Missing boxID in toDelivery');
    if (!res.body.toDelivery[0].boxTime) throw new Error('Missing boxTime in toDelivery');
    if (!res.body.toDelivery[0].phone) throw new Error('Missing phone in toDelivery');
    if (!res.body.toDelivery[0].typeList) throw new Error('Missing typeList in toDelivery');
    if (!res.body.toDelivery[0].containerList) throw new Error('Missing containerList in toDelivery');
    if (!('stocking' in res.body.toDelivery[0])) throw new Error('Missing stocking in toDelivery');
    if (!('isDelivering' in res.body.toDelivery[0])) throw new Error('Missing isDelivering in toDelivery');
    if (!('containerOverview' in res.body.toDelivery[0])) throw new Error('Missing containerOverview in toDelivery');
    if (!('box' in res.body.toDelivery[0].phone)) throw new Error('Missing box in phone');
    if (!('containerType' in res.body.toDelivery[0].containerOverview[0])) throw new Error('Missing containerType in containerOverview');
    if (!('amount' in res.body.toDelivery[0].containerOverview[0])) throw new Error('Missing amount in containerOverview');
    console.log(typeof res.body.toDelivery[0].boxID)
}

function checkDeliveryHistoryKeys(res) {
    if (!res.body.pastDelivery) throw new Error('Missing pastDelivery');
    if (!res.body.pastDelivery[0].boxID) throw new Error('Missing boxID in pastDelivery');
    if (!res.body.pastDelivery[0].boxTime) throw new Error('Missing boxTime in pastDelivery');
    if (!res.body.pastDelivery[0].phone) throw new Error('Missing phone in pastDelivery');
    if (!res.body.pastDelivery[0].typeList) throw new Error('Missing typeList in pastDelivery');
    if (!res.body.pastDelivery[0].containerList) throw new Error('Missing containerList in pastDelivery');
    if (!res.body.pastDelivery[0].containerOverview) throw new Error('Missing containerOverview in pastDelivery');
    if (!('destinationStore' in res.body.pastDelivery[0])) throw new Error('Missing destinationStore in pastDelivery');

    if (!('delivery' in res.body.pastDelivery[0].phone)) throw new Error('Missing delivery in phone');
    if (!('containerType' in res.body.pastDelivery[0].containerOverview[0])) throw new Error('Missing containerType in containerOverview');
    if (!('amount' in res.body.pastDelivery[0].containerOverview[0])) throw new Error('Missing amount in containerOverview');
}

function checkReloadHistoryKeys(res) {
    if (!res.body.reloadHistory) throw new Error('Missing reloadHistory');
    if (!res.body.reloadHistory[0].from) throw new Error('Missing from in reloadHistory');
    if (!res.body.reloadHistory[0].boxTime) throw new Error('Missing boxTime in reloadHistory');
    if (!res.body.reloadHistory[0].phone) throw new Error('Missing phone in reloadHistory');
    if (!res.body.reloadHistory[0].typeList) throw new Error('Missing typeList in reloadHistory');
    if (!res.body.reloadHistory[0].containerList) throw new Error('Missing containerList in reloadHistory');
    if (!res.body.reloadHistory[0].containerOverview) throw new Error('Missing containerOverview in reloadHistory');
    if (!('cleanReload' in res.body.reloadHistory[0])) throw new Error('Missing cleanReload in reloadHistory');

    if (!('reload' in res.body.reloadHistory[0].phone)) throw new Error('Missing reload in phone');
    if (!('containerType' in res.body.reloadHistory[0].containerOverview[0])) throw new Error('Missing containerType in containerOverview');
    if (!('amount' in res.body.reloadHistory[0].containerOverview[0])) throw new Error('Missing amount in containerOverview');
}