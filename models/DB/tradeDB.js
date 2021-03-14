var mongoose = require('mongoose');

var schema = mongoose.Schema({
    tradeTime: Date,
    tradeType: {
        action: String,
        oriState: Number,
        newState: Number
    },
    oriUser: Object,
    // {
    //     type: String,
    //     storeID: Number,
    //     phone: String
    // }
    newUser: Object,
    // {
    //     type: String,
    //     storeID: Number,
    //     phone: String
    // }
    container: {
        id: Number,
        typeCode: Number,
        cycleCtr: Number,
        orderID: String,
        box: Number,
        inLineSystem: Boolean
    },
    logTime: {
        type: Date,
        default: Date.now
    },
    exception: {
        type: Boolean,
        default: false
    }
});

schema.index({
    "logTime": -1
});
schema.index({
    "tradeTime": -1
});
schema.index({
    "tradeType.action": 1
});

module.exports = mongoose.model('Trade', schema);