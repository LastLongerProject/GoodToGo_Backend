var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
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
        toStoreID: Number,
        box: Number
    },
    logTime: {
        type: Date,
        default: Date.now
    }
});

userSchema.index({
    "logTime": -1
});
userSchema.index({
    "tradeTime": -1
});
userSchema.index({
    "tradeType.action": 1
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Trade', userSchema);