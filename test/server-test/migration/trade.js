const request = require('supertest');
const app = require('../../../app');
const Trade = require('../../../models/DB/tradeDB');

describe('migration', function() {
    before(function(done) {
        setTimeout(done, 8000);
    });

    describe('migrate-trade', function() {
        it('should succeed', function(done) {
            request(app)
            .send('')
            .end(function(err, res) {
                if (err) {
                    console.log(res.body);
                    return done(err);
                }
                Trade.update().exec().then(_ => done()).catch(err => console.log(err));
            });
        });
    });
});