var mongoose = require('mongoose');

var schema = mongoose.Schema({
    createdAt: {
        type: Date,
        default: Date.now()
    },
    stationID: Number
});

schema.index({
    createdAt: 1
},{
    expireAfterSeconds: 86400
});

module.exports = mongoose.model("boxcreation", schema);