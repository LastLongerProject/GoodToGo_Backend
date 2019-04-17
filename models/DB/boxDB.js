var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    listID: String,
    boxID: Number,
    boxName: String,
    boxOrderContent: [{
        containerType: Number,
        amount: Number
    }],
    boxDeliverContent: [{
        containerType: Number,
        amount: Number
    }],
    dueDate: Date,
    storeID:Number,
    action: [{
        phone: String,
        boxStatus: String,
        timestamps: Date
    }],
    user: {
        box: String
    },
    containerList: Array,
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

userSchema.index({
    "storeID": 1
});
userSchema.index({
    "boxID": 1
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Box', userSchema);