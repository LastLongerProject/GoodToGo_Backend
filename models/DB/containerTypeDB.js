var mongoose = require('mongoose');

var schema = mongoose.Schema({
    typeCode: Number,
    name: String,
    version: { type: Number, default: 0 }
}, {
    timestamps: true
});

schema.index({ "typeCode": 1 });

module.exports = mongoose.model('ContainerType', schema);