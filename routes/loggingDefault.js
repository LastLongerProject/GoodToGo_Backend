var logging = require('../models/loggingQuery').withoutAuth;

module.exports = function(req, res, next) {
	if (typeof req.headers['authorization'] === 'undefined'){
		logging(req, res, function(err){
			if (typeof err !== 'undefined' && err !== null){
				res.status(500);
				res.json({
					"status": 500,
					"message": "Oops something went wrong",
					"error": err.toString()
				});
			}
			else {
				next();
			}
		});
	} else{
		next();
	}
};