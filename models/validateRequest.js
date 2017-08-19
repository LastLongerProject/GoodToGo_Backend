var jwt = require('jwt-simple');
var User = require('../models/DB/userDB'); // load up the user model
var validateUser = require('../config/keys').validateUser;
var logging = require('../models/loggingQuery').withAuth;
var loggingERR = require('../models/loggingQuery').withoutAuth;

function validateURL(req, res, next, dbUser) { // Authorize the user to see if s/he can access our resources
	if (dbUser) {
		if (((req.url.indexOf('/logout') >= 0 || req.url.indexOf('/data') >= 0 || req.url.indexOf('/rent') >= 0 || req.url.indexOf('/return') >= 0) && dbUser.role.typeCode === 'customer') ||
				((req.url.indexOf('/rent') >= 0 || req.url.indexOf('/return') >= 0 || req.url.indexOf('/status') >= 0 || req.url.indexOf('/getUser') >= 0) && dbUser.role.typeCode === 'clerk')) {
					next(dbUser); // To move to next middleware
		} else {
			res.status(403).json({type: 'validatingUser', message: 'Not Authorized'});
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
	console.log('1');
	var jwtToken = req.headers['authorization'];
	var key = targetKey || req.headers['apikey'];

	if (jwtToken && key) {
		validateUser(key, next, function(dbUser){  // The key would be the logged in user's username
			if (typeof dbUser === 'undefined' || dbUser === null) {
			// No user with this name exists, respond back with a 401
				res.status(401).json({type: 'validatingUser', message: 'Invalid User'});
				return;
			}
			console.log('2');
			if (targetKey === null){
			console.log('3');
				var decoded;
				try {
					decoded = jwt.decode(jwtToken, dbUser.user.secretKey);
				} catch(err) {	}
				logging(req, res, decoded, function(err){
					console.log('4');
					if (typeof err === 'undefined' && err === null){ return next(err); }
					else if (typeof decoded.exp === 'undefined'){
						return res.status(401).json({type: 'validatingUser', message: 'Token Invalid'});
					} else if (decoded.exp <= Date.now() || decoded.iat >= iatGetDate(7) || decoded.iat <= iatGetDate(-7)) {
						return res.status(400).json({type: 'validatingUser', message: 'Token Expired'});
					}
					validateURL(req, res, next, dbUser);
				});
			} else {
			console.log('4');
				validateURL(req, res, next, dbUser);
			}
		});
	} else {
		loggingERR(req, res, function(err){
			return next(err);
		});
	}
};