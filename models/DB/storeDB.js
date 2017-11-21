var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    id: Number,
    name: String,
    address: String,
    type: Array,
    img_info: {
        img_src: String,
        img_version: Number
    },
    location: {
        lat: Number,
        lng: Number
    },
    contract: {
        status_code: Number,
        returnable: Boolean,
        borrowable: Boolean
    },
    opening_hours: [{
        open: { day: Number, time: String },
        close: { day: Number, time: String }
    }],
    project: String,
    active: { type: Boolean, default: true }
});

userSchema.index({ "id": 1 });

// create the model for users and expose it to our app
module.exports = mongoose.model('Store', userSchema);