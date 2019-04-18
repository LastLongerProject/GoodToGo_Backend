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
        },
        lineId: String
    },
    subscriptionPlan: {
        name: String,
        price: String,
        expireTime: Date
    },
    inNewSystem: Boolean,
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
    registerMethod: {
        type: String,
        default: "default"
    },
    active: {
        type: Boolean,
        default: true
    },
    agreeTerms: {
        type: Boolean,
        default: false
    },
    hasVerified: {
        type: Boolean,
        default: false
    },
    point: {
        type: Number,
        default: 0
    }
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