const request = require('supertest');
const app = require('../../app');
const jwt = require('jwt-simple');
const secret = require('../../config/secret_key.json');
const userDB = require('../../models/DB/userDB');
const redis = require('../../models/redis');
const Container = require('../../models/DB/containerDB');

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

describe('app', function() {
    this.slow(5000);
    before(function(done) {
        setTimeout(done, 5000);
    });






    describe('/containers', function() {
        describe('GET /containers/globalUsedAmount', function() {
            it('status code should be 200', function(done) {
                request(app)
                    .get('/containers/globalUsedAmount')
                    .expect(200)
                    .expect(function(res) {
                        res.text;
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

        describe('GET /containers/stock/:id', function() {
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
                        res.body.uri && res.body.token
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
                    .post('/containers/add/99999/0')
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
                            ID: 99999
                        }, (err, res) => {
                            if (err) return console.log(err);
                            console.log(res);
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
                        Array.isArray(res.body.containerType) && res.body.containerDict !== undefined
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

        describe('GET /containers/get/toDelivery', function() {
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
                    .expect(function(res) {
                        res.body.boxID !== undefined && res.body.boxTime !== undefined && res.body.phone !== undefined &&
                            res.body.typeList !== undefined && res.body.containerList !== undefined && res.body.stocking !== undefined &&
                            res.body.isDelivering !== undefined && res.body.containerOverview !== undefined;
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