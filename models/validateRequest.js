var jwt = require('jwt-simple');
var User = require('../models/DB/userDB'); // load up the user model
var validateUser = require('../config/keys').validateUser;
var logging = require('../models/loggingQuery').withAuth;

function validateURL(req, res, next, dbUser) { // Authorize the user to see if s/he can access our resources
	if (dbUser) {
					if (((req.url.indexOf('/logout') >= 0 || req.url.indexOf('/data') >= 0 || req.url.indexOf('/rent') >= 0 || req.url.indexOf('/return') >= 0) && dbUser.role.typeCode === 'customer') ||
						((req.url.indexOf('/rent') >= 0 || req.url.indexOf('/return') >= 0 || req.url.indexOf('/status') >= 0 || req.url.indexOf('/getUser') >= 0) && dbUser.role.typeCode === 'clerk')) {
						next(dbUser); // To move to next middleware
					} else {
						res.status(403);
						res.json({
							"status": 403,
							"message": "Not Authorized"
						});
					return;
		}
	}
}

function iatGetDate(int) {
	var tmp = new Date();
	tmp = tmp.setDate(tmp.getDate() + int);
	return tmp;
}
 
module.exports = function(req, res, next, targetKey = null) {

	var jwtToken = req.headers['authorization'];
	var key = targetKey || req.headers['apikey'];

	if (jwtToken && key) {
		try {
			validateUser(key, next, function(dbUser){  // The key would be the logged in user's username
				if (typeof dbUser === 'undefined' || dbUser === null) {
				// No user with this name exists, respond back with a 401
					res.status(401);
					res.json({
						"status": 401,
						"message": "Invalid User"
					});
					return;
				}

				if (targetKey === null){
					var decoded;
					try {
						decoded = jwt.decode(jwtToken, dbUser.user.secretKey);
					} catch(err) {
						throw err;
					}
					logging(req, res, decoded, function(err){
						if (typeof err !== 'undefined' && err !== null){
							res.status(500);
							res.json({
								"status": 500,
								"message": "Oops something went wrong",
								"error": err.toString()
							});
						}
						if (typeof decoded.exp === 'undefined' || typeof decoded.iat === 'undefined'  || typeof decoded.jti === 'undefined'){
							return res.status(401).json({"status": 401, "message": "Token Invalid" });
						}
						if (decoded.exp <= Date.now() || decoded.iat >= iatGetDate(7) || decoded.iat <= iatGetDate(-7)) {
							return res.status(400).json({"status": 400, "message": "Token Expired" });
						}
						validateURL(req, res, next, dbUser);
					});
				} else {
					validateURL(req, res, next, dbUser);
				}
			});
		} catch (err) {
			res.status(500);
			res.json({
				"status": 500,
				"message": "Oops something went wrong",
				"error": err.toString()
			});
		}
	} else {
		res.status(401);
		res.json({
			"status": 401,
			"message": "Invalid Request"
		});
		return;
	}
};