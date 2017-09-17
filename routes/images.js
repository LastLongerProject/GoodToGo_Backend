var express = require('express');
var router = express.Router();
var fs = require('fs');

var validateToken = require('../models/validateToken');
/*
router.get('/:id', function(req, res, next) {
    var id = req.params.id;
    var s = fs.createReadStream('./assets/images/' + id + '.jpg');
    s.on('open', function() {
        res.set('Content-Type', 'image/jpeg');
        s.pipe(res);
    });
    s.on('error', function() {
        res.status(404).json({ type: 'readImgERR', message: 'No Image found' });
    });
});

router.get('/icon/:id', function(req, res, next) {
    var id = req.params.id;
    var s = fs.createReadStream('./assets/images/icon/' + id + '.png');
    s.on('open', function() {
        res.set('Content-Type', 'image/png');
        s.pipe(res);
    });
    s.on('error', function() {
        res.status(404).json({ type: 'readImgERR', message: 'No Image found' });
    });
});
*/
router.get('/:id/:a.:b.:c', function(req, res, next) {
    var token = req.params.a + "." + req.params.b + "." + req.params.c;
    validateToken(req, res, token, function(err) {
        if (err.status) return next(err);
        var id = req.params.id;
        var s = fs.createReadStream('./assets/images/' + id + '.jpg');
        s.on('open', function() {
            res.set('Content-Type', 'image/jpeg');
            s.pipe(res);
        });
        s.on('error', function() {
            res.status(404).json({ type: 'readImgERR', message: 'No Image found' });
        });
    });
});

router.get('/icon/:id/:a.:b.:c', function(req, res, next) {
    var token = req.params.a + "." + req.params.b + "." + req.params.c;
    validateToken(req, res, token, function(err) {
        if (err.status) return next(err);
        var id = req.params.id;
        var s = fs.createReadStream('./assets/images/icon/' + id + '.png');
        s.on('open', function() {
            res.set('Content-Type', 'image/png');
            s.pipe(res);
        });
        s.on('error', function() {
            res.status(404).json({ type: 'readImgERR', message: 'No Image found' });
        });
    });
});

module.exports = router;