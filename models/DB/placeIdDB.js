var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    ID: Number,
    name: String,
    placeID: String,
    contract: {
        returnable: Boolean,
        borrowable: Boolean
    },
    active: Boolean,
    project: String,
    type: String,
    category: Number,
    activity: Array
}, {
    timestamps: true
});

userSchema.index({
    "ID": 1
});

module.exports = mongoose.model('PlaceID', userSchema);