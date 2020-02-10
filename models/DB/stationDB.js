var mongoose = require('mongoose');

var schema = mongoose.Schema({
    ID: Number,
    name: String
}, {
    timestamps: true
});

schema.index({
    "ID": 1
});

module.exports = mongoose.model('Station', schema);