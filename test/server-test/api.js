const request = require('supertest');
const app = require('../../app');
const jwt = require('jwt-simple');
const secret = require('../../config/secret_key.json');
const userDB = require('../../models/DB/userDB');
const redis = require('../../models/redis');

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

describe('api', function() {
    this.slow(10000);
    before(function(done) {
        setTimeout(done, 5000);
    });

    describe('/users', function() {
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
                        decode.roles.customer !== undefined ||
                            decode.roles.admin !== undefined ||
                            decode.roles.clerk !== undefined;
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

        describe('POST /signup', function() {
            it('should return 205', function(done) {
                request(app)
                    .post('/users/signup')
                    .set('Content-Type', 'application/json')
                    .set('reqID', makeHexString())
                    .set('reqTime', Date.now())
                    .send({
                        phone: '0988888888',
                        password: '',
                    })
                    .expect(205)
                    .end(function(err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        console.log(res.body)
                        done();
                    });
            });

            it('should return a authorization header', function(done) {
                redis.get('user_verifying:' + '0988888888', (err, reply) => {
                    if (err) return done(err);
                    request(app)
                        .post('/users/signup')
                        .set('Content-Type', 'application/json')
                        .set('reqID', makeHexString())
                        .set('reqTime', Date.now())
                        .send({
                            phone: '0988888888',
                            password: '',
                            verification_code: reply,
                        })
                        .expect(200)
                        .end(function(err, res) {
                            if (err) {
                                console.log(res.body);
                                return done(err);
                            }
                            console.log(res.header);
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
                        phone: '0988888888',
                        password: '',
                    })
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        console.log(res.body)

                        // userDB.deleteOne({
                        //         'user.phone': '0988888888',
                        //     },
                        //     (err, res) => {
                        //         if (err) return done(err);
                        //     }
                        // );
                        done();
                    });
            });
        });

        describe('POST /signup/root', function() {
            it('status code should be 200', function(done) {
                let payload = {
                    jti: makeHexString(),
                    iat: Date.now(),
                    exp: Date.now() + 86400000 * 3,
                };

                let auth = jwt.encode(payload, roles.admin.secretKey);
                request(app)
                    .post('/users/signup/root')
                    .set('Authorization', auth)
                    .set('ApiKey', roles.admin.apiKey)
                    .send({
                        phone: '0988888888',
                        password: '',
                    })
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        console.log(res.body)

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

        describe('POST /modifypassword', function() {
            it('status code should be 200', function(done) {
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
                    .end(function(err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        console.log(res.body)
                        done();
                    });
            });
        });

        describe('POST /forgotpassword', function() {
            it('should return 205', function(done) {
                request(app)
                    .post('/users/forgotpassword')
                    .set('Content-Type', 'application/json')
                    .set('reqID', makeHexString())
                    .set('reqTime', Date.now())
                    .send({
                        phone: '0905519292'
                    })
                    .expect(205)
                    .end(function(err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        console.log(res.body);
                        done();
                    });
            });

            it('should return a authorization header', function(done) {
                redis.get('newPass_verifying:' + '0905519292', (err, reply) => {
                    if (err) return done(err);
                    console.log(reply)
                    request(app)
                        .post('/users/forgotpassword')
                        .set('Content-Type', 'application/json')
                        .set('reqID', makeHexString())
                        .set('reqTime', Date.now())
                        .send({
                            phone: '0905519292',
                            new_password: '',
                            verification_code: reply,
                        })
                        .expect(200)
                        .end(function(err, res) {
                            if (err) {
                                console.log(res.body);
                                return done(err);
                            }
                            console.log(res.body);
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

        describe('GET /data', function() {
            it('status code should be 200', function(done) {
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
                    .end(function(err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        done();
                    });
            });
        });

        describe('POST /addbot and /createBotKey', function() {
            it('status code should be 200', function(done) {
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
                        botName: 'test_bot',
                        scopeID: 10,
                    })
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        console.log(res.body)

                        done();
                    });
            });

            it('status code should be 200', function(done) {
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
                        bot: 'test_bot'
                    })
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        console.log(res.body)

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

        describe('POST /subscribeSNS', function() {
            it('status code should be 200', function(done) {

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
                    .end(function(err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        console.log(res.body)

                        done();
                    });
            });
        });

        describe('POST /logout', function() {
            it('status code should be 200', function(done) {
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


    describe('Get data', function() {
        let userapiKey = "";

        describe('Get /getUser/:id', function() {
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
                    .end(function(err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }
                        console.log(res.body)
                        rent_apiKey = res.body.apiKey;
                        done();
                    });
            });
        });

        describe('Get /users/data/:token', function() {
            it('status code should be 200', function(done) {
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
                    .end(function(err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }

                        userapiKey = res.body.apiKey;
                        done();
                    });
            });
        });
    });

    describe('/stores', function() {
        describe('GET /stores/list', function() {
            it('should return 200', function(done) {
                request(app)
                    .get('/stores/list')
                    .set('Content-Type', 'application/json')
                    .set('reqID', makeHexString())
                    .set('reqTime', Date.now())
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
                        console.log(res.body);
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

        describe('POST /stores/layoff/:id', function() {
            it('status code should be 200', function(done) {
                let payload = {
                    jti: makeHexString(),
                    iat: Date.now(),
                    exp: Date.now() + 86400000 * 3,
                };

                let auth = jwt.encode(payload, roles.clerk.secretKey);
                request(app)
                    .post('/stores/layoff/0988888888')
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

        describe('GET /stores/status', function() {
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

        describe.only('GET /stores/favorite', function() {
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
});

function makeHexString() {
    var text = '';
    var possible = 'ABCDEF0123456789';

    for (var i = 0; i < 10; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}