var mongoose = require('mongoose');

// define the schema for our user model
var schema = mongoose.Schema({
    listID: String,
    boxID: Number,
    boxName: String,
    boxOrderContent: [{
        containerType: String,
        amount: Number
    }],
    dueDate: Date,
    storeID: Number,
    action: [{
        phone: String,
        boxStatus: String,
        boxAction: String,
        destinationStoreId: Number,
        timestamps: Date
    }],
    deliveringDate: Date,
    user: {
        box: String
    },
    containerList: [Number],
    delivering: {
        type: Boolean,
        default: false
    },
    stocking: {
        type: Boolean,
        default: false
    },
    status: String,
    error: {
        type: Boolean,
        Default: false
    },
    comment: String
}, {
    timestamps: true,
    usePushEach: true
});

schema.index({
    "storeID": 1
});
schema.index({
    "boxID": 1
});
schema.index({
    "deliveringDate": -1
})

// create the model for users and expose it to our app
module.exports = mongoose.model('Box', schema);