var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    storeID: Number,
    boxID: Number
});

userSchema.index({ "storeID": 1 });

// create the model for users and expose it to our app
module.exports = mongoose.model('Delivery', userSchema);