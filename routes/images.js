var express = require('express');
var router = express.Router();
var fs = require('fs');

var debug = require('debug')('goodtogo_backend:images');
var validateRequest = require('../models/validateRequest');

router.get('/:id', function(req, res) {
    var id = req.params.id;
    var s = fs.createReadStream('./assets/images/' + id + '.jpg');
    s.on('open', function() {
        res.set('Content-Type', 'image/jpeg');
        s.pipe(res);
    });
    s.on('error', function() {
        res.set('Content-Type', 'text/plain');
        res.status(404).end('Not found');
    });
});

router.get('/icon/:id', function(req, res) {
    var id = req.params.id;
    var s = fs.createReadStream('./assets/images/icon/' + id + '.png');
    s.on('open', function() {
        res.set('Content-Type', 'image/png');
        s.pipe(res);
    });
    s.on('error', function() {
        res.set('Content-Type', 'text/plain');
        res.status(404).end('Not found');
    });
});

module.exports = router;