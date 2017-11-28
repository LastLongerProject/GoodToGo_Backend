var PlaceID = require('../models/DB/placeIdDB');
var ContainerType = require('../models/DB/containerTypeDB');
var debug = require('debug')('goodtogo_backend:appINIT');

module.exports = {
    placeID: function() {
        PlaceID.find(function(err, list) {
            if (err) {
                debug(err);
                return null;
            }
            return list;
        });
    },
    containerType: function() {
        ContainerType.find(function(err, list) {
            if (err) {
                debug(err);
                return null;
            }
            return list;
        });
    }
};