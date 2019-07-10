var mongoose = require('mongoose');

var schema = mongoose.Schema({
    listID: String,
    creator: String,
    boxList: Array,
    destinationStoreID: Number
}, {
    timestamps: true,
    usePushEach: true
});

schema.index({
    "listID": 1
});

module.exports = mongoose.model('DeliveryList', schema);