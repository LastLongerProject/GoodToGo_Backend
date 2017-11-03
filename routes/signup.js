var express = require('express');
var router = express.Router();
var validateRequest = require('../models/validateRequest').JWT;
var regAsStoreManager = require('../models/validateRequest').regAsStoreManager;

router.post('/', function(req, res, next) {
    req._permission = false;
    req.body['active'] = true; // !!! Need to send by client when need purchasing !!!
    req.app.get('passport').authenticate('local-signup', function(err, user, info) {
        if (err) {
            return next(err); // will generate a 500 error
        }
        // Generate a JSON response reflecting authentication status
        if (!user) {
            return res.status(403).json(info);
        }
        req.login(user, { session: false }, Err => {
            if (Err) return next(Err);
            res.header('Authorization', info.headers.Authorization);
            res.json(info.body);
            return;
        });
    })(req, next);
});

router.post('/clerk', regAsStoreManager, validateRequest, function(dbUser, req, res, next) {
    if (dbUser.status)
        return next(dbUser);
    req._permission = true;
    req.body['role'] = {
        typeCode: "clerk",
        manager: false,
        storeID: dbUser.role.storeID
    };
    req.body['active'] = true;
    req.app.get('passport').authenticate('local-signup', function(err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(403).json(info);
        }
        req.login(user, { session: false }, Err => {
            if (Err) return next(Err);
            res.header('Authorization', info.headers.Authorization);
            res.json(info.body);
            return;
        });
    })(req, next);
});

module.exports = router;