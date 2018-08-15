var express = require('express');
var router = express.Router();
var debug = require('debug')('goodtogo_backend:manager');
var redis = require("../models/redis");

var validateRequest = require('../models/validation/validateRequest').JWT;
var regAsAdminManager = require('../models/validation/validateRequest').regAsAdminManager;
var refreshStore = require('../models/appInit').refreshStore;
var refreshContainer = require('../models/appInit').refreshContainer;
var refreshStoreImg = require('../models/appInit').refreshStoreImg;
var refreshContainerIcon = require('../models/appInit').refreshContainerIcon;

var Store = require('../models/DB/storeDB');
var Trade = require('../models/DB/tradeDB');

router.get('/shop', regAsAdminManager, validateRequest, function (req, res, next) {
    Store.find(function (err, storeDataList) {
        if (err) return next(err);
        Container.find({
            'storeID': {
                '$ne': undefined
            },
            'active': true
        }, function (err, toUsedContainerList) {
            if (err) return next(err);
            var tradeQuery = {
                'tradeType.action': {
                    '$in': ['Sign', 'ReadyToClean']
                }
            };
            if (false)
                tradeQuery.tradeTime = {
                    '$gte': dateCheckpoint(0)
                };
            Trade.find(tradeQuery, function (err, tradeList) {

            });
        });
    });
    res.json({
        list: [{
            id: 0,
            storeName: "布萊恩紅茶",
            toUsedAmount: 24,
            todayAmount: 2,
            weekAmount: 18,
            weekAverage: 10
        }]
    });
});

router.patch('/refresh/store', regAsAdminManager, validateRequest, function (req, res, next) {
    refreshStore(req.app, function () {
        res.status(204).end();
    });
});

router.patch('/refresh/container', regAsAdminManager, validateRequest, function (req, res, next) {
    var dbAdmin = req._user;
    refreshContainer(req.app, dbAdmin, function () {
        res.status(204).end();
    });
});

router.patch('/refresh/storeImg/:id', regAsAdminManager, validateRequest, function (req, res, next) {
    var forceRenew = (req.params.id === '1');
    refreshStoreImg(forceRenew, function (succeed, resData) {
        res.status((succeed) ? 200 : 403).json(resData);
    });
});

router.patch('/refresh/containerIcon/:id', regAsAdminManager, validateRequest, function (req, res, next) {
    var forceRenew = (req.params.id === '1');
    refreshContainerIcon(forceRenew, function (succeed, resData) {
        res.status((succeed) ? 200 : 403).json(resData);
    });
});

module.exports = router;