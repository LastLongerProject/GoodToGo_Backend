const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('coupon');

const baseUrl = require('../config/config.js').serverBaseUrl;

const couponTrade = require('../controllers/couponTrade');
const validateLine = require('../middlewares/validation/validateLine').all;
const forPurchasedUser = require('../middlewares/validation/validateLine').forPurchasedUser;

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
 *              notice_struc : [
 *                  {
 *                      title : String,
 *                      list : [
 *                          String, ...
 *                      ]
 *                  }, ...
 *              ],
 *			    imgSrc : Url,
 *              usingCallback: {
 *                  rentContainer: Boolean, // true
 *                  containerAmount: Number, // 2
 *                  storeCode: String // "0406"
 *              },
 *              state : String ("used" or "available" or "expired" or "unknown")
 *		    }, ...
 *	        ]
 *      }
 */

router.get('/myCoupons', validateLine, function (req, res, next) {
    const dbUser = req._user;
    const CouponTypeDict = DataCacheFactory.get(DataCacheFactory.keys.COUPON_TYPE);
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
            let theCouponType = CouponTypeDict[aCoupon.couponType];
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
    const CouponTypeDict = DataCacheFactory.get(DataCacheFactory.keys.COUPON_TYPE);

    if (dbUser.hasBanned)
        return res.status(403).json({
            code: 'L009',
            type: 'userOrderMessage',
            message: `User is Banned.`,
            txt: dbUser.getBannedTxt("使用")
        });
    if (typeof CouponID !== "string")
        return res.status(403).json({
            code: 'L010',
            type: 'couponMessage',
            message: `Content not in Correct Format.\nCouponID: ${CouponID}`,
            txt: "系統維修中>< 請稍後再試！"
        });

    Coupon.findOne({
        "couponID": CouponID,
        "used": false
    }, (err, theCoupon) => {
        if (err) return next(err);

        if (!theCoupon || !theCoupon.user.equals(dbUser._id))
            return res.status(403).json({
                code: 'L011',
                type: 'couponMessage',
                message: `Can't find that Coupon.\nCouponID: ${CouponID}`,
                txt: "系統維修中>< 請稍後再試！"
            });
        if (!dbUser.hasPurchase && !theCoupon.availableForFreeUser)
            return res.status(403).json({
                code: 'L008',
                type: 'couponTradeMessage',
                message: `Please Purchase First`,
                txt: "需成為鐵粉會員才可使用"
            });
        if (CouponTypeDict[theCoupon.couponType].expirationDate < Date.now()) {
            theCoupon.expired = true
            theCoupon.save((err) => {
                if (err) return next(err);
                res.status(403).json({
                    code: 'L012',
                    type: 'couponMessage',
                    message: `Coupon Expired`,
                    txt: "優惠券逾期，無法使用！"
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
 *              notice_struc : [
 *                  {
 *                      title : String,
 *                      list : [
 *                          String, ...
 *                      ]
 *                  }, ...
 *              ],
 *			    imgSrc : Url,
 *              usingCallback: {
 *                  rentContainer: Boolean, // true
 *                  containerAmount: Number, // 2
 *                  storeCode: String // "0406"
 *              },
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
            if (a.order !== b.order) return a > b ? -1 : 1;
            else if (a.expirationDate - b.expirationDate !== 0) return a.expirationDate.valueOf() > b.expirationDate.valueOf() ? 1 : -1;
            else if (!isNaN(parseInt(a.couponTypeID)) && !isNaN(parseInt(b.couponTypeID))) return parseInt(a.couponTypeID) > parseInt(b.couponTypeID) ? 1 : -1;
            else return a.createdAt > b.createdAt ? 1 : -1;
        });

        let formattedCouponTypeList = couponTypeList.map(aCouponType => {
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
            return aFormattedCouponType;
        });
        res.json({
            userPoint: dbUser.point,
            allCouponList: formattedCouponTypeList
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
 *          notice_struc : [
 *              {
 *                  title : String,
 *                  list : [
 *                      String, ...
 *                  ]
 *              }, ...
 *          ],
 *          imgSrc : Url,
 *          usingCallback: {
 *              rentContainer: Boolean, // true
 *              containerAmount: Number, // 2
 *              storeCode: String // "0406"
 *          },
 *          state : String ("sold_out" or "purchasable" or "cannot_afford")
 *      }
 */

router.get('/detail/:couponTypeID', validateLine, function (req, res, next) {
    const dbUser = req._user;
    const CouponTypeID = req.params.couponTypeID;

    if (typeof CouponTypeID !== "string")
        return res.status(403).json({
            code: 'L013',
            type: 'couponMessage',
            message: `Content not in Correct Format. \nCouponTypeID: ${CouponTypeID}`,
            txt: "系統維修中>< 請稍後再試！"
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
            return res.status(403).json({
                code: 'L014',
                type: 'couponMessage',
                message: `Can't find that CouponType. \nCouponTypeID: ${CouponTypeID}`,
                txt: "系統維修中>< 請稍後再試！"
            });

        let aFormattedCouponType = {
            couponTypeID: theCouponType.couponTypeID,
            provider: theCouponType.provider,
            title: theCouponType.title,
            expirationDate: theCouponType.purchaseDeadline,
            price: theCouponType.price,
            amount: theCouponType.amount.current,
            notice_struc: theCouponType.structuredNotice,
            imgSrc: `${baseUrl}/images/coupon/${theCouponType.couponTypeID}?ver=${theCouponType.img_info.img_version}`,
            usingCallback: theCouponType.usingCallback
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
 *              notice_struc : [
 *                  {
 *                      title : String,
 *                      list : [
 *                          String, ...
 *                      ]
 *                  }, ...
 *              ],
 *			    imgSrc : Url,
 *              usingCallback: {
 *                  rentContainer: Boolean, // true
 *                  containerAmount: Number, // 2
 *                  storeCode: String // "0406"
 *              },
 *              state : String ("used" or "available" or "expired" or "unknown")
 *		    }
 *      }
 */

router.post('/purchase/:couponTypeID', validateLine, forPurchasedUser, function (req, res, next) {
    const dbUser = req._user;
    const CouponTypeID = req.params.couponTypeID;

    if (dbUser.hasBanned)
        return res.status(403).json({
            code: 'L020',
            type: 'userOrderMessage',
            message: `User is Banned.`,
            txt: dbUser.getBannedTxt("領取")
        });
    if (typeof CouponTypeID !== "string")
        return res.status(403).json({
            code: 'L015',
            type: 'couponMessage',
            message: `Content not in Correct Format. \nCouponTypeID: ${CouponTypeID}`,
            txt: "系統維修中>< 請稍後再試！"
        });

    couponTrade.purchaseCoupon(CouponTypeID, dbUser, (err, tradeInvalid, newCoupon) => {
        if (err) return next(err);
        if (tradeInvalid) return res.status(403).json(tradeInvalid);
        res.json({
            code: '???',
            type: 'couponMessage',
            message: 'Purchase Coupon Success',
            newCoupon
        });
    });
});

module.exports = router;