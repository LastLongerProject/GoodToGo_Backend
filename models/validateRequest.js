var jwt = require('jwt-simple');
var User = require('../models/DB/userDB'); // load up the user model
var validateUser = require('../config/keys').validateUser;
 
module.exports = function(req, res, next) {
 
  var jwtToken = req.headers['Authorization'];
  var key = req.body.apiKey;
 
  if (jwtToken && key) {
    try {
      var dbUser = validateUser(key, next); // The key would be the logged in user's username
      if (!dbUser) {
        // No user with this name exists, respond back with a 401
        res.status(401);
        res.json({
          "status": 401,
          "message": "Invalid User"
        });
        return;
      }

      var decoded = jwt.decode(jwtToken, dbUser.secretKey);
      if (decoded.exp <= Date.now()) {
        res.status(400);
        res.json({
          "status": 400,
          "message": "Token Expired"
        });
        return;
      }
 
      // Authorize the user to see if s/he can access our resources
      if (dbUser) {
        if ((req.url.indexOf('admin') >= 0 && dbUser.role == 'admin') || (req.url.indexOf('admin') < 0 && req.url.indexOf('/api/v1/') >= 0)) {
          next(); // To move to next middleware
        } else {
          res.status(403);
          res.json({
            "status": 403,
            "message": "Not Authorized"
          });
          return;
        }
      }
    } catch (err) {
      res.status(500);
      res.json({
        "status": 500,
        "message": "Oops something went wrong",
        "error": err
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