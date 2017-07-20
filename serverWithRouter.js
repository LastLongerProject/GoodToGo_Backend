var express = require("express");
var app = express();

function start(reqHandlers){
	app.get('/getStores', function (req, res){
		console.log("Request for /getStores received.");
		reqHandlers.getStores(req, res);
	});
	app.listen(8888, function () {
		console.log('Listening on port 8888!');
	});

	app.use(function(req, res, next) {
		res.status(404).send('Sorry can\'t find that!');
	});
	app.use(function(err, req, res, next) {
		console.error(err.stack);
		res.status(500).send('Something broke!');
	});
}

exports.start = start;