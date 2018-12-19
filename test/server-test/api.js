const request = require('supertest');
const app = require('../../app');
const jwt = require('jwt-simple');
const secret = require('../../config/secret_key.json');
var typeList = [];
var roles = {};

describe('api', function() {
    this.slow(10000);
    beforeEach(function() {});

    describe('/users', function() {
        describe.only('POST /users/login', function() {
            it('respond in json with roles', function(done) {
                request(app)
                    .post('/users/login')
                    .set('Content-Type', 'application/json')
                    .set('reqID', '0905519292')
                    .set('reqTime', Date.now())
                    .send({
                        phone: '0905519292',
                        password: '',
                    })
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            console.log(res.body);
                            return done(err);
                        }

                        let decode = jwt.decode(res.header.authorization, secret.text);
                        typeList = decode.roles.typeList;
                        delete decode.roles.typeList;
                        roles = decode.roles;
                        console.log(roles.customer);
                        done();
                    });
            });
        });
    });

    describe('POST /users/logout', function() {
        it('status code should be 200', function(done) {
            request(app).post('/users/logout').set('Authorization');
        });
    });
});