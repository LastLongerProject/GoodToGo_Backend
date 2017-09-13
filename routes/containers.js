var express = require('express');
var router = express.Router();
var fs = require('fs');

var debug = require('debug')('goodtogo_backend:containers');
var Container = require('../models/DB/containerDB');
var Trade = require('../models/DB/tradeDB');
var User = require('../models/DB/userDB');
var validateRequest = require('../models/validateRequest');
var validateUser = require('../config/keys').validateUser;

var status = ['cleaned', 'readyToUse', 'borrowed', 'returned', 'notClean'];

var typeCode;
fs.readFile("./assets/json/containerType.json", 'utf8', function(err, data) {
    if (err) throw err;
    typeCode = JSON.parse(data);
});

router.all('/:id', function(req, res) {
    // debug("Redirect to official website.");
    res.writeHead(301, { Location: 'http://goodtogo.tw' });
    res.end();
});

router.post('/rent/:id', validateRequest, function(dbStore, req, res, next) {
    if (dbStore.status)
        return next(dbStore);
    var key = req.headers['userapikey'];
    if (typeof key === 'undefined' || typeof key === null) {
        debug(req.headers);
        res.status(401).json({
            "type": "borrowContainerMessage",
            "message": "Invalid Request"
        });
        return;
    }
    if (dbStore.role.typeCode != "clerk") {
        res.status(401).json({
            "type": "borrowContainerMessage",
            "message": "Invalid Role"
        });
        return;
    }
    // if (!res._payload.orderTime) return res.status(401).json({ "type": "borrowContainerMessage", "message": "Missing Time" });
    var id = req.params.id;
    validateUser(key, next, function(dbUser) {
        if (!dbUser) return res.status(500).json({ type: 'borrowContainerMessage', message: 'No user found' });
        else if (!dbUser.active) return res.status(401).json({ type: 'borrowContainerMessage', message: 'User has Banned' });
        process.nextTick(function() {
            Container.findOne({ 'container.ID': id }, function(err, container) {
                if (err)
                    return next(err);
                if (!container)
                    return res.status(404).json({ type: 'borrowContainerMessage', message: 'No container found.' });
                if (!container.active)
                    return res.status(403).json({ type: 'borrowContainerMessage', message: 'Container not available.' });
                if (container.statusCode !== 1 && container.statusCode !== 0) {
                    debug('Container conflict. Data : ' + JSON.stringify(container.container) +
                        ' StoreID : ' + dbStore.role.clerk.storeID.toString() +
                        ' Customer : ' + dbUser.user.phone);
                    return res.status(403).json({
                        'type': 'borrowContainerMessage',
                        'message': 'Container conflict. Container Status: ' + status[container.statusCode]
                            // ,'data': container.toString()
                    });
                }
                container.statusCode = 2;
                container.usedCounter++;
                container.conbineTo = dbUser.user.phone;
                container.save(function(err, updatedContainer) {
                    if (err) return next(err);
                    newTrade = new Trade();
                    newTrade.tradeTime = res._payload.orderTime || Date.now();
                    newTrade.tradeType = {
                        action: "Rent",
                        oriState: 1,
                        newState: 2
                    };
                    newTrade.oriUser = {
                        type: dbStore.role.typeCode,
                        storeID: dbStore.role.clerk.storeID,
                        phone: dbStore.user.phone
                    };
                    newTrade.newUser = {
                        type: dbUser.role.typeCode,
                        phone: dbUser.user.phone
                    };
                    newTrade.container = {
                        id: container.ID,
                        typeCode: container.typeCode
                    };
                    newTrade.save(function(err) {
                        if (err) return next(err);
                        res.status(200).json({ type: 'borrowContainerMessage', message: 'Borrow succeeded.' });
                    });
                });
            });
        });
    });
});

router.post('/return/:id', validateRequest, function(dbStore, req, res, next) {
    if (dbStore.status)
        return next(dbStore);
    if (dbStore.role.typeCode != "clerk") {
        res.status(401).json({
            "type": "returnContainerMessage",
            "message": "Invalid Role"
        });
        return;
    }
    // if (!res._payload.orderTime) return res.status(401).json({ "type": "returnContainerMessage", "message": "Missing Time" });
    var id = req.params.id;
    process.nextTick(function() {
        Container.findOne({ 'container.ID': id }, function(err, container) {
            if (err)
                return next(err);
            if (!container)
                return res.status(404).json({ type: 'returnContainerMessage', message: 'No container found.' });
            if (!container.active)
                return res.status(500).json({ type: 'returnContainerMessage', message: 'Container not available.' });
            if (container.statusCode !== 2) {
                return res.status(403).json({ type: 'returnContainerMessage', message: 'Container has not rented.' });
            }
            User.findOne({ 'user.phone': container.conbineTo }, function(err, dbUser) {
                if (err) return next(err);
                if (!dbUser) {
                    debug('Return unexpect err. Data : ' + JSON.stringify(container.container) +
                        ' ID in uri : ' + id);
                    return res.status(500).json({ type: 'returnContainerMessage', message: 'No user found.' });
                }
                newTrade = new Trade();
                newTrade.tradeTime = res._payload.orderTime;
                newTrade.tradeType = {
                    action: "Return",
                    oriState: 2,
                    newState: 1
                };
                newTrade.oriUser = {
                    type: dbUser.role.typeCode,
                    phone: dbUser.user.phone
                };
                newTrade.newUser = {
                    type: dbStore.role.typeCode,
                    storeID: dbStore.role.clerk.storeID,
                    phone: dbStore.user.phone
                };
                newTrade.container = {
                    id: container.ID,
                    typeCode: container.typeCode
                };
                newTrade.save(function(err) {
                    if (err) return next(err);
                    container.statusCode = 1;
                    container.conbineTo = null;
                    container.save(function(err, updatedContainer) {
                        if (err) return next(err);
                        res.status(200).json({ type: 'returnContainerMessage', message: 'Return succeeded' });
                    });
                });
            });
        });
    });
});

router.post('/add/:id', function(req, res, next) {
    containerData = req.body['container'];
    if (!containerData) {
        res.status(401);
        res.json({
            "status": 401,
            "message": "Invalid Request, no container data"
        });
        return;
    }
    var id = req.params.id;
    process.nextTick(function() {
        Container.findOne({ 'container.ID': id }, function(err, container) {
            if (err)
                return next(err);
            if (container) {
                return res.status(404).json({ type: 'addContainerMessage', message: 'That ID is already exist.' });
            } else {
                var newContainer = new Container();
                newContainer.ID = id;
                newContainer.typeCode = containerData.typeCode;
                newContainer.statusCode = 0;
                newContainer.usedCounter = 0;
                newContainer.conbineTo = null;
                newContainer.save(function(err) { // save the container
                    if (err)
                        throw err;
                    res.status(200).json({ type: 'addContainerMessage', message: 'Add succeeded' });
                    return;
                });
            }
        });
    });
});

module.exports = router;