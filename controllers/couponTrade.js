const queue = require('queue')({
    concurrency: 1,
    autostart: true
});

const Coupon = require('../models/DB/couponDB');
const CouponType = require('../models/DB/couponTypeDB');
const PointLog = require('../models/DB/pointLogDB');

const CouponState = require('../models/enums/couponEnum').CouponState;

const generateUUID = require('../helpers/tools').generateUUID;
const bindFunction = require('@lastlongerproject/toolkit').bindFunction;

const baseUrl = require('../config/config.js').serverBaseUrl;
const generateImgToken = require('../controllers/imageToken').generateToken;

module.exports = {
    purchaseCoupon: function (couponTypeID, dbUser, oriDone) {
        queue.push(taskDone => {
            const done = bindFunction(taskDone, oriDone);
            CouponType.findOne({
                "couponTypeID": couponTypeID,
                "announceDate": {
                    "$lt": Date.now()
                }
            }, (err, theCouponType) => {
                if (err) return done(err);
                if (!theCouponType)
                    return done(null, {
                        code: '???',
                        type: 'couponTradeMessage',
                        message: `Can't find that CouponType`
                    });
                if (theCouponType.purchaseDeadline < Date.now())
                    return done(null, {
                        code: '???',
                        type: 'couponTradeMessage',
                        message: `Coupon Expired`
                    });
                if (theCouponType.amount.current <= 0)
                    return done(null, {
                        code: '???',
                        type: 'couponTradeMessage',
                        message: `Coupon Sold Out`
                    });
                if (theCouponType.price > dbUser.point)
                    return done(null, {
                        code: '???',
                        type: 'couponTradeMessage',
                        message: `Can't Afford that Coupon`
                    });
                dbUser.point -= theCouponType.price;
                let newPointLog = new PointLog({
                    user: dbUser._id,
                    title: "領取優惠券",
                    body: `${theCouponType.provider} ${theCouponType.title}`,
                    quantityChange: theCouponType.price * -1
                });
                console.log(dbUser._id);
                let newCoupon = new Coupon({
                    couponID: generateUUID(),
                    user: dbUser._id,
                    couponType: theCouponType._id
                });
                theCouponType.amount.current--;

                Promise
                    .all([
                        new Promise((resolve, reject) => {
                            dbUser.save((err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        }),
                        new Promise((resolve, reject) => {
                            newPointLog.save((err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        }),
                        new Promise((resolve, reject) => {
                            newCoupon.save((err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        }),
                        new Promise((resolve, reject) => {
                            theCouponType.save((err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        })
                    ])
                    .then(() => {
                        generateImgToken((err, token) => {
                            if (err) return done(err);
                            done(null, false, {
                                couponID: newCoupon.couponID,
                                provider: theCouponType.provider,
                                title: theCouponType.title,
                                expirationDate: theCouponType.expirationDate,
                                notice: theCouponType.generateCoution(),
                                imgSrc: `${baseUrl}/images/coupon/${theCouponType.couponTypeID}/${token}?ver=${theCouponType.img_info.img_version}`,
                                state: CouponState.AVAILABLE
                            });
                        });
                    })
                    .catch(done);
            });
        });
    },
    welcomeCoupon: function (dbUser, oriDone) {
        queue.push(taskDone => {
            const done = bindFunction(taskDone, oriDone);
            CouponType.find({
                "welcomeGift": true,
                "announceDate": {
                    "$lt": Date.now()
                },
                "amount.current": {
                    $gt: 0
                }
            }, (err, couponTypeList) => {
                if (err) return done(err);

                Promise
                    .all(couponTypeList.map(aCouponType => {
                        let newPointLog = new PointLog({
                            user: dbUser._id,
                            title: "得到優惠券",
                            body: `${aCouponType.provider} ${aCouponType.title}`,
                            quantityChange: 0
                        });
                        let newCoupon = new Coupon({
                            couponID: generateUUID(),
                            user: dbUser._id,
                            couponType: aCouponType._id
                        });
                        aCouponType.amount.current--;

                        return new Promise((allResolve, allReject) => {
                            Promise
                                .all([
                                    (resolve, reject) => {
                                        newPointLog.save((err) => {
                                            if (err) return reject(err);
                                            resolve();
                                        });
                                    },
                                    (resolve, reject) => {
                                        newCoupon.save((err) => {
                                            if (err) return reject(err);
                                            resolve();
                                        });
                                    },
                                    (resolve, reject) => {
                                        aCouponType.save((err) => {
                                            if (err) return reject(err);
                                            resolve();
                                        });
                                    }
                                ])
                                .then(allResolve)
                                .catch(allReject);
                        });
                    }))
                    .then(() => {
                        done(null);
                    })
                    .catch(done);
            });
        });
    }
};