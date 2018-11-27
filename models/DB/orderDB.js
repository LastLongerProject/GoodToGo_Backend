var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    orderID: Number,
    storeID: Number,
    boxs: [
        mongoose.Schema.Types.ObjectId
    ]
}, {
    timestamps: true
});

userSchema.index({
    "orderID": 1
});

userSchema.index({
    "storeID": 1
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Order', userSchema);