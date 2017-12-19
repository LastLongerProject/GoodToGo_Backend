var PlaceID = require('../models/DB/placeIdDB');
var ContainerType = require('../models/DB/containerTypeDB');
var sheet = require('./google/sheet');
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
    refreshStore: function(app) {
        sheet.getStore((data) => {
            PlaceID.find({}, {}, { sort: { ID: 1 } }, (err, stores) => {
                if (err) return next(err);
                app.set('store', stores);
                debug('storeList refresh');
            });
        });
    },
    refreshContainer: function(app) {
        sheet.getContainer(() => {
            ContainerType.find({}, {}, { sort: { typeCode: 1 } }, function(err, list) {
                if (err) return debugError(err);
                app.set('containerType', list);
                debug('containerTypeList refresh');
            });
        });
    },
};