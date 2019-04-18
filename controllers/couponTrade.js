const queue = require('queue')({
    concurrency: 1,
    autostart: true
});

const Coupon = require('../models/DB/couponDB');
const CouponType = require('../models/DB/couponTypeDB');
const PointLog = require('../models/DB/pointLogDB');

const generateUUID = require('../helpers/tools').generateUUID;

module.exports = {
    purchaseCoupon: function (couponTypeID, dbUser, done) {
        queue.push(taskDone => {
            CouponType.findOne({
                "couponTypeID": couponTypeID
            }, (err, theCouponType) => {
                if (err) return done(err);
                if (!theCouponType)
                    return done(null, {
                        code: '???',
                        type: 'couponTradeMessage',
                        message: `Can't find that CouponType`
                    });
                if (theCouponType.expirationDate < Date.now())
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
                let newCoupon = new Coupon({
                    couponID: generateUUID(),
                    user: dbUser._id,
                    couponType: theCouponType._id
                });
                theCouponType.amount.current--;

                Promise
                    .all([
                        (resolve, reject) => {
                            dbUser.save((err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        },
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
                            theCouponType.save((err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        }
                    ])
                    .then(() => {
                        done(null, false);
                        taskDone();
                    })
                    .catch(done);
            });
        });
    }
};