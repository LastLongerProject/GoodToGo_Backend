var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    boxID: Number,
    containerList: Array,
    delivering: { type: Boolean, default: false },
    storeID: Number,
    boxTime: { type: Date, default: Date.now() }
});

userSchema.index({ "storeID": 1, "boxID": 1 });

// create the model for users and expose it to our app
module.exports = mongoose.model('Box', userSchema);