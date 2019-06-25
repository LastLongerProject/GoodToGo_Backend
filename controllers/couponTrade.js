const queue = require('queue')({
    concurrency: 1,
    autostart: true
});

const Coupon = require('../models/DB/couponDB');
const CouponType = require('../models/DB/couponTypeDB');
const PointLog = require('../models/DB/pointLogDB');

const MyCoupon = require('../models/reply/coupon').myCoupon;

const generateUUID = require('../helpers/tools').generateUUID;
const bindFunction = require('@lastlongerproject/toolkit').bindFunction;

module.exports = {
    purchaseCoupon: function (couponTypeID, dbUser, oriDone) {
        queue.push(taskDone => {
            const done = bindFunction(taskDone, oriDone);
            CouponType.findOne({
                "couponTypeID": couponTypeID,
                "announceDate": {
                    "$lt": Date.now()
                },
                "welcomeGift": false
            }, (err, theCouponType) => {
                if (err) return done(err);
                if (!theCouponType)
                    return done(null, {
                        code: 'L016',
                        type: 'couponTradeMessage',
                        message: `Can't find that CouponType`,
                        txt: "系統維修中>< 請稍後再試！"
                    });
                if (!dbUser.hasPurchase && !theCouponType.availableForFreeUser)
                    return done(null, {
                        code: 'L008',
                        type: 'couponTradeMessage',
                        message: `Please Purchase First`,
                        txt: "需成為鐵粉會員才可使用"
                    });
                if (theCouponType.purchaseDeadline < Date.now())
                    return done(null, {
                        code: 'L017',
                        type: 'couponTradeMessage',
                        message: `Coupon Expired`,
                        txt: "優惠券逾期，無法領取！"
                    });
                if (theCouponType.amount.current <= 0)
                    return done(null, {
                        code: 'L018',
                        type: 'couponTradeMessage',
                        message: `Coupon Sold Out`,
                        txt: "此優惠券已被領光囉！"
                    });
                if (theCouponType.price > dbUser.point)
                    return done(null, {
                        code: 'L019',
                        type: 'couponTradeMessage',
                        message: `Can't Afford that Coupon`,
                        txt: "點數不足，無法領取！"
                    });
                dbUser.point -= theCouponType.price;
                let newPointLog = new PointLog({
                    user: dbUser._id,
                    title: "領取優惠券",
                    body: `${theCouponType.provider} ${theCouponType.title}`,
                    quantityChange: theCouponType.price * -1
                });
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
                        done(null, false, new MyCoupon(newCoupon));
                    })
                    .catch(done);
            });
        });
    },
    welcomeCoupon: function (dbUser, oriDone) {
        if (!dbUser.hasPurchase) return oriDone();
        queue.push(taskDone => {
            const done = bindFunction(taskDone, oriDone);

            CouponType.find({
                "welcomeGift": true,
                "announceDate": {
                    "$lt": Date.now()
                },
                "purchaseDeadline": {
                    "$gte": Date.now()
                },
                "amount.current": {
                    "$gt": 0
                }
            }, (err, couponTypeList) => {
                if (err) return done(err);

                Coupon.find({
                    "user": dbUser._id
                }, (err, couponList) => {
                    if (err) return done(err);

                    Promise
                        .all(couponTypeList
                            .filter(aCouponType => {
                                return couponList.findIndex(aCoupon => {
                                    return aCoupon.couponType.equals(aCouponType._id);
                                }) === -1;
                            })
                            .map(aCouponType => {
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
                                                aCouponType.save((err) => {
                                                    if (err) return reject(err);
                                                    resolve();
                                                });
                                            })
                                        ])
                                        .then(allResolve)
                                        .catch(allReject);
                                });
                            }))
                        .then(() => {
                            done(null);
                        })
                        .catch(done);
                })
            });
        });
    }
};