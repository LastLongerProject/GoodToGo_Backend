var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
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

userSchema.index({
    "createAt": -1
});

module.exports = mongoose.model('Exception', userSchema);