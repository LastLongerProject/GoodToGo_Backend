var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    orderID: Number,
    storeID: Number,
    dueDate: Date,
    boxs: [{
        boxName: String,
        boxContent: [{
            containerType: Number,
            amount: Number
        }],
        containers: []
    }],
    error: {
        type: Boolean,
        Default: false
    },
    comment: String
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