var express = require('express');
var router = express.Router();
var fs = require("fs");

/* GET Store list json. */
router.get('/', function(req, res, next) {
    var obj;
	fs.readFile("./assets/json/stores.json", 'utf8', function (err, data) {
		if (err) throw err;
		obj = JSON.parse(data);
		res.json(obj);
	});
});

module.exports = router;