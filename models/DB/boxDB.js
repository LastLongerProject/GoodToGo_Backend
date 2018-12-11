var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    boxID: Number,
    boxName: String,
    boxContent: [{
        containerType: Number,
        amount: Number
    }],
    dueDate: Date,
    storeID: Number,
    user: {
        order: String,
        box: String,
        delivery: String
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
    status: Number,
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