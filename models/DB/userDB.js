var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

// define the schema for our user model
var schema = mongoose.Schema({
    user: {
        phone: String,
        password: String,
        name: {
            type: String,
            default: null
        },
        lineId: String,
        line_liff_userID: String,
        line_channel_userID: String,
        worker_id: String
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

schema.index({
    "user.phone": 1
});
schema.index({
    "user.apiKey": 1
});

schema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

schema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.user.password);
};

const PurchaseStatus = require('../enums/userEnum').PurchaseStatus;

schema.methods.getPurchaseStatus = function () {
    return this.hasPurchase ?
        PurchaseStatus.PURCHASED_USER :
        PurchaseStatus.FREE_USER;
};
schema.methods.getBannedTxt = function (action) {
    return `${this.bannedTimes <= 1?
        `您有容器逾期未歸還，請儘速歸還，不然無法借用容器、領取或使用優惠券喲！` :
        `您已被停權，無法${action}！\n欲解除停權，請私訊好盒器粉專。`}`;
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', schema);