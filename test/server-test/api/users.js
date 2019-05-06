const request = require('supertest');
const app = require('../../../app');
const jwt = require('jwt-simple');
const secret = require('../../../config/secret_key.json');
const userDB = require('../../../models/DB/userDB');
const UserKey = require('../../../models/DB/userKeysDB');
const redis = require('../../../models/redis');
const makeHexString = require('../tool.js').makeHexString;

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

describe('api-users', function () {
    this.slow(1000);

    before(function (done) {
        setTimeout(done, 11000);
    });
    describe.only('POST /login', function () {
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
                    if (!('customer' || 'admin' || 'clerk' in decode.roles)) throw new Error("Missing roles");
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

    describe('POST /signup', function () {
        it('should return 205', function (done) {
            request(app)
                .post('/users/signup')
                .set('Content-Type', 'application/json')
                .set('reqID', makeHexString())
                .set('reqTime', Date.now())
                .send({
                    phone: '0977777777',
                    password: '',
                })
                .expect(205)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });

        it('should return a authorization header', function (done) {
            redis.get('user_verifying:' + '0988888888', (err, reply) => {
                if (err) return done(err);
                request(app)
                    .post('/users/signup')
                    .set('Content-Type', 'application/json')
                    .set('reqID', makeHexString())
                    .set('reqTime', Date.now())
                    .send({
                        phone: '0977777777',
                        password: '',
                        verification_code: reply,
                    })
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        userDB.deleteOne({
                            'user.phone': '0988888888',
                        },
                            (err, res) => {
                                if (err) return done(err);
                            }
                        );
                        done();
                    });
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

            let auth = jwt.encode(payload, roles.clerk.secretKey);
            request(app)
                .post('/users/signup/clerk')
                .set('Authorization', auth)
                .set('ApiKey', roles.clerk.apiKey)
                .send({
                    phone: '0999999999',
                    password: '',
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }

                    userDB.deleteOne({
                        'user.phone': '0999999999',
                    },
                        (err, res) => {
                            if (err) return done(err);
                        }
                    );
                    done();
                });
        });
    });

    describe.only('POST /signup/storeManager', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .post('/users/signup/storeManager')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .send({
                    phone: '0953725351',
                    password: '',
                    storeID: 25
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

    describe('POST /signup/root', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles['clerk_沒活動'].secretKey);
            request(app)
                .post('/users/signup/root')
                .set('Authorization', auth)
                .set('ApiKey', roles['clerk_沒活動'].apiKey)
                .send({
                    phone: '0977777777',
                    password: '',
                })
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }

                    userDB.deleteOne({
                        'user.phone': '0977777777',
                    },
                        (err, res) => {
                            if (err) return done(err);
                        }
                    );
                    done();
                });
        });
    });

    describe('GET /data', function () {
        it('status code should be 200 and correct keys', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.customer.secretKey);
            request(app)
                .get('/users/data')
                .set('Authorization', auth)
                .set('ApiKey', roles.customer.apiKey)
                .expect(200)
                .expect(checkUserDataKeys)
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
    describe('Get data', function () {
        let userapiKey = "";

        describe('Get /stores/getUser/:id', function () {
            it('status code should be 200', function (done) {
                let payload = {
                    jti: makeHexString(),
                    iat: Date.now(),
                    exp: Date.now() + 86400000 * 3,
                };

                let auth = jwt.encode(payload, roles.clerk.secretKey);
                request(app)
                    .get('/stores/getUser/0911789727')
                    .set('Authorization', auth)
                    .set('ApiKey', roles.clerk.apiKey)
                    .expect(200)
                    .expect(function (res) {
                        if (!('phone' in res.body)) throw new Error('Missing phone');
                        if (!('apiKey' in res.body)) throw new Error('Missing apiKey');
                    })
                    .end(function (err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        rent_apiKey = res.body.apiKey;
                        done();
                    });
            });
        });

        describe('Get /users/data/:token', function () {
            it('status code should be 200', function (done) {
                let payload = {
                    jti: makeHexString(),
                    iat: Date.now(),
                    exp: Date.now() + 86400000 * 3,
                };

                let auth = jwt.encode(payload, roles.clerk.secretKey);
                request(app)
                    .get('/users/data/' + userapiKey)
                    .set('Authorization', auth)
                    .set('ApiKey', roles.clerk.apiKey)
                    .expect(200)
                    .expect(checkUserDataKeys)
                    .end(function (err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        console.log(res.body)

                        userapiKey = res.body.apiKey;
                        done();
                    });
            });
        });
    });
    describe('POST /addbot and /createBotKey', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .post('/users/addbot')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .send({
                    botName: 'bot00004',
                    scopeID: 999,
                })
                .expect(200)
                .expect(function (res) {
                    if (!('keys' in res.body)) throw new Error("Missing keys");
                    if (!('apiKey' in res.body.keys)) throw new Error("Missing apiKey in keys");
                    if (!('secretKey' in res.body.keys)) throw new Error("Missing secretKey in keys");
                })
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    console.log(res.body);
                    done();
                });
        });

        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .post('/users/createBotKey')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .send({
                    bot: 'bot00004'
                })
                .expect(200)
                .expect(function (res) {
                    if (!('keys' in res.body)) throw new Error("Missing keys");
                    if (!('apiKey' in res.body.keys)) throw new Error("Missing apiKey in keys");
                    if (!('secretKey' in res.body.keys)) throw new Error("Missing secretKey in keys");
                })
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    userDB.deleteOne({
                        'user.name': 'test_bot',
                    },
                        (err, res) => {
                            if (err) return done(err);
                        }
                    );
                    done();
                });
        });
    });

    describe('POST /subscribeSNS', function () {
        it('status code should be 200', function (done) {

            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .post('/users/subscribeSNS')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .send({
                    appType: 'customer',
                    deviceToken: "<6722aa1e 721f63e6 830a68c4 d2564b38 4e616d70 83f5fd3d 46cbb5d4 fc16adc4>",
                    system: "ios"
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

    describe('POST /modifypassword', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.customer.secretKey);
            request(app)
                .post('/users/modifypassword')
                .set('Authorization', auth)
                .set('ApiKey', roles.customer.apiKey)
                .send({
                    oriPassword: '',
                    newPassword: '',
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

    describe('POST /forgotpassword', function () {
        it('should return 205', function (done) {
            request(app)
                .post('/users/forgotpassword')
                .set('Content-Type', 'application/json')
                .set('reqID', makeHexString())
                .set('reqTime', Date.now())
                .send({
                    phone: '0988888887'
                })
                .expect(205)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    done();
                });
        });

        it('should return a authorization header', function (done) {
            redis.get('newPass_verifying:' + '0988888887', (err, reply) => {
                if (err) return done(err);
                request(app)
                    .post('/users/forgotpassword')
                    .set('Content-Type', 'application/json')
                    .set('reqID', makeHexString())
                    .set('reqTime', Date.now())
                    .send({
                        phone: '0988888887',
                        new_password: '',
                        verification_code: reply,
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
    });

    describe.skip('POST /logout', function () {
        it('status code should be 200', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.customer.secretKey);
            request(app)
                .post('/users/logout')
                .set('Authorization', auth)
                .set('ApiKey', roles.customer.apiKey)
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
});

function checkUserDataKeys(res) {
    if (!('usingAmount' in res.body)) throw new Error('Missing usingAmount');
    if (!('data' in res.body)) throw new Error('Missing data');
    if (!('globalAmount' in res.body)) throw new Error('Missing globalAmount');

    if (!('container' in res.body.data[0])) throw new Error('Missing container in data');
    if (!('time' in res.body.data[0])) throw new Error('Missing time in data');
    if (!('returned' in res.body.data[0])) throw new Error('Missing returned in data');
    if (!('type' in res.body.data[0])) throw new Error('Missing type in data');
    if (!('store' in res.body.data[0])) throw new Error('Missing store in data');
}