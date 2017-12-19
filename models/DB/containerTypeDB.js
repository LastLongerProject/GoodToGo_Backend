var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    typeCode: Number,
    name: String,
    version: { type: Number, default: 0 }
}, {
    timestamps: true
});

userSchema.index({ "typeCode": 1 });

module.exports = mongoose.model('ContainerType', userSchema);