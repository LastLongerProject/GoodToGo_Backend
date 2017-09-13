var express = require('express');
var router = express.Router();
var fs = require("fs");
var crc32 = require('buffer-crc32');
var keys = require('../config/keys');
var jwt = require('jwt-simple');

var debug = require('debug')('goodtogo_backend:stores');
var validateRequest = require('../models/validateRequest');
var Container = require('../models/DB/containerDB');
var User = require('../models/DB/userDB');
var Store = require('../models/DB/storeDB');

var type;
fs.readFile("./assets/json/containerType.json", 'utf8', function(err, data) {
    if (err) throw err;
    type = JSON.parse(data);
});

function wetag(body) {
    if (body.length === 0) {
        // fast-path empty body
        return 'W/"0-0"'
    }
    var buf = Buffer.from(body);
    var len = buf.length
    return 'W/"' + len.toString(16) + '-' + crc32.unsigned(buf) + '"'
};

router.get('/list', function(req, res, next) {
    /*var obj;
    fs.readFile("./assets/json/stores.json", 'utf8', function(err, data) {
        if (err) throw err;
        obj = JSON.parse(data);
        var date = new Date();
        var payload = { 'iat': Date.now(), 'exp': date.setMinutes(date.getMinutes() + 5) };
        var token = jwt.encode(payload, keys.serverSecretKey());
        res.json(obj);
    });*/
    var jsonData = {
        title: "Stores list",
        contract_code_explanation: {
            0: "Only borrowable and returnable",
            1: "Only returnable",
            2: "Borrowable and returnable"
        }
    }
    var tmpArr = [];
    process.nextTick(function() {
        Store.find().exec(function(err, storeList) {
            if (err) next(err);
            var date = new Date();
            var payload = { 'iat': Date.now(), 'exp': date.setMinutes(date.getMinutes() + 5) };
            var token = jwt.encode(payload, keys.serverSecretKey());
            res.set('etag', wetag(storeList));
            for (var i = 0; i < storeList.length; i++) {
                if (storeList[i].active) {
                    var tmpOpening = [];
                    for (var j = 0; j < storeList[i].opening_hours.length; j++)
                        tmpOpening.push({
                            close: storeList[i].opening_hours[j].close,
                            open: storeList[i].opening_hours[j].open
                        })
                    storeList[i].img_info.img_src += ("/" + token);
                    tmpArr.push({
                        id: storeList[i].id,
                        name: storeList[i].name,
                        img_info: storeList[i].img_info,
                        opening_hours: tmpOpening,
                        contract: storeList[i].contract,
                        location: storeList[i].location,
                        address: storeList[i].address,
                        type: storeList[i].type
                    });
                }
            }
            jsonData["shop_data"] = tmpArr;
            res.json(jsonData)
        });
    });
});

router.get('/status', validateRequest, function(dbStore, req, res, next) {
    if (dbStore.status)
        return next(dbStore);
    if (dbStore.role.typeCode !== 'clerk')
        return res.status(403).json({ type: 'storeStatus', message: 'Not Authorized' });
    var resJson = {
        containers: type.containers,
        todayData: {
            rent: 1,
            return: 1
        }
    };
    var date = new Date();
    var payload = { 'iat': Date.now(), 'exp': date.setMinutes(date.getMinutes() + 5) };
    var token = jwt.encode(payload, keys.serverSecretKey());
    resJson.containers.forEach(function(data) {
        data.amount = 2;
        for (var key in data.icon) {
            data.icon[key] = data.icon[key] + "/" + token;
        }
    });
    process.nextTick(function() {
        Container.find({ 'container.conbineTo': dbStore.role.clerk.storeID }, function(err, container) {
            if (err)
                return next(err);
            if (typeof container !== 'undefined') {
                for (i in container) {
                    if (container[i].active) {
                        if (container[i].statusCode !== 1) debug("Something Wrong :" + container[i]);
                        else if (container[i].typeCode === 0) resJson['containers'][0]['amount']++;
                        else if (container[i].typeCode === 1) resJson['containers'][1]['amount']++;
                    }
                }
            }
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