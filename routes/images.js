var express = require('express');
var router = express.Router();
var fs = require('fs');

const ROOT_DIR = require("../config/config").staticFileDir;
var intReLength = require('@lastlongerproject/toolkit').intReLength;
var validateToken = require('../middlewares/validation/validateToken');
var CouponType = require('../models/DB/couponTypeDB');

router.get('/store/:id/:a.:b.:c', function (req, res, next) {
    var token = req.params.a + "." + req.params.b + "." + req.params.c;
    validateToken(req, res, token, function () {
        var id = intReLength(parseInt(req.params.id), 5);
        var s = fs.createReadStream(ROOT_DIR + '/assets/images/shop/' + id + '.jpg');
        s.on('open', function () {
            res.set('Content-Type', 'image/jpeg');
            s.pipe(res);
        });
        s.on('error', function (err) {
            var s2 = fs.createReadStream(ROOT_DIR + '/assets/images/shop/99999.jpg');
            s2.on('open', function () {
                res.set('Content-Type', 'image/jpeg');
                s2.pipe(res);
            });
            s2.on('error', function (err) {
                res.status(500).json({
                    code: 'G001',
                    type: 'readImgERR',
                    message: 'No Image found',
                    data: err
                });
            });
        });
    });
});

router.get('/icon/:id/:a.:b.:c', function (req, res, next) {
    var token = req.params.a + "." + req.params.b + "." + req.params.c;
    validateToken(req, res, token, function () {
        var id = req.params.id;
        var s = fs.createReadStream(ROOT_DIR + '/assets/images/icon/' + id + '.png');
        s.on('open', function () {
            res.set('Content-Type', 'image/png');
            s.pipe(res);
        });
        s.on('error', function (err) {
            var s2 = fs.createReadStream(ROOT_DIR + '/assets/images/icon/99' + id.slice(2) + '.png');
            s2.on('open', function () {
                res.set('Content-Type', 'image/png');
                s2.pipe(res);
            });
            s2.on('error', function (err) {
                res.status(500).json({
                    code: 'G001',
                    type: 'readImgERR',
                    message: 'No Image found',
                    data: err
                });
            });
        });
    });
});

router.get('/coupon/:id/:a.:b.:c', function (req, res, next) {
    const token = req.params.a + "." + req.params.b + "." + req.params.c;
    validateToken(req, res, token, function () {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next();
        CouponType.findOne({
            "couponTypeID": id
        }, (err, theCouponType) => {
            if (err) return next(err);
            if (!theCouponType) return next();
            const s = fs.createReadStream(ROOT_DIR + '/assets/images/coupon/' + theCouponType.img_info.img_src);
            s.on('open', function () {
                res.set('Content-Type', 'image/png');
                s.pipe(res);
            });
            s.on('error', function (err) {
                const s2 = fs.createReadStream(ROOT_DIR + '/assets/images/coupon/9999.jpg');
                s2.on('open', function () {
                    res.set('Content-Type', 'image/png');
                    s2.pipe(res);
                });
                s2.on('error', function (err) {
                    next({
                        status: 500,
                        code: 'G001',
                        type: 'readImgERR',
                        message: 'No Image found',
                        data: err
                    });
                });
            });
        });
    });
});

module.exports = router;