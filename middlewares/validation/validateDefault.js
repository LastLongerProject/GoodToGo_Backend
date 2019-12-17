const redis = require("../../models/redis");

function iatGetDate(int) {
    var tmp = new Date();
    tmp = tmp.setDate(tmp.getDate() + int);
    return tmp;
}

module.exports = function (req, res, next) {
    var hashID = req.headers['reqid'];
    var reqTime = req.headers['reqtime'];

    if (!hashID || !reqTime)
        return res.status(401).json({
            code: 'A001',
            type: 'validatingDefault',
            message: 'Req Invalid'
        });
    if (reqTime <= iatGetDate(-1) || reqTime >= iatGetDate(1))
        return res.status(401).json({
            code: 'A002',
            type: 'validatingDefault',
            message: 'Req Expired'
        });
    redis.get('reply_check:' + hashID + ':' + reqTime, (err, reply) => {
        if (reply !== null) {
            return res.status(401).json({
                code: 'Z004',
                type: 'security',
                message: 'Token reply'
            });
        } else {
            redis.setex('reply_check:' + hashID + ':' + reqTime, 60 * 60 * 25, 0, (err, reply) => {
                if (err) return next(err);
                if (reply !== 'OK') return next(reply);
                next();
            });
        }
    });
};