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

describe.only('api-cycle', function() {
    before(function(done) {
        setTimeout(done, 11000);
    });
    describe('POST /login', function() {
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

    describe('POST /containers/box', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);

            request(app)
                .post('/containers/box')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .send({
                    phone: "0900000000",
                    containerList: [99999],
                    boxId: 99999
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

    describe('POST /containers/delivery/:id/:store', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);

            request(app)
                .post('/containers/delivery/99999/17')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(checkCycleKey)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('POST /containers/sign/:id', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);

            request(app)
                .post('/containers/sign/99999')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(checkCycleKey)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });
    let rent_apiKey = "";
    describe('Get /stores/getUser/:id', function() {
        it('status code should be 200', function(done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .get('/stores/getUser/0905519292')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .expect(200)
                .expect(function(res) {
                    if (!('phone' in res.body)) throw new Error('Missing phone');
                    if (!('apiKey' in res.body)) throw new Error('Missing apiKey');
                })
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    rent_apiKey = res.body.apiKey;
                    done();
                });
        });
    });

    describe('POST /containers/rent/:id', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
                orderTime: Date.now()
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);

            request(app)
                .post('/containers/rent/99999')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .set('userapikey', rent_apiKey)
                .expect(200)
                .expect(checkCycleKey)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('POST /containers/return/:id', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
                orderTime: Date.now()
            };

            let auth = jwt.encode(payload, roles.clerk.secretKey);

            request(app)
                .post('/containers/return/99999')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .set('userapikey', rent_apiKey)
                .expect(200)
                .expect(checkCycleKey)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('POST /containers/readyToClean/:id', function() {
        this.slow(1000);

        it('status code should be 200', function(done) {
            let payload = {
                jti: 'manager',
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
                orderTime: Date.now()
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);

            request(app)
                .post('/containers/readyToClean/99999')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .set('userapikey', rent_apiKey)
                .expect(200)
                .expect(checkCycleKey)
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

function checkCycleKey(res) {
    if (!('oriUser' in res.body)) throw new Error('Missing oriUser');
    if (!('containerList' in res.body)) throw new Error('Missing containerList');
    if (!('id' in res.body.containerList[0])) throw new Error('Missing id in containerList');
    if (!('typeCode' in res.body.containerList[0])) throw new Error('Missing id in typeCode');
    if (!('typeName' in res.body.containerList[0])) throw new Error('Missing id in typeName');
}