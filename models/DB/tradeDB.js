var mongoose = require('mongoose');

// define the schema for our user model
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
        box: Number,
        inLineSystem: Boolean
    },
    logTime: {
        type: Date,
        default: Date.now
    },
    activity: {
        type: String,
        default: "沒活動"
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


// create the model for users and expose it to our app
module.exports = mongoose.model('Trade', schema);