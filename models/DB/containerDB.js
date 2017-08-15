var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    container : {
    	ID           : Number,
        typeCode     : Number,
        status       : String,
        conbineTo    : String
    }
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Container', userSchema);