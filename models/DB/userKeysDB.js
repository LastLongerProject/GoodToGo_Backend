var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    phone: String,
    apiKey: String,
    secretKey: String,
    userAgent: String,
    user: mongoose.Schema.Types.ObjectId
}, {
    timestamps: true
});

userSchema.index({ "phone": 1 });
userSchema.index({ "apiKey": 1 });

// create the model for users and expose it to our app
module.exports = mongoose.model('UserKey', userSchema);