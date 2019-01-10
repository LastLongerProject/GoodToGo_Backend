var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    boxList: Array,
    destinationStore: Number
}, {
    timestamps: true,
    usePushEach: true
});

userSchema.index({
    "listId": 1
});

module.exports = mongoose.model('DeliveryList', userSchema);