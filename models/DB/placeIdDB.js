var mongoose = require('mongoose');

var schema = mongoose.Schema({
    ID: Number,
    name: String,
    placeID: String,
    contract: {
        returnable: Boolean,
        borrowable: Boolean
    },
    active: Boolean,
    project: String,
    type: String,
    category: Number,
    activity: Array,
    delivery_area: Array
}, {
    timestamps: true
});

schema.index({
    "ID": 1
});

module.exports = mongoose.model('PlaceID', schema);