var express = require('express');
var router = express.Router();
var fs = require("fs");
var keys = require('../config/keys');
var jwt = require('jwt-simple');

var debug = require('debug')('goodtogo_backend:stores');
var validateRequest = require('../models/validateRequest');
var Container = require('../models/DB/containerDB');
var User = require('../models/DB/userDB');

var type;
fs.readFile("./assets/json/containerType.json", 'utf8', function(err, data) {
    if (err) throw err;
    type = JSON.parse(data);
});

/* GET Store list json. */
router.get('/list', function(req, res, next) {
    var obj;
    fs.readFile("./assets/json/stores.json", 'utf8', function(err, data) {
        if (err) throw err;
        obj = JSON.parse(data);
        var date = new Date();
        var payload = { 'iat': Date.now(), 'exp': date.setMinutes(date.getMinutes() + 5) };
        res.header('Authorization', jwt.encode(payload, keys.serverSecretKey()));
        res.json(obj);
    });
});

router.get('/status', validateRequest, function(dbStore, req, res, next) {
    if (dbStore.status)
        return next(dbStore);
    var resJson = {
        containers: type.containers,
        todayData: {
            rent: 1,
            return: 1
        }
    };
    resJson.containers.forEach(function(element) {
        element.amount = 0;
    });
    process.nextTick(function() {
        Container.find({ 'container.conbineTo': dbStore.user.phone }, function(err, container) {
            if (err)
                return next(err);
            if (typeof container !== 'undefined') {
                for (i in container) {
                    if (container[i].container.statusCode !== 1) debug("Something Wrong :" + container[i]);
                    else if (container[i].container.typeCode === 0) resJson['containers'][0]['amount']++;
                    else if (container[i].container.typeCode === 1) resJson['containers'][1]['amount']++;
                }
            }
            var date = new Date();
            var payload = { 'iat': Date.now(), 'exp': date.setMinutes(date.getMinutes() + 5) };
            res.header('Authorization', jwt.encode(payload, keys.serverSecretKey()));
            res.json(resJson);
        });
    });
});

router.get('/getUser/:id', validateRequest, function(dbStore, req, res, next) {
    if (dbStore.status)
        return next(dbStore);
    var id = req.params.id;
    process.nextTick(function() {
        User.findOne({ 'user.phone': new RegExp(id.toString() + '$', "i") }, function(err, user) {
            if (err)
                return next(err);
            if (typeof user !== 'undefined' && user !== null) {
                if (user.role.typeCode === 'customer') {
                    res.status(200).json({ 'phone': user.user.phone, 'apiKey': user.user.apiKey });
                } else {
                    res.status(401).json({ "type": "userSearchingError", "message": "User role is not customer" });
                }
            } else {
                res.status(401).json({ "type": "userSearchingError", "message": "No User: [" + id + "] Finded" });
            }
        });
    });
});

module.exports = router;