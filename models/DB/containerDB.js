var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    ID: Number,
    typeCode: Number,
    statusCode: Number,
    usedCounter: Number,
    conbineTo: String,
    active: { type: Boolean, default: true }
});

userSchema.index({ "container.ID": 1 });

// create the model for users and expose it to our app
module.exports = mongoose.model('Container', userSchema);