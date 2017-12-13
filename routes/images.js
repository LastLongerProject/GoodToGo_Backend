var express = require('express');
var router = express.Router();
var fs = require('fs');

var validateToken = require('../models/validateToken');

router.get('/:id/:a.:b.:c', function(req, res, next) {
    var token = req.params.a + "." + req.params.b + "." + req.params.c;
    validateToken(req, res, token, function() {
        var id = req.params.id;
        var s = fs.createReadStream('./assets/images/' + id + '.jpg');
        s.on('open', function() {
            res.set('Content-Type', 'image/jpeg');
            s.pipe(res);
        });
        s.on('error', function(err) {
            var s2 = fs.createReadStream('./assets/images/99.jpg');
            s2.on('open', function() {
                res.set('Content-Type', 'image/jpeg');
                s2.pipe(res);
            });
        });
    });
});

router.get('/icon/:id/:a.:b.:c', function(req, res, next) {
    var token = req.params.a + "." + req.params.b + "." + req.params.c;
    validateToken(req, res, token, function() {
        var id = req.params.id;
        var s = fs.createReadStream('./assets/images/icon/' + id + '.png');
        s.on('open', function() {
            res.set('Content-Type', 'image/png');
            s.pipe(res);
        });
        s.on('error', function(err) {
            res.status(500).json({ code: 'G001', type: 'readImgERR', message: 'No Image found', data: err });
        });
    });
});

module.exports = router;