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

    describe('/users', function() {
        describe.only('POST /users/login', function() {
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

        describe('POST /users/signup', function() {
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
                        done();
                    });
            });

            it('must return a authorization header', function(done) {
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

        describe('POST /users/signup/clerk', function() {
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

        describe.only('POST /users/modifypassword', function() {
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
                        done();
                    });
            });
        });

        describe('POST /users/logout', function() {
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
});

function makeHexString() {
    var text = '';
    var possible = 'ABCDEF0123456789';

    for (var i = 0; i < 10; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}