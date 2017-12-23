var PlaceID = require('../models/DB/placeIdDB');
var Container = require('../models/DB/containerDB');
var ContainerType = require('../models/DB/containerTypeDB');
var sheet = require('./google/sheet');
var drive = require('./google/drive');
var debug = require('debug')('goodtogo_backend:appInit');
debug.log = console.log.bind(console);
var debugError = require('debug')('goodtogo_backend:appINIT_ERR');

module.exports = {
    store: function(app) {
        PlaceID.find({}, {}, { sort: { ID: 1 } }, (err, stores) => {
            if (err) return next(err);
            app.set('store', stores);
            debug('storeList init');
        });
    },
    container: function(app) {
        ContainerType.find({}, {}, { sort: { typeCode: 1 } }, function(err, containerTypeList) {
            if (err) return debugError(err);
            Container.find({ 'active': true }, {}, { sort: { ID: 1 } }, function(err, containerList) {
                var containerDict = {};
                if (err) return debugError(err);
                for (var i = 0; i < containerList.length; i++) {
                    containerDict[containerList[i].ID] = containerTypeList[containerList[i].typeCode].name;
                }
                app.set('container', containerDict);
                app.set('containerType', containerTypeList);
                debug('containerList init');
            });
        });
    },
    refreshStore: function(app, cb) {
        sheet.getStore((data) => {
            PlaceID.find({}, {}, { sort: { ID: 1 } }, (err, stores) => {
                if (err) return next(err);
                app.set('store', stores);
                cb();
            });
        });
    },
    refreshContainer: function(app, dbUser, cb) {
        sheet.getContainer(dbUser, () => {
            ContainerType.find({}, {}, { sort: { typeCode: 1 } }, function(err, containerTypeList) {
                if (err) return debugError(err);
                Container.find({ 'active': true }, {}, { sort: { ID: 1 } }, function(err, containerList) {
                    var containerDict = {};
                    if (err) return debugError(err);
                    for (var i = 0; i < containerList.length; i++) {
                        containerDict[containerList[i].ID] = containerTypeList[containerList[i].typeCode].name;
                    }
                    app.set('container', containerDict);
                    app.set('containerType', containerTypeList);
                    cb();
                });
            });
        });
    },
    refreshStoreImg: function(forceRenew, cb) {
        drive.getStore(forceRenew, (succeed, data) => {
            if (succeed) {
                cb(succeed, { type: 'refreshStoreImg', message: 'refresh succeed', data: data });
            } else {
                cb(succeed, { type: 'refreshStoreImg', message: 'refresh fail', data: data });
            }
        });
    },
    refreshContainerIcon: function(forceRenew, cb) {
        drive.getContainer(forceRenew, (succeed, data) => {
            if (succeed) {
                cb(succeed, { type: 'refreshContainerIcon', message: 'refresh succeed', data: data });
            } else {
                cb(succeed, { type: 'refreshContainerIcon', message: 'refresh fail', data: data });
            }
        });
    }
};