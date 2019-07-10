var mongoose = require('mongoose');

// define the schema for our user model
var schema = mongoose.Schema({
    clientId: String,
    phone: String,
    apiKey: String,
    secretKey: String,
    userAgent: String,
    roleType: String,
    user: mongoose.Schema.Types.ObjectId
}, {
    timestamps: true
});

schema.index({
    "phone": 1
});
schema.index({
    "apiKey": 1
});

// create the model for users and expose it to our app
module.exports = mongoose.model('UserKey', schema);