const fs = require('fs');
const mongoose = require('mongoose');

const config = require('../../config/config');

const userSchema = mongoose.Schema({
    couponTypeID: String,
    provider: String,
    title: String,
    announceDate: Date,
    purchaseDeadline: Date,
    expirationDate: Date,
    price: Number,
    amount: {
        total: Number,
        current: Number
    },
    extraNotice: {
        type: String,
        default: null
    },
    extraContent: {
        type: String,
        default: null
    },
    structuredNotice: {
        type: Array,
        default: null
    },
    img_info: {
        img_src: String,
        img_version: Number
    },
    order: {
        type: Number,
        default: 5
    },
    welcomeGift: {
        type: Boolean,
        default: false
    },
    usingCallback: {
        rentContainer: {
            type: Boolean,
            default: false
        },
        containerAmount: {
            type: Number,
            default: null
        },
        storeCode: {
            type: String,
            default: null
        }
    },
    availableForFreeUser: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const templateKeyValidater = /[a-z_&]+/;

userSchema.statics.generateStrucNotice = function (extraContent, extraNotice, cb) {
    fs.readFile(`${config.staticFileDir}/assets/json/couponContentTemplate.json`, (err, rawData) => {
        if (err) return cb(err);
        const templates = JSON.parse(rawData);
        let formattedNotice = [];
        if (extraContent !== null && templateKeyValidater.test(extraContent)) {
            formattedNotice = extraContent
                .split("&")
                .map(oneContent => oneContent.replace(/\b/g, ""))
                .filter(oneContent => templates.contentStrucTemplate[oneContent])
                .map(oneContent => templates.contentStrucTemplate[oneContent]);
        }
        if (extraNotice !== null && templateKeyValidater.test(extraNotice)) {
            formattedNotice.push({
                title: templates.noticeTitle,
                list: extraNotice
                    .split("&")
                    .map(oneNotice => oneNotice.replace(/\b/g, ""))
                    .filter(oneNotice => templates.extraNoticeStrucTemplate[oneNotice])
                    .map(oneNotice => templates.extraNoticeStrucTemplate[oneNotice])
                    .reduce((acc, val) => acc.concat(val), [])
                    .concat(templates.generalNoticeArr)
            });
        }
        cb(null, formattedNotice);
    });
};

module.exports = mongoose.model("CouponType", userSchema);