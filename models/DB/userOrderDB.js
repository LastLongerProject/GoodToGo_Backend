var mongoose = require('mongoose');

// define the schema for our user model
var schema = mongoose.Schema({
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
    storeID: Number,
    archived: {
        type: Boolean,
        default: false
    }
});

schema.index({
    "orderTime": -1
});
schema.index({
    "user": 1
});
schema.index({
    "containerID": 1
});


// create the model for users and expose it to our app
module.exports = mongoose.model('UserOrder', schema);