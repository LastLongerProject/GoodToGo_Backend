var mongoose = require('mongoose');

// define the schema for our user model
var schema = mongoose.Schema({
    orderID: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    userOrders: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'UserOrder'
    }],
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
    "user": 1
});

// create the model for users and expose it to our app
module.exports = mongoose.model('FoodpandaOrder', schema);