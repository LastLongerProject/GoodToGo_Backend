const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('coupon');

const baseUrl = require('../config/config.js').serverBaseUrl;

const couponTrade = require('../controllers/couponTrade');
const generateImgToken = require('../controllers/imageToken').generateToken;
const validateLine = require('../middlewares/validation/validateLine');
const validateRequest = require('../middlewares/validation/validateRequest').JWT;
const regAsAdminManager = require('../middlewares/validation/validateRequest').regAsAdminManager;

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
 *			    notice : String,
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

        generateImgToken((err, token) => {
            if (err) return next(err);
            let availableCouponList = [];
            let unavailableCouponList = [];
            couponList.forEach(aCoupon => {
                let theCouponType = CouponTypeDict[aCoupon.couponType];
                let aFormattedCoupon = {
                    couponID: aCoupon.couponID,
                    provider: theCouponType.provider,
                    title: theCouponType.title,
                    expirationDate: theCouponType.expirationDate,
                    notice: theCouponType.generateCoution(),
                    imgSrc: `${baseUrl}/images/coupon/${theCouponType.couponTypeID}/${token}?ver=${theCouponType.img_info.img_version}`
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
            });
        });
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
 *			    imgSrc : Url,
 *              state : String ("sold_out" or "purchasable" or "cannot_afford")
 *		    }, ...
 *	        ]
 *      }
 */

router.get('/allCoupons', validateLine, function (req, res, next) {
    const dbUser = req._user;

    CouponType.find({
        "announceDate": {
            "$lt": Date.now()
        },
        "purchaseDeadline": {
            "$gt": Date.now()
        },
        "welcomeGift": false
    }, (err, couponTypeList) => {
        if (err) return next(err);

        couponTypeList.sort((a, b) => {
            if (a.order !== b.order) return b - a;
            else return b.updatedAt - a.updatedAt;
        });

        generateImgToken((err, token) => {
            if (err) return next(err);
            let formattedCouponType = [];
            couponTypeList.forEach(aCouponType => {
                let aFormattedCouponType = {
                    couponTypeID: aCouponType.couponTypeID,
                    provider: aCouponType.provider,
                    title: aCouponType.title,
                    expirationDate: aCouponType.purchaseDeadline,
                    price: aCouponType.price,
                    amount: aCouponType.amount.current,
                    imgSrc: `${baseUrl}/images/coupon/${aCouponType.couponTypeID}/${token}?ver=${aCouponType.img_info.img_version}`
                };
                if (aCouponType.amount.current <= 0) {
                    aFormattedCouponType.state = CouponTypeState.SOLD_OUT;
                } else if (aCouponType.price > dbUser.point) {
                    aFormattedCouponType.state = CouponTypeState.CANNOT_AFFORD;
                } else {
                    aFormattedCouponType.state = CouponTypeState.PURCHASEABLE;
                }
                formattedCouponType.push(aFormattedCouponType);
            });
            res.json({
                userPoint: dbUser.point,
                allCouponList: formattedCouponType
            });
        });
    });
});

/**
 * @apiName CouponTypeDetail
 * @apiGroup Coupons
 * 
 * @api {get} /coupon/detail/:couponTypeID Get Coupon Detail
 * @apiUse LINE
 * 
 * @apiSuccessExample {json} Success-Response:
 *      HTTP/1.1 200 
 *      {
 *          couponTypeID : String,
 *          provider : String,
 *          title : String,
 *          expirationDate : Date,
 *          price : Number,
 *          amount : Number,
 *          notice : String,
 *          imgSrc : Url,
 *          state : String ("sold_out" or "purchasable" or "cannot_afford")
 *      }
 */

router.get('/detail/:couponTypeID', validateLine, function (req, res, next) {
    const dbUser = req._user;
    const CouponTypeID = req.params.couponTypeID;

    if (typeof CouponTypeID !== "string")
        return res.status(401).json({
            code: '???',
            type: 'couponMessage',
            message: `Content not in Correct Format. \nCouponTypeID: ${CouponTypeID}`
        });

    CouponType.findOne({
        "couponTypeID": CouponTypeID,
        "announceDate": {
            "$lt": Date.now()
        },
        "purchaseDeadline": {
            "$gt": Date.now()
        }
    }, (err, theCouponType) => {
        if (err) return next(err);

        if (!theCouponType)
            return res.status(401).json({
                code: '???',
                type: 'couponMessage',
                message: `Can't find that CouponType. \nCouponTypeID: ${CouponTypeID}`
            });

        generateImgToken((err, token) => {
            if (err) return next(err);
            let aFormattedCouponType = {
                couponTypeID: theCouponType.couponTypeID,
                provider: theCouponType.provider,
                title: theCouponType.title,
                expirationDate: theCouponType.purchaseDeadline,
                price: theCouponType.price,
                amount: theCouponType.amount.current,
                notice: theCouponType.generateCoution(),
                imgSrc: `${baseUrl}/images/coupon/${theCouponType.couponTypeID}/${token}?ver=${theCouponType.img_info.img_version}`
            };
            if (theCouponType.amount.current <= 0) {
                aFormattedCouponType.state = CouponTypeState.SOLD_OUT;
            } else if (theCouponType.price > dbUser.point) {
                aFormattedCouponType.state = CouponTypeState.CANNOT_AFFORD;
            } else {
                aFormattedCouponType.state = CouponTypeState.PURCHASEABLE;
            }

            res.json(aFormattedCouponType);
        });
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
 *          message: 'Purchase Coupon Success',
 *          newCoupon: {
 *			    couponID : String,
 *			    provider : String,
 *			    title : String,
 *			    expirationDate : Date,
 *			    notice : String,
 *			    imgSrc : Url,
 *              state : String ("used" or "available" or "expired" or "unknown")
 *		    }
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

    couponTrade.purchaseCoupon(CouponTypeID, dbUser, (err, tradeInvalid, newCoupon) => {
        if (err) return next(err);
        if (tradeInvalid) return res.status(401).json(tradeInvalid);
        res.json({
            code: '???',
            type: 'couponMessage',
            message: 'Purchase Coupon Success',
            newCoupon
        });
    });
});

router.post('/addCouponType', regAsAdminManager, validateRequest, function (req, res, next) {
    const newCouponTypeData = req.body.data;

    const newCouponType = new CouponType(newCouponTypeData);
    newCouponType.save((err) => {
        if (err) return next(err);
        res.json({});
    })
});

module.exports = router;