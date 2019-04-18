var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    provider: String,
    title: String,
    expirationDate: Date,
    price: Number,
    amount: {
        total: Number,
        current: Number
    },
    extraNotice: String,
    img_info: {
        img_src: String,
        img_version: Number
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Coupon", userSchema);