var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    ID: Number,
    typeCode: Number,
    statusCode: { type: Number, default: 4 },
    conbineTo: String,
    storeID: Number,
    cycleCtr: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    checkAt: Date
}, {
    timestamps: true
});

userSchema.index({ "ID": 1 });

// create the model for users and expose it to our app
module.exports = mongoose.model('Container', userSchema);