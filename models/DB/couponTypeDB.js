var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
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
    }
}, {
    timestamps: true
});

const coutionTitle = "注意事項：\n";
const generalCoution = "\t•　本優惠券限使用一次，不得重複使用。\n" +
    "\t•　本優惠券須以行動裝置出示，並由店舖夥伴點選「確定使用」後即可兌換，截圖、翻拍、影印或其他任何形式出示皆不得兌換。\n" +
    "\t•　確定使用優惠券後，須點選「我要使用」向店家出示容器借用畫面。\n" +
    "\t•　若遇不可抗拒之事由導致本優惠券無法使用，好盒器保留更換其他等值優惠券之權利。\n" +
    "\t•　好盒器保有相關細節最終解釋權，如有未盡事宜，好盒器得修訂之。";

userSchema.methods.generateCoution = function () {
    return (this.extraContent !== null ? this.extraContent + "\n" : "") +
        coutionTitle +
        (this.extraCoution !== null ? this.extraCoution + "\n" : "") +
        generalCoution;
};

module.exports = mongoose.model("CouponType", userSchema);