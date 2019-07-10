var mongoose = require('mongoose');

var schema = mongoose.Schema({
    user: mongoose.Schema.Types.ObjectId,
    logTime: {
        type: Date,
        default: Date.now
    },
    title: String,
    body: String,
    quantityChange: Number
});

schema.index({
    "user": 1
});

module.exports = mongoose.model("PointLog", schema);