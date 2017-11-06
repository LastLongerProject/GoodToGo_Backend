var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    ip: String,
    url: String,
    method: String,
    hashID: String,
    reqTime: Date,
    logTime: { type: Date, default: Date.now },
    description: { type: String, default: "Default" },
    req: {
        headers: Object,
        payload: Object,
        body: Object
    },
    res: {
        status: Number,
        headers: Object,
        body: Object
    }
});

userSchema.index({ "logTime": -1, "hashID": 1 });

module.exports = mongoose.model('log', userSchema);