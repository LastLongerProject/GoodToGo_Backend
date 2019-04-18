const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('userOrder');

const validateLine = require('../middlewares/validation/validateLine');

const changeContainersState = require('../controllers/containerTrade');

const intReLength = require('@lastlongerproject/toolkit').intReLength;

const NotificationCenter = require('../helpers/notifications/center');

const Coupon = require('../models/DB/couponDB');
const UserOrder = require('../models/DB/userOrderDB');
const CouponState = require('../models/enums/couponEnum').CouponState;
const DataCacheFactory = require('../models/dataCacheFactory');


/**
 * @apiName GetUserCoupons
 * @apiGroup Coupons
 * 
 * @api {get} /coupon/myCoupons Get User's Coupons
 * @apiUse LINE
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *	        myCouponList : [
 *		    {
 *			    couponID : String,
 *			    provider : String,
 *			    title : String,
 *			    expirationDate : Date,
 *			    extraNotice : String,
 *			    imgSrc : Url,
 *              state : String ("used" or "available" or "expired" or "unknown")
 *		    }, ...
 *	        ]
 *      }
 */

router.get('/myCoupons', validateLine, function (req, res, next) {
    const dbUser = req._user;
    const CouponTypeDict = DataCacheFactory.get('couponType');
    Coupon.find({
        "user": dbUser._id
    }, {}, {
        sort: {
            updatedAt: -1
        }
    }, (err, couponList) => {
        if (err) return next(err);

        let availableCouponList = [];
        let unavailableCouponList = [];
        couponList.forEach(aCoupon => {
            let aFormattedCoupon = {
                couponID: aCoupon.couponID,
                provider: CouponTypeDict[aCoupon.couponType].provider,
                title: CouponTypeDict[aCoupon.couponType].title,
                expirationDate: CouponTypeDict[aCoupon.couponType].expirationDate,
                extraNotice: CouponTypeDict[aCoupon.couponType].extraNotice,
                imgSrc: CouponTypeDict[aCoupon.couponType].img_info.img_src // need update
            };
            if (!aCoupon.used && !aCoupon.expired) {
                aFormattedCoupon.state = CouponState.AVAILABLE;
                availableCouponList.push(aFormattedCoupon);
            } else {
                if (aCoupon.used) {
                    aFormattedCoupon.state = CouponState.USED;
                } else if (aCoupon.expired) {
                    aFormattedCoupon.state = CouponState.EXPIRED;
                } else {
                    aFormattedCoupon.state = CouponState.UNKNOWN;
                }
                unavailableCouponList.push(aFormattedCoupon);
            }
        });
        res.json({
            myCouponList: availableCouponList.concat(unavailableCouponList)
        })
    });
});

/**
 * @apiName UseCoupon
 * @apiGroup Coupons
 * 
 * @api {post} /coupon/use/:couponID Use User's Coupon
 * @apiUse LINE
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *          code: '???',
 *          type: 'couponMessage',
 *          message: 'Use Coupon Success'
 *      }
 */

router.post('/use/:couponID', validateLine, function (req, res, next) {
    const dbUser = req._user;
    const CouponID = req.params.couponID;
    const CouponTypeDict = DataCacheFactory.get('couponType');

    if (typeof CouponID !== "string")
        return res.status(401).json({
            code: '???',
            type: 'couponMessage',
            message: `Content not in Correct Format. \nCouponID: ${CouponID}`
        });

    Coupon.findOne({
        "couponID": CouponID
    }, (err, theCoupon) => {
        if (err) return next(err);
        if (!theCoupon || theCoupon.user !== dbUser._id)
            return res.status(401).json({
                code: '???',
                type: 'couponMessage',
                message: `Can't find that Coupon`
            });
        if (CouponTypeDict[theCoupon.couponType].expirationDate < Date.now())
            return res.status(401).json({
                code: '???',
                type: 'couponMessage',
                message: `Coupon Expired`
            });
        theCoupon.used = true
        theCoupon.save((err) => {
            if (err) return next(err);
            res.json({
                code: '???',
                type: 'couponMessage',
                message: 'Use Coupon Success'
            });
        });
    });
});

module.exports = router;