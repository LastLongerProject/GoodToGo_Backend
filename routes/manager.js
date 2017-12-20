var express = require('express');
var router = express.Router();
var debug = require('debug')('goodtogo_backend:manager');

var validateRequest = require('../models/validation/validateRequest').JWT;
var regAsAdminManager = require('../models/validation/validateRequest').regAsAdminManager;
var refreshStore = require('../models/appInit').refreshStore;
var refreshContainer = require('../models/appInit').refreshContainer;

router.patch('/refresh/store', regAsAdminManager, validateRequest, function(req, res, next) {
    refreshStore(req.app, function() {
        res.status(204).end();
    });
});

router.patch('/refresh/container', regAsAdminManager, validateRequest, function(req, res, next) {
    refreshContainer(req.app, function() {
        res.status(204).end();
    });
});

module.exports = router;