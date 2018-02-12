var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    ID: Number,
    name: String,
    placeID: String,
    contract: {
        returnable: Boolean,
        borrowable: Boolean
    },
    project: String,
    type: String
}, {
    timestamps: true
});

userSchema.index({ "ID": 1 });

module.exports = mongoose.model('PlaceID', userSchema);