var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
    container : {
    	ID           : Number,
        typeCode     : Number,
        statusCode   : Number,
        usedCount    : Number,
        conbineTo    : String
    }
});

userSchema.index( { "container.ID": 1 } );

// create the model for users and expose it to our app
module.exports = mongoose.model('Container', userSchema);