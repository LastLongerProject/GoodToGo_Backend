const request = require('supertest');
const app = require('../../../app');
const jwt = require('jwt-simple');
const secret = require('../../../config/secret_key.json');
const Box = require('../../../models/DB/boxDB');

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

describe('api-deliveryList', function () {

    before(function (done) {
        setTimeout(done, 10000);
    });

    describe.only('POST /login', function () {
        it('should response in json with roles', function (done) {
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

    describe('POST /create/:storeID', function () {

        it('status code should be 200 and with correct keys', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);

            request(app)
                .post('/deliveryList/create/17')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .send({
                    phone: "0900000000",
                    boxList: [{
                        boxName: "test_4",
                        boxOrderContent: [{
                            containerType: "16oz 玻璃杯",
                            amount: 4
                        }],
                        dueDate: Date.now()
                    }]
                })
                .expect(200)
                .expect(function (res) {
                    if (!('boxIDs' in res.body)) throw new Error('missing boxIDs')
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
    describe('POST /box', function () {
        it('status code should be 200 and with correct keys', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            Box.findOne({
                boxName: "test_2"
            }).exec()
                .then(box => {
                    console.log(box)
                    request(app)
                        .post('/deliveryList/box')
                        .set('Authorization', auth)
                        .set('ApiKey', roles.admin.apiKey)
                        .send({
                            phone: "0900000000",
                            boxList: [{
                                ID: box.boxID,
                                containerList: [99990, 99989, 99988, 99987],
                                comment: "test"
                            }]
                        })
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                console.log(res.body);
                                return done(err);
                            }
                            done();
                        })

                })
                .catch(err => {
                    console.log(err);
                    done();
                });
        });
    });

    describe('POST /stock', function () {
        it('status code should be 200 and with correct keys', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .post('/deliveryList/stock')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .send({
                    phone: "0900000000",
                    boxList: [{
                        boxName: 'test',
                        containerList: ["99999"]
                    }]
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

    describe.only('POST /changeState', function () {
        it('status code should be 200 and with correct keys', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .post('/deliveryList/changeState')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .send({
                    phone: "0900000000",
                    boxList: [{
                        id: 21914321,
                        newState: "Stocked",
                    }]
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

    describe('POST /sign', function () {
        it('status code should be 200 and with correct keys', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .post('/deliveryList/sign')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .send({
                    phone: "0900000000",
                    boxList: [{
                        ID: 21914280
                    }]
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

    describe('GET /box/list', function () {
        it('status code should be 200 and with correct keys', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/deliveryList/box/list')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(checkBoxListKeys)
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

    describe('GET /box/list/:status', function () {
        it('status code should be 200 and with correct keys', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .get('/deliveryList/box/list/Delivering')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .expect(200)
                .expect(checkBoxListKeys)
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

    describe('PATCH /modifyBoxInfo', function () {
        it('status code should be 200 and with correct keys', function (done) {
            let payload = {
                jti: makeHexString(),
                iat: Date.now(),
                exp: Date.now() + 86400000 * 3,
            };

            let auth = jwt.encode(payload, roles.admin.secretKey);
            request(app)
                .patch('/deliveryList/modifyBoxInfo/11800231')
                .set('Authorization', auth)
                .set('ApiKey', roles.admin.apiKey)
                .send({
                    boxName: 'test',
                    storeID: 17,
                    boxDeliverContent: [{
                        containerType: 0,
                        amount: 1
                    },
                    {
                        containerType: 9,
                        amount: 1
                    }
                    ],
                    containerList: [99999, 7424]
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

function checkBoxListKeys(res) {
    let list = res.body;
    for (let key in list) {
        if (!('storeID' in list[key])) return new Error('Missing storeID');
        if (!('boxObjs' in list[key])) return new Error('Missing boxObjs');
    }
}