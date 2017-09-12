var express = require('express');
var router = express.Router();
var fs = require('fs');

var debug = require('debug')('goodtogo_backend:images');
var validateRequest = require('../models/validateRequest');

router.get('/:id', function(req, res) {
	var id = req.params.id;
    // debug("Redirect to official website.");
    fs.readFile('./assets/images/' + id + '.jpg', function(err, data) {
	    res.writeHead(200, {'Content-Type': 'image/jpeg'});
	    res.end(data);
	});
});

module.exports = router;