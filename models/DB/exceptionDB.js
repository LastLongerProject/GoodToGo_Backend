var mongoose = require('mongoose');

var schema = mongoose.Schema({
    containerID: Number,
    storeID: Number,
    oriState: String,
    newState: String,
    operator: String,
    errorLevel: String,
    description: Object
}, {
    timestamps: true
});

schema.index({
    "createAt": -1
});

module.exports = mongoose.model('Exception', schema);