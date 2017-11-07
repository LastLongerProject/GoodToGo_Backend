var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    ip: String,
    url: String,
    method: String,
    logTime: { type: Date, default: Date.now },
    description: { type: String, default: "Default" },
    req: {
        payload: Object,
        headers: Object,
        body: Object
    },
    res: {
        status: Number,
        headers: Object,
        body: Object
    }
});

userSchema.index({ "logTime": -1 });

module.exports = mongoose.model('log', userSchema);