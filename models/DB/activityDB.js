var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    ID: String,
    name: String,
    startAt: {type: Date, require: true},
    endAt: {type: Date, require: true}
}, {
    timestamps: true,
    usePushEach: true
});

userSchema.index({
    "startAt": -1
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Activity', userSchema);