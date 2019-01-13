const request = require('supertest');
const app = require('../app');
const jwt = require('jwt-simple');
const secret = require('../config/secret_key.json');
const Trade = require('../models/DB/tradeDB');
const redis = require('../models/redis');
const makeHexString = require('./server-test/tool.js').makeHexString;


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

describe.only('other - trans data format in db', function() {
    before(function(done) {
        setTimeout(done, 5000);
    });
    it('should trans succeed', function(done) {
        request(app)
                .post('/users/login')
                .set('Content-Type', 'application/json')
                .set('reqID', makeHexString())
                .set('reqTime', Date.now())
                .send({
                    phone: '0955555555',
                    password: '',
                })
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    
                    Trade.find({ 'container.box': '"11104"' }).exec()
                    .then(list => {
                        let arr = [];
                        console.log(list);
                        for (let element of list) {
                            console.log(element.container.box)
                            element.container.box = parseInt(element.container.box);
                            arr.push(element.save());
                        }
                        Promise.all(arr).then(res => {
                            console.log(res);
                            done();
                        })
                    }).catch(err => {
                        return done(err);
                    });
                });
        
    });
});