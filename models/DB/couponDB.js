var mongoose = require('mongoose');

var schema = mongoose.Schema({
    couponID: String,
    user: mongoose.Schema.Types.ObjectId,
    couponType: mongoose.Schema.Types.ObjectId,
    used: {
        type: Boolean,
        default: false
    },
    expired: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

schema.index({
    "user": 1
});

module.exports = mongoose.model("Coupon", schema);