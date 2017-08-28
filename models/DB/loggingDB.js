var mongoose = require('mongoose');

// define the schema for our user model
var userSchema = mongoose.Schema({
	ip      : String,
	url     : String,
	method  : String,
	hashID  : String,
	reqTime : Date,
	logTime : { type: Date, default: Date.now },
	req     : {
		headers : Object,
		payload : Object,
		body    : Object 
	}
});

userSchema.index( { "hashID": 1 } );

// create the model for users and expose it to our app
module.exports = mongoose.model('logging', userSchema);