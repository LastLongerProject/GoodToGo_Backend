const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('coupon');

const couponTrade = require('../controllers/couponTrade');
const validateLine = require('../middlewares/validation/validateLine');

const Coupon = require('../models/DB/couponDB');
const CouponType = require('../models/DB/couponTypeDB');
const CouponState = require('../models/enums/couponEnum').CouponState;
const CouponTypeState = require('../models/enums/couponEnum').CouponTypeState;
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
        "couponID": CouponID,
        "used": false
    }, (err, theCoupon) => {
        if (err) return next(err);
        if (!theCoupon || theCoupon.user !== dbUser._id)
            return res.status(401).json({
                code: '???',
                type: 'couponMessage',
                message: `Can't find that Coupon`
            });
        if (CouponTypeDict[theCoupon.couponType].expirationDate < Date.now()) {
            theCoupon.expired = true
            theCoupon.save((err) => {
                if (err) return next(err);
                res.status(401).json({
                    code: '???',
                    type: 'couponMessage',
                    message: `Coupon Expired`
                });
            });
        } else {
            theCoupon.used = true
            theCoupon.save((err) => {
                if (err) return next(err);
                res.json({
                    code: '???',
                    type: 'couponMessage',
                    message: 'Use Coupon Success'
                });
            });
        }
    });
});

/**
 * @apiName GetAllCoupons
 * @apiGroup Coupons
 * 
 * @api {get} /coupon/allCoupons Get All Coupons
 * @apiUse LINE
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *          userPoint : Number,
 *	        allCouponList : [
 *		    {
 *			    couponTypeID : String,
 *			    provider : String,
 *			    title : String,
 *			    expirationDate : Date,
 *			    price : Number,
 *			    amount : Number,
 *			    extraNotice : String,
 *			    imgSrc : Url,
 *              state : String ("sold_out" or "available" or "cannot_afford")
 *		    }, ...
 *	        ]
 *      }
 */

router.get('/allCoupons', validateLine, function (req, res, next) {
    const dbUser = req._user;

    CouponType.find({
        "expirationDate": {
            "$gt": Date.now()
        }
    }, (err, couponTypeList) => {
        if (err) return next(err);

        couponTypeList.sort((a, b) => {
            if (a.order !== b.order) return b - a;
            else return b.updatedAt - a.updatedAt;
        });

        let formattedCouponType = [];
        couponTypeList.forEach(aCouponType => {
            let aFormattedCouponType = {
                couponTypeID: aCouponType.couponTypeID,
                provider: aCouponType.provider,
                title: aCouponType.title,
                expirationDate: aCouponType.expirationDate,
                price: aCouponType.price,
                amount: aCouponType.amount.current,
                extraNotice: aCouponType.extraNotice,
                imgSrc: aCouponType.img_info.img_src // need update
            };
            if (aCouponType.amount.current <= 0) {
                aFormattedCouponType.state = CouponTypeState.SOLD_OUT;
            } else if (aCouponType.price > dbUser.point) {
                aFormattedCouponType.state = CouponTypeState.CANNOT_AFFORD;
            } else {
                aFormattedCouponType.state = CouponTypeState.AVAILABLE;
            }
            formattedCouponType.push(aFormattedCouponType);
        });
        res.json({
            userPoint: dbUser.point,
            allCouponList: formattedCouponType
        })
    });
});

/**
 * @apiName PurchaseCoupon
 * @apiGroup Coupons
 * 
 * @api {post} /coupon/purchase/:couponTypeID Purchase Coupon
 * @apiUse LINE
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *          code: '???',
 *          type: 'couponMessage',
 *          message: 'Purchase Coupon Success'
 *      }
 */

router.post('/purchase/:couponTypeID', validateLine, function (req, res, next) {
    const dbUser = req._user;
    const CouponTypeID = req.params.couponTypeID;

    if (typeof CouponTypeID !== "string")
        return res.status(401).json({
            code: '???',
            type: 'couponMessage',
            message: `Content not in Correct Format. \nCouponTypeID: ${CouponTypeID}`
        });

    couponTrade.purchaseCoupon(CouponTypeID, dbUser, (err, tradeInvalid) => {
        if (err) return next(err);
        if (tradeInvalid) return res.status(401).json(tradeInvalid);
        res.json({
            code: '???',
            type: 'couponMessage',
            message: 'Purchase Coupon Success'
        });
    });
});

module.exports = router;