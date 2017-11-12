var express = require('express');
var router = express.Router();
var fs = require("fs");
var jwt = require('jwt-simple');
var debug = require('debug')('goodtogo_backend:stores');

var keys = require('../config/keys');
var wetag = require('../models/toolKit').wetag;
var intReLength = require('../models/toolKit').intReLength;
var dateCheckpoint = require('../models/toolKit').dateCheckpoint;

var validateRequest = require('../models/validateRequest').JWT;
var regAsStore = require('../models/validateRequest').regAsStore;
var Box = require('../models/DB/boxDB');
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
            Trade.count({ "tradeType.action": "Rent" }, function(err, count) {
                jsonData.globalAmount = count;
                var date = new Date();
                var payload = { 'iat': Date.now(), 'exp': date.setMinutes(date.getMinutes() + 5) };
                var token = jwt.encode(payload, keys.serverSecretKey());
                res.set('etag', wetag([storeList, count]));
                for (var i = 0; i < storeList.length; i++) {
                    if (storeList[i].active) {
                        var tmpOpening = [];
                        storeList[i].img_info.img_src += ("/" + token);
                        for (var j = 0; j < storeList[i].opening_hours.length; j++)
                            tmpOpening.push({
                                close: storeList[i].opening_hours[j].close,
                                open: storeList[i].opening_hours[j].open
                            })
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
                res.json(jsonData);
            });
        });
    });
});

router.get('/status', regAsStore, validateRequest, function(dbStore, req, res, next) {
    if (dbStore.status)
        return next(dbStore);
    var tmpArr = [];
    for (var i = 0; i < type.containers.length; i++) {
        tmpArr.push({
            typeCode: type.containers[i].typeCode,
            name: type.containers[i].name,
            IdList: [],
            amount: 0
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
        Container.find({ 'statusCode': 1, 'storeID': dbStore.role.storeID, 'active': true }, function(err, containers) {
            if (err) return next(err);
            Trade.find({ 'tradeTime': { '$gte': dateCheckpoint(0), '$lt': dateCheckpoint(1) } }, function(err, trades) {
                if (err) return next(err);
                if (typeof containers !== 'undefined') {
                    for (var i in containers) {
                        tmpTypeCode = containers[i].typeCode;
                        resJson['containers'][tmpTypeCode]['IdList'].push(containers[i].ID);
                        resJson['containers'][tmpTypeCode]['amount']++;
                    }
                }
                if (typeof trades !== 'undefined') {
                    for (var i in trades) {
                        if (trades[i].tradeType.action === 'Rent' && trades[i].oriUser.storeID === dbStore.role.storeID)
                            resJson['todayData']['rent']++;
                        else if (trades[i].tradeType.action === 'Return' && trades[i].newUser.storeID === dbStore.role.storeID)
                            resJson['todayData']['return']++;
                    }
                }
                res.json(resJson);
            });
        });
    });
});

router.get('/getUser/:id', regAsStore, validateRequest, function(dbStore, req, res, next) {
    if (dbStore.status)
        return next(dbStore);
    var id = req.params.id;
    process.nextTick(function() {
        User.findOne({ 'user.phone': new RegExp(id.toString() + '$', "i") }, function(err, user) {
            if (err)
                return next(err);
            if (typeof user !== 'undefined' && user !== null) {
                res.status(200).json({ 'phone': user.user.phone, 'apiKey': user.user.apiKey });
            } else {
                res.status(401).json({ "type": "userSearchingError", "message": "No User: [" + id + "] Found" });
            }
        });
    });
});

router.get('/boxToSign', regAsStore, validateRequest, function(dbStore, req, res, next) {
    process.nextTick(function() {
        Container.find(function(err, list) {
            if (err) return next(err);
            var containerDict = {};
            for (var i = 0; i < list.length; i++) {
                containerDict[list[i].ID] = type.containers[list[i].typeCode].name;
            }
            Box.find({ 'storeID': dbStore.role.storeID }, function(err, boxList) {
                if (err) return next(err);
                if (boxList.length === 0) return res.json({ toSign: [] });
                var boxArr = [];
                var thisBox;
                var thisType;
                for (var i = 0; i < boxList.length; i++) {
                    thisBox = boxList[i].boxID;
                    var thisBoxTypeList = [];
                    var thisBoxContainerList = {};
                    for (var j = 0; j < boxList[i].containerList.length; j++) {
                        thisType = containerDict[boxList[i].containerList[j]];
                        if (thisBoxTypeList.indexOf(thisType) < 0) {
                            thisBoxTypeList.push(thisType);
                            thisBoxContainerList[thisType] = [];
                        }
                        thisBoxContainerList[thisType].push(boxList[i].containerList[j]);
                    }
                    boxArr.push({
                        boxID: thisBox,
                        boxTime: boxList[i].boxTime,
                        typeList: thisBoxTypeList,
                        containerList: thisBoxContainerList,
                        isDelivering: boxList[i].delivering,
                        destinationStore: boxList[i].storeID
                    });
                }
                for (var i = 0; i < boxArr.length; i++) {
                    boxArr[i].containerOverview = [];
                    for (var j = 0; j < boxArr[i].typeList.length; j++) {
                        boxArr[i].containerOverview.push({
                            containerType: boxArr[i].typeList[j],
                            amount: boxArr[i].containerList[boxArr[i].typeList[j]].length
                        });
                    }
                }
                var resJSON = {
                    toSign: boxArr
                };
                res.json(resJSON);
            });
        });
    });
});

router.get('/history', regAsStore, validateRequest, function(dbStore, req, res, next) {
    process.nextTick(function() {
        Trade.find({
            'tradeTime': { '$gte': dateCheckpoint(-6), '$lt': dateCheckpoint(1) },
            'tradeType.action': 'Rent',
            'oriUser.storeID': dbStore.role.storeID
        }, function(err, rentTrades) {
            Trade.find({
                'tradeTime': { '$gte': dateCheckpoint(-6), '$lt': dateCheckpoint(1) },
                'tradeType.action': 'Return',
                'newUser.storeID': dbStore.role.storeID
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

router.get('/favorite', regAsStore, validateRequest, function(dbStore, req, res, next) {
    process.nextTick(function() {
        Trade.find({
            'tradeType.action': 'Rent',
            'oriUser.storeID': dbStore.role.storeID
        }, function(err, rentTrades) {
            if (typeof rentTrades !== 'undefined') {
                getFavorite(rentTrades, function(userList) {
                    resJson = {};
                    if (userList.length > 5)
                        resJson.userList = userList.slice(0, 5);
                    else if (userList.length > 0)
                        resJson.userList = userList;
                    else
                        resJson.userList = [];
                    res.json(resJson);
                });
            }
        });
    });
});

function parseHistory(data, dataType, callback) {
    var aHistory;
    var lastHistory;
    var thisPhone;
    var lastPhone;
    if (data.length === 0) return callback([]);
    else if (data.length === 1) {
        aHistory = data[0];
        if (dataType === 'Rent')
            thisPhone = aHistory.newUser.phone;
        else if (dataType === 'Return')
            thisPhone = aHistory.oriUser.phone;
    } else {
        data.sort(function(a, b) { return b.tradeTime - a.tradeTime });
    }
    var byOrderArr = [];
    var tmpContainerList = [];
    tmpContainerList.unshift('#' + intReLength(data[0].container.id, 3) + " | " + type.containers[data[0].container.typeCode].name);
    for (var i = 1; i < data.length; i++) {
        aHistory = data[i];
        lastHistory = data[i - 1];
        if (dataType === 'Rent') {
            thisPhone = aHistory.newUser.phone;
            lastPhone = lastHistory.newUser.phone;
        } else if (dataType === 'Return') {
            thisPhone = aHistory.oriUser.phone;
            lastPhone = lastHistory.oriUser.phone;
        }
        if ((lastHistory.tradeTime - aHistory.tradeTime) !== 0 || lastPhone !== thisPhone) {
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
    // console.log(dateCheckpoint(date))
    // console.log(byOrderArr[0].time)
    while (!(byOrderArr[0].time < dateCheckpoint(date + 1) && byOrderArr[0].time >= dateCheckpoint(date))) {
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
    hoursFormatted = intReLength(byOrderArr[0].time.getHours() + 8, 2);
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
        hoursFormatted = intReLength(aOrder.time.getHours() + 8, 2);
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
    tmpOrderList = [];
    date--;
    while (date > -7) {
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
    return callback(byDateArr);
}

function getFavorite(data, callback) {
    if (data.length === 0) return callback([]);
    data.sort(function(a, b) { return b.tradeTime - a.tradeTime });
    var byOrderArr = [];
    var aHistory;
    var lastHistory;
    var thisPhone = data[0].newUser.phone;
    var lastPhone;
    for (var i = 1; i < data.length; i++) {
        aHistory = data[i];
        lastHistory = data[i - 1];
        thisPhone = aHistory.newUser.phone;
        lastPhone = lastHistory.newUser.phone;
        if ((lastHistory.tradeTime - aHistory.tradeTime) !== 0 || lastPhone !== thisPhone) {
            byOrderArr.push(thisPhone);
        }
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