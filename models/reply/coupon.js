const DataCacheFactory = require('../dataCacheFactory');

const baseUrl = require('../../config/config.js').serverBaseUrl;

const CouponState = require('../enums/couponEnum').CouponState;
const CouponTypeState = require('../enums/couponEnum').CouponTypeState;

module.exports = {
    myCoupon: function MyCoupon(aCoupon) {
        const CouponTypeDict = DataCacheFactory.get(DataCacheFactory.keys.COUPON_TYPE);
        const theCouponType = CouponTypeDict[aCoupon.couponType];
        let aFormattedCoupon = {
            couponID: aCoupon.couponID,
            provider: theCouponType.provider,
            title: theCouponType.title,
            expirationDate: theCouponType.expirationDate,
            notice_struc: theCouponType.structuredNotice,
            imgSrc: `${baseUrl}/images/coupon/${theCouponType.couponTypeID}?ver=${theCouponType.img_info.img_version}`,
            usingCallback: theCouponType.usingCallback
        };
        if (!aCoupon.used && !aCoupon.expired) {
            aFormattedCoupon.state = CouponState.AVAILABLE;
        } else {
            if (aCoupon.used) {
                aFormattedCoupon.state = CouponState.USED;
            } else if (aCoupon.expired) {
                aFormattedCoupon.state = CouponState.EXPIRED;
            } else {
                aFormattedCoupon.state = CouponState.UNKNOWN;
            }
        }
        Object.assign(this, aFormattedCoupon);
    },
    couponDetail: function CouponDetail(aCouponType, dbUser) {
        let aFormattedCouponType = {
            couponTypeID: aCouponType.couponTypeID,
            provider: aCouponType.provider,
            title: aCouponType.title,
            expirationDate: aCouponType.purchaseDeadline,
            price: aCouponType.price,
            amount: aCouponType.amount.current,
            notice_struc: aCouponType.structuredNotice,
            imgSrc: `${baseUrl}/images/coupon/${aCouponType.couponTypeID}?ver=${aCouponType.img_info.img_version}`,
            usingCallback: aCouponType.usingCallback
        };
        if (aCouponType.amount.current <= 0) {
            aFormattedCouponType.state = CouponTypeState.SOLD_OUT;
        } else if (aCouponType.price > dbUser.point) {
            aFormattedCouponType.state = CouponTypeState.CANNOT_AFFORD;
        } else {
            aFormattedCouponType.state = CouponTypeState.PURCHASEABLE;
        }
        Object.assign(this, aFormattedCouponType);
    }
}