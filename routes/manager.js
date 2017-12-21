var express = require('express');
var router = express.Router();
var debug = require('debug')('goodtogo_backend:manager');

var validateRequest = require('../models/validation/validateRequest').JWT;
var regAsAdminManager = require('../models/validation/validateRequest').regAsAdminManager;
var refreshStore = require('../models/appInit').refreshStore;
var refreshContainer = require('../models/appInit').refreshContainer;
var refreshStoreImg = require('../models/appInit').refreshStoreImg;
var refreshContainerIcon = require('../models/appInit').refreshContainerIcon;

router.patch('/refresh/store', regAsAdminManager, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    refreshStore(req.app, function() {
        res.status(204).end();
    });
});

router.patch('/refresh/container', regAsAdminManager, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    refreshContainer(req.app, dbAdmin, function() {
        res.status(204).end();
    });
});

router.patch('/refresh/storeImg/:id', regAsAdminManager, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    var forceRenew = (req.params.id === '1');
    refreshStoreImg(forceRenew, function(succeed, resData) {
        res.status((succeed) ? 200 : 403).json(resData);
    });
});

router.patch('/refresh/containerIcon/:id', regAsAdminManager, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    if (dbAdmin.status) return next(dbAdmin);
    var forceRenew = (req.params.id === '1');
    refreshContainerIcon(forceRenew, function(succeed, resData) {
        res.status((succeed) ? 200 : 403).json(resData);
    });
});

module.exports = router;