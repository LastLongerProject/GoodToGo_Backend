var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

// define the schema for our user model
var userSchema = mongoose.Schema({
    user: {
        phone: String,
        password: String,
        name: {
            type: String,
            default: null
        }
    },
    role: {
        typeCode: String,
        storeID: Number,
        stationID: Number,
        scopeID: Number,
        manager: Boolean
    },
    roles: {
        typeList: [],
        clerk: Object,
        admin: Object,
        bot: Object
    },
    pushNotificationArn: Object,
    registerTime: {
        type: Date,
        default: Date.now
    },
    active: {
        type: Boolean,
        default: false
    },
    purchase: [{
        purchaseTime: {
            type: Date,
            default: Date.now
        },
        expiryTime: Date
    }]
}, {
    usePushEach: true
});

userSchema.index({
    "user.phone": 1
});
userSchema.index({
    "user.apiKey": 1
});

// generating a hash
userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.user.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);