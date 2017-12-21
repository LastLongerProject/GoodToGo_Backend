var PlaceID = require('../models/DB/placeIdDB');
var ContainerType = require('../models/DB/containerTypeDB');
var sheet = require('./google/sheet');
var drive = require('./google/drive');
var debug = require('debug')('goodtogo_backend:appINIT');
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
        ContainerType.find({}, {}, { sort: { typeCode: 1 } }, function(err, list) {
            if (err) return debugError(err);
            app.set('containerType', list);
            debug('containerTypeList init');
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
            ContainerType.find({}, {}, { sort: { typeCode: 1 } }, function(err, list) {
                if (err) return debugError(err);
                app.set('containerType', list);
                cb();
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