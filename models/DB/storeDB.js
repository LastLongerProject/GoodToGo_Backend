var mongoose = require('mongoose');

// define the schema for our user model
var schema = mongoose.Schema({
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
        open: {
            day: Number,
            time: String
        },
        close: {
            day: Number,
            time: String
        }
    }],
    project: String,
    opening_default: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: true
    },
    category: Number,
    activity: Array,
    photos_fromGoogle: {
        type: String,
        default: null
    },
    url_fromGoogle: String
}, {
    timestamps: true
});

schema.index({
    "id": 1
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Store', schema);