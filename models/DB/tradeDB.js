var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    tradeID: Number,
    tradeTime: Date,
    tradeType: {
        action: String,
        oriState: String,
        newState: String
    },
    oriUser: {
        type: String,
        storeID: Number,
        phone: String
    },
    newUser: {
        type: String,
        storeID: Number,
        phone: String
    },
    containers: [{
        id: Number,
        typeCode: Number,
        statusCode: Number,
        usedCounter: Number
    }],
    logTime: { type: Date, default: Date.now }
});

userSchema.index({ "logTime": -1 });

// create the model for users and expose it to our app
module.exports = mongoose.model('Trade', userSchema);