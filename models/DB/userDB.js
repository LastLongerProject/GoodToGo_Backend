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
        lineId: String,
        line_liff_userID: String,
        line_channel_userID: String
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
    hasBanned: {
        type: Boolean,
        default: false
    },
    hasPurchase: {
        type: Boolean,
        default: false
    },
    point: {
        type: Number,
        default: 0
    },
    bannedTimes: {
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

userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.user.password);
};

const PurchaseStatus = require('../enums/userEnum').PurchaseStatus;

userSchema.methods.getPurchaseStatus = function () {
    return this.hasPurchase ?
        PurchaseStatus.PURCHASED_USER :
        PurchaseStatus.FREE_USER;
};
userSchema.methods.getBannedTxt = function (action) {
    return `您有容器逾期未歸還，請儘速歸還，不然無法借用容器、領取或使用優惠券喲！`;
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);