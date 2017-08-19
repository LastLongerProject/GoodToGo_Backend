var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our user model
var userSchema = mongoose.Schema({
    user : {
        phone        : String,
        password     : String,
        apiKey       : String,
        secretKey    : String
    },
    role : { 
    	typeCode : String,
    	customer : { history : [{
	    	containerID : Number,
	        typeCode    : Number,
	        storeID     : Number,
	        time        : { type: Date, default: Date.now },
	        returned    : Boolean,
	        returnTime  : Date
	    }]},
	    clerk : {
	    	manager : Boolean,
	    	storeID : Number,
	    	history : [{
				containerID   : Number,
				typeCode      : Number,
				customerPhone : String,
				action        : String,
		        time          : { type: Date, default: Date.now }
	    }]},
	    admin : Boolean
	},
    registerTime : { type: Date, default: Date.now }
});

userSchema.index( { "user.phone": 1 } );

// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.user.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);