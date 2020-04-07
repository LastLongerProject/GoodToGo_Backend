const mongoose = require('mongoose');

const schema = mongoose.Schema({
    pushType: String,
    preprocessedMsg: Object,
    options: Object
}, {
    timestamps: true
});

schema.index({
    "pushType": 1,
    "preprocessedMsg.para.lineID": 1,
    "preprocessedMsg.event": 1
});

module.exports = mongoose.model('notification', schema);