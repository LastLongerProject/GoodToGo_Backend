var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    listID: String,
    creator: String,
    boxList: Array,
    destinationStoreID: Number
}, {
    timestamps: true,
    usePushEach: true
});

userSchema.index({
    "listID": 1
});

module.exports = mongoose.model('DeliveryList', userSchema);