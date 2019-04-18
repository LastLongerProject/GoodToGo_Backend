var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    couponID: String,
    user: mongoose.Schema.Types.ObjectId,
    couponType: mongoose.Schema.Types.ObjectId,
    used: Boolean,
    expired: Boolean
}, {
    timestamps: true
});

userSchema.index({
    "user": 1
});

module.exports = mongoose.model("Coupon", userSchema);