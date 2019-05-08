var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    logTime: {
        type: Date,
        default: Date.now
    },
    user: String,
    action: String,
    describe: String
});

userSchema.index({
    "logTime": -1
});
userSchema.index({
    "user": 1
});

// create the model for users and expose it to our app
module.exports = mongoose.model('UserTradeLog', userSchema);