var express = require('express');
var router = express.Router();
var fs = require("fs");
var jwt = require('jwt-simple');
var debug = require('debug')('goodtogo_backend:stores');

var keys = require('../config/keys');
var wetag = require('../models/toolKit').wetag;
var intReLength = require('../models/toolKit').intReLength;
var dateCheckpoint = require('../models/toolKit').dateCheckpoint;

var validateRequest = require('../models/validateRequest');
var Container = require('../models/DB/containerDB');
var User = require('../models/DB/userDB');
var Store = require('../models/DB/storeDB');
var Trade = require('../models/DB/tradeDB');

var type;
fs.readFile("./assets/json/containerType.json", 'utf8', function(err, data) {
    if (err) throw err;
    type = JSON.parse(data);
});

router.get('/list', function(req, res, next) {
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
                        // storeList[i].img_info.img_src += ("/" + token);
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
    var tmpArr = [];
    var date = new Date();
    var payload = { 'iat': Date.now(), 'exp': date.setMinutes(date.getMinutes() + 5) };
    var token = jwt.encode(payload, keys.serverSecretKey());
    for (var i = 0; i < type.containers.length; i++) {
        var tmpIcon = {};
        for (var key in type.containers[i].icon) {
            tmpIcon[key] = type.containers[i].icon[key] /* + "/" + token*/ ;
        }
        tmpArr.push({
            typeCode: type.containers[i].typeCode,
            name: type.containers[i].name,
            amount: 0,
            version: type.containers[i].version,
            icon: tmpIcon
        });
    }
    var resJson = {
        containers: tmpArr,
        todayData: {
            rent: 0,
            return: 0
        }
    };
    process.nextTick(function() {
        Container.find({ 'conbineTo': dbStore.role.clerk.storeID }, function(err, containers) {
            if (err) return next(err);
            Trade.find({ 'tradeTime': { '$gte': dateCheckpoint(0), '$lt': dateCheckpoint(1) } }, function(err, trades) {
                if (err) return next(err);
                if (typeof containers !== 'undefined') {
                    for (var i in containers) {
                        if (containers[i].statusCode !== 1 || !containers[i].active) debug("Something Wrong :" + JSON.stringify(containers[i]));
                        else {
                            for (var j in type.containers) {
                                tmpTypeCode = type.containers[j].typeCode;
                                if (containers[i].typeCode === tmpTypeCode) {
                                    resJson['containers'][tmpTypeCode]['amount']++;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (typeof trades !== 'undefined') {
                    for (var i in trades) {
                        if (trades[i].tradeType.action === 'Rent' && trades[i].oriUser.storeID === dbStore.role.clerk.storeID)
                            resJson['todayData']['rent']++;
                        else if (trades[i].tradeType.action === 'Return' && trades[i].newUser.storeID === dbStore.role.clerk.storeID)
                            resJson['todayData']['return']++;
                    }
                }
                res.json(resJson);
            });
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

router.get('/history', validateRequest, function(dbStore, req, res, next) {
    process.nextTick(function() {
        Trade.find({
            'tradeTime': { '$gte': dateCheckpoint(-6), '$lt': dateCheckpoint(1) },
            'tradeType.action': 'Rent',
            'oriUser.storeID': dbStore.role.clerk.storeID
        }, function(err, rentTrades) {
            Trade.find({
                'tradeTime': { '$gte': dateCheckpoint(-6), '$lt': dateCheckpoint(1) },
                'tradeType.action': 'Return',
                'newUser.storeID': dbStore.role.clerk.storeID
            }, function(err, returnTrades) {
                if (typeof rentTrades !== 'undefined' && typeof returnTrades !== 'undefined') {
                    parseHistory(rentTrades, 'Rent', function(parsedRent) {
                        resJson = {
                            rentHistory: {
                                amount: parsedRent.length,
                                dataList: parsedRent
                            }
                        };
                        parseHistory(returnTrades, 'Return', function(parsedReturn) {
                            resJson.returnHistory = {
                                amount: parsedReturn.length,
                                dataList: parsedReturn
                            }
                            res.json(resJson);
                        });
                    });
                }
            });
        });
    });
});

router.get('/favorite', validateRequest, function(dbStore, req, res, next) {
    process.nextTick(function() {
        Trade.find({
            'tradeType.action': 'Rent',
            'oriUser.storeID': dbStore.role.clerk.storeID
        }, function(err, rentTrades) {
            if (typeof rentTrades !== 'undefined') {
                getFavorite(rentTrades, function(userList) {
                    resJson = {};
                    resJson.userList = userList;
                    res.json(resJson);
                });
            }
        });
    });
});

function parseHistory(data, dataType, callback) {
    if (data.length === 0) return callback([]);
    data.sort(function(a, b) { return b.tradeTime - a.tradeTime });
    byOrderArr = [];
    tmpContainerList = [];
    tmpContainerList.unshift('#' + intReLength(data[0].container.id, 3));
    for (var i = 1; i < data.length; i++) {
        aHistory = data[i];
        lastHistory = data[i - 1];
        if (dataType === 'Rent') {
            var thisPhone = aHistory.newUser.phone;
            var lastPhone = lastHistory.newUser.phone;
        } else if (dataType === 'Return') {
            var thisPhone = aHistory.oriUser.phone;
            var lastPhone = lastHistory.oriUser.phone;
        }
        if ((lastHistory.tradeTime - aHistory.tradeTime) > 1000 || lastPhone !== thisPhone) {
            phoneFormatted = lastPhone.slice(0, 4) + "-***-" + lastPhone.slice(7, 10);
            byOrderArr.push({
                time: lastHistory.tradeTime,
                phone: phoneFormatted,
                containerAmount: tmpContainerList.length,
                containerList: tmpContainerList
            });
            tmpContainerList = [];
        }
        tmpContainerList.push('#' + intReLength(aHistory.container.id, 3) + " | " + type.containers[aHistory.container.typeCode].name);
    }
    phoneFormatted = thisPhone.slice(0, 4) + "-***-" + thisPhone.slice(7, 10);
    byOrderArr.push({
        time: aHistory.tradeTime,
        phone: phoneFormatted,
        containerAmount: tmpContainerList.length,
        containerList: tmpContainerList
    });
    byDateArr = [];
    tmpOrderList = [];
    date = 0;
    while (!(byOrderArr[0].time < dateCheckpoint(date + 1) && byOrderArr[0].time >= dateCheckpoint(date))) { date--; }
    hoursFormatted = intReLength(byOrderArr[0].time.getHours(), 2);
    minutesFormatted = intReLength(byOrderArr[0].time.getMinutes(), 2);
    byOrderArr[0].time = hoursFormatted + ":" + minutesFormatted;
    tmpOrderList.push(byOrderArr[0]);
    for (var i = 1; i < byOrderArr.length; i++) {
        aOrder = byOrderArr[i];
        if (!(aOrder.time < dateCheckpoint(date + 1) && aOrder.time >= dateCheckpoint(date))) {
            dateFormatted = dateCheckpoint(date);
            monthFormatted = intReLength((dateFormatted.getMonth() + 1), 2);
            dayFormatted = intReLength(dateFormatted.getDate(), 2);
            byDateArr.push({
                date: dateFormatted.getFullYear() + "/" + monthFormatted + "/" + dayFormatted,
                orderAmount: tmpOrderList.length,
                orderList: tmpOrderList
            });
            tmpOrderList = [];
            date--;
        }
        hoursFormatted = intReLength(aOrder.time.getHours(), 2);
        minutesFormatted = intReLength(aOrder.time.getMinutes(), 2);
        aOrder.time = hoursFormatted + ":" + minutesFormatted;
        tmpOrderList.push(aOrder);
    }
    dateFormatted = dateCheckpoint(date);
    monthFormatted = intReLength((dateFormatted.getMonth() + 1), 2);
    dayFormatted = intReLength(dateFormatted.getDate(), 2);
    byDateArr.push({
        date: dateFormatted.getFullYear() + "/" + monthFormatted + "/" + dayFormatted,
        orderAmount: tmpOrderList.length,
        orderList: tmpOrderList
    });
    return callback(byDateArr);
}

function getFavorite(data, callback) {
    if (data.length === 0) return callback([]);
    data.sort(function(a, b) { return b.tradeTime - a.tradeTime });
    var byOrderArr = [];
    var tmpContainerList = [];
    tmpContainerList.unshift('#' + intReLength(data[0].container.id, 3));
    for (var i = 1; i < data.length; i++) {
        var aHistory = data[i];
        var lastHistory = data[i - 1];
        var thisPhone = aHistory.newUser.phone;
        var lastPhone = lastHistory.newUser.phone;
        if ((lastHistory.tradeTime - aHistory.tradeTime) > 1000 || lastPhone !== thisPhone) {
            byOrderArr.push(thisPhone);
            tmpContainerList = [];
        }
        tmpContainerList.push('#' + intReLength(aHistory.container.id, 3));
    }
    byOrderArr.push(thisPhone);
    var count = {};
    for (var i = 0; i < byOrderArr.length; i++) {
        if (byOrderArr[i] in count) {
            count[byOrderArr[i]]++;
        } else {
            count[byOrderArr[i]] = 1;
        }
    }
    var sortable = [];
    for (var phone in count) {
        sortable.push([phone, count[phone]]);
    }
    sortable.sort(function(a, b) { return b[1] - a[1]; });
    return callback(sortable);
}

module.exports = router;