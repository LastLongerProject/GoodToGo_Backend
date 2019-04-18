var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    orderID: String,
    orderTime: {
        type: Date,
        default: Date.now
    },
    user: mongoose.Schema.Types.ObjectId,
    containerID: {
        type: Number,
        default: null
    },
    storeID: Number
});

userSchema.index({
    "orderTime": -1
});
userSchema.index({
    "user": 1
});


// create the model for users and expose it to our app
module.exports = mongoose.model('UserOrder', userSchema);