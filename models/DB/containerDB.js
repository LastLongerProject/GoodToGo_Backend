var mongoose = require('mongoose');

// define the schema for our user model
var schema = mongoose.Schema({
    ID: Number,
    typeCode: Number,
    statusCode: {
        type: Number,
        default: 4
    },
    conbineTo: String,
    storeID: {
        type: Number,
        default: null
    },
    boxID: {
        type: Number,
        default: null
    },
    cycleCtr: {
        type: Number,
        default: 0
    },
    inLineSystem: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: true
    },
    checkedAt: Date,
    lastUsedAt: {
        type: Date,
        default: Date.now()
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
});

schema.index({
    "ID": 1
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Container', schema);