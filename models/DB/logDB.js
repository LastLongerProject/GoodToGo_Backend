var mongoose = require('mongoose');

// define the schema for our user model
var schema = mongoose.Schema({
    ip: String,
    url: String,
    method: String,
    httpVersion: String,
    logTime: { type: Date, default: Date.now },
    req: {
        date: String,
        payload: Object,
        headers: Object,
        body: Object
    },
    res: {
        time: Number,
        status: Number,
        headers: Object,
        body: Object
    },
    noticeLevel: { type: Number, default: 0 },
    user: String
});

schema.index({ "logTime": -1 });

module.exports = mongoose.model('serverLog', schema);