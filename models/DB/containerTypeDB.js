var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    typeCode: Number,
    name: String,
    active: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    icon: {
        "1x": String,
        "2x": String,
        "3x": String
    }
}, {
    timestamps: true
});

userSchema.index({ "typeCode": 1 });

module.exports = mongoose.model('ContainerType', userSchema);