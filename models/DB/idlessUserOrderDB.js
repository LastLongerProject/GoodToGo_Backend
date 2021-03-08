var mongoose = require('mongoose');

// define the schema for our user model
var schema = mongoose.Schema({
    orderID: String,
    orderTime: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    userOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserOrder"
    },
    containerType: Number,
    storeID: Number,
    archived: {
        type: Boolean,
        default: false
    }
}, {
    usePushEach: true,
    timestamps: true
});

schema.index({
    "orderTime": -1
});
schema.index({
    "user": 1
});
schema.index({
    "user": 1,
    "archived": 1
});
schema.index({
    "orderID": 1
});


// create the model for users and expose it to our app
module.exports = mongoose.model('IDlessUserOrder', schema);