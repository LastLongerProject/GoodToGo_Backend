var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    logTime: {
        type: Date,
        default: Date.now
    },
    title: String,
    body: String,
    quantityChange: Number
});

userSchema.index({
    "user": 1
});

module.exports = mongoose.model("PointLog", userSchema);