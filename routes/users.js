const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('users');

const userQuery = require('../controllers/userQuery');
const couponTrade = require('../controllers/couponTrade');

const validateLine = require('../middlewares/validation/validateLine');
const validateDefault = require('../middlewares/validation/validateDefault');
const validateRequest = require('../middlewares/validation/validateRequest').JWT;
const regAsBot = require('../middlewares/validation/validateRequest').regAsBot;
const regAsStore = require('../middlewares/validation/validateRequest').regAsStore;
const regAsStoreManager = require('../middlewares/validation/validateRequest').regAsStoreManager;
const regAsAdminManager = require('../middlewares/validation/validateRequest').regAsAdminManager;

const intReLength = require('@lastlongerproject/toolkit').intReLength;
const cleanUndoTrade = require('@lastlongerproject/toolkit').cleanUndoTrade;

const subscribeSNS = require('../helpers/aws/SNS').sns_subscribe;
const SnsAppType = require('../helpers/notifications/enums/sns/appType');

const redis = require('../models/redis');
const User = require('../models/DB/userDB');
const Trade = require('../models/DB/tradeDB');
const PointLog = require('../models/DB/pointLogDB');
const DataCacheFactory = require('../models/dataCacheFactory');
const getGlobalUsedAmount = require('../models/variables/containerStatistic').global_used;

const UserRole = require('../models/enums/userEnum').UserRole;
const RegisterMethod = require('../models/enums/userEnum').RegisterMethod;

router.post(['/signup', '/signup/*'], function (req, res, next) {
    req._options = {};
    req._setSignupVerification = function (options) {
        if (typeof options === "undefined" ||
            typeof options.passVerify === "undefined" ||
            typeof options.passVerify === "undefined")
            return next(new Error("Server Internal Error: Signup"));
        req._options.passVerify = options.passVerify;
        req._options.needVerified = options.needVerified;
    };
    next();
});

/**
 * @apiName SignUp
 * @apiGroup Users
 * @apiPermission clerk
 *
 * @api {post} /users/signup Sign up for new user (step 1)
 * @apiUse DefaultSecurityMethod

 * 
 * @apiParam {String} phone phone of the User.
 * @apiParam {String} password password of the User.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 205 Need Verification Code
 *     { 
 *          type: 'signupMessage',
 *          message: 'Send Again With Verification Code' 
 *     }
 * @apiUse SignupError
 */

/**
 * @apiName SignUp (add verification code)
 * @apiGroup Users
 * @apiPermission clerk
 * 
 * @api {post} /users/signup Sign up for new user (step 2)
 * @apiUse DefaultSecurityMethod
 * 
 * @apiParam {String} phone phone of the User.
 * @apiParam {String} password password of the User.
 * @apiParam {String} verification_code verification code from sms
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Signup Successfully
 *     { 
 *          type: 'signupMessage',
 *          message: 'Authentication succeeded' 
 *     }
 * @apiUse SignupError
 */

router.post('/signup', validateDefault, function (req, res, next) {
    // for CUSTOMER
    req._options.registerMethod = RegisterMethod.CUSTOMER_APP;
    userQuery.signup(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else if (info.needVerificationCode) {
            return res.status(205).json(info.body);
        } else {
            res.json(info.body);
        }
    });
});

/**
 * @apiName SignUp-Clerk
 * @apiGroup Users
 * @apiPermission manager
 *
 * @api {post} /users/signup/clerk Sign up for new clerk
 * @apiUse JWT
 * 
 * @apiParam {String} phone phone of the User.
 * @apiParam {String} password password of the User.
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Signup Successfully
 *     { 
 *          type: 'signupMessage',
 *          message: 'Authentication succeeded' 
 *     }
 * @apiUse SignupError
 */

router.post(
    '/signup/clerk',
    regAsStoreManager,
    regAsAdminManager,
    validateRequest,
    function (req, res, next) {
        // for CLERK
        var dbUser = req._user;
        var dbKey = req._key;
        if (dbKey.roleType === UserRole.CLERK) {
            req.body.role = {
                typeCode: UserRole.CLERK,
                manager: false,
                storeID: dbUser.roles.clerk.storeID
            };
            req._options.registerMethod = RegisterMethod.CLECK_APP_MANAGER;
        } else if (dbKey.roleType === UserRole.ADMIN) {
            req.body.role = {
                typeCode: UserRole.ADMIN,
                manager: false,
                stationID: dbUser.roles.admin.stationID,
            };
            req._options.registerMethod = RegisterMethod.BY_ADMIN;
        }
        req._setSignupVerification({
            needVerified: false,
            passVerify: true
        });
        userQuery.signup(req, function (err, user, info) {
            if (err) {
                return next(err);
            } else if (!user) {
                return res.status(401).json(info);
            } else {
                res.json(info.body);
            }
        });
    }
);

/**
 * @apiName SignUp-Manager
 * @apiGroup Users
 * @apiPermission admin_manager
 *
 * @api {post} /users/signup/storeManager Sign up for new store manager
 * @apiUse JWT
 * 
 * @apiParam {String} phone phone of the User.
 * @apiParam {String} password password of the User.
 * @apiParam {String} storeID store of the store manager.
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Signup Successfully
 *     { 
 *          type: 'signupMessage',
 *          message: 'Authentication succeeded' 
 *     }
 * @apiUse SignupError
 */

router.post(
    '/signup/storeManager',
    regAsAdminManager,
    validateRequest,
    function (req, res, next) {
        // for CLERK
        req.body.role = {
            typeCode: UserRole.CLERK,
            manager: true,
            storeID: req.body.storeID
        };
        req._setSignupVerification({
            needVerified: false,
            passVerify: true
        });
        req._options.registerMethod = RegisterMethod.BY_ADMIN;
        userQuery.signup(req, function (err, user, info) {
            if (err) {
                return next(err);
            } else if (!user) {
                return res.status(401).json(info);
            } else {
                res.json(info.body);
            }
        });
    }
);

/**
 * @apiName SignUp-LineUser
 * @apiGroup Users
 * @apiPermission none
 *
 * @api {post} /users/signup/lineUser Sign up for new line user
 * @apiUse DefaultSecurityMethod
 * 
 * @apiParam {String} line_liff_userID line_liff_userID of the User.
 * @apiParam {String} line_channel_userID line_channel_userID of the User.
 * @apiParam {String} phone phone of the User.
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 205 Need Verification Code
 *     { 
 *          type: 'signupMessage',
 *          message: 'Send Again With Verification Code' 
 *     }
 * @apiUse SignupError
 */

/**
 * @apiName SignUp-LineUser (add verification code)
 * @apiGroup Users
 * @apiPermission none
 *
 * @api {post} /users/signup/lineUser Sign up for new line user (step 2)
 * @apiUse DefaultSecurityMethod
 * 
 * @apiParam {String} line_liff_userID line_liff_userID of the User.
 * @apiParam {String} line_channel_userID line_channel_userID of the User.
 * @apiParam {String} phone phone of the User.
 * @apiParam {String} verification_code verification code from sms.
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Signup Successfully
 *     { 
 *          type: 'signupMessage',
 *          message: 'Authentication succeeded',
 *          userPurchaseStatus: String ("free_user" or "purchased_user")
 *     }
 * @apiUse SignupError
 */

router.post(
    '/signup/lineUser',
    validateDefault,
    function (req, res, next) {
        req._options.agreeTerms = true;
        req._options.registerMethod = RegisterMethod.LINE;
        userQuery.signupLineUser(req, function (err, user, info) {
            if (err) {
                return next(err);
            } else if (!user) {
                return res.status(401).json(info);
            } else if (info.needVerificationCode) {
                return res.status(205).json(info.body);
            } else {
                res.json(info.body);
                couponTrade.welcomeCoupon(user, (err) => {
                    if (err) debug.error(err);
                });
            }
        });
    }
);

/**
 * @apiName SignUp-Root
 * @apiGroup Users
 * @apiPermission admin_clerk
 *
 * @api {post} /users/signup/root Sign up for customer from admin or clerk
 * @apiUse JWT
 * 
 * @apiParam {String} phone phone of the User.
 * @apiParam {String} password password of the User.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Signup Successfully
 *     { 
 *          type: 'signupMessage',
 *          message: 'Authentication succeeded' 
 *     }
 * @apiUse SignupError
 */
router.post(
    '/signup/root',
    regAsStore,
    regAsAdminManager,
    validateRequest,
    function (req, res, next) {
        // for ADMIN and CLERK
        var dbKey = req._key;
        if (String(dbKey.roleType).startsWith(`${UserRole.CLERK}`)) {
            req.body.role = {
                typeCode: UserRole.CUSTOMER
            };
            req._options.registerMethod = RegisterMethod.CLECK_APP;
        } else {
            req._options.registerMethod = RegisterMethod.BY_ADMIN;
        }
        req._setSignupVerification({
            needVerified: String(dbKey.roleType).startsWith(`${UserRole.CLERK}_`),
            passVerify: true
        });
        userQuery.signup(req, function (err, user, info) {
            if (err) {
                return next(err);
            } else if (!user) {
                return res.status(401).json(info);
            } else {
                res.json(info.body);
            }
        });
    }
);

/**
 * @apiName Login
 * @apiGroup Users
 *
 * @api {post} /users/login User login
 * @apiUse DefaultSecurityMethod
 * 
 * @apiParam {String} phone phone of the User.
 * @apiParam {String} password password of the User.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Login Successfully (res.header.authorization)
 *     { 
 *          **Decoded JWT**
 *          payload = {
 *              "roles": {
 *                  "typeList": [ //the list with ids that you can use
 *                      "admin"
 *                  ],
 *              "admin": {
 *                  "stationID": Number,
 *                  "manager": Boolean,
 *                  "apiKey": String,
 *                  "secretKey": String
 *              } // ids' info will store in its own object
 *          } 
 *      }
 *     
 * @apiUse LoginError
 */

router.post('/login', validateDefault, function (req, res, next) {
    userQuery.login(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else {
            res.header('Authorization', info.headers.Authorization);
            res.json(info.body);
        }
    });
});

/**
 * @apiName ModifyPassword
 * @apiGroup Users
 * @apiPermission admin_clerk
 *
 * @api {post} /users/modifypassword Modify user's password
 * @apiUse JWT
 * 
 * @apiParam {String} oripassword original password of the user.
 * @apiParam {String} newpassword new password of the user.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Signup Successfully
 *     { 
 *          type: 'chanPassMessage',
 *          message: 'Change succeeded' 
 *     }
 * @apiUse ChangePwdError
 */

router.post('/modifypassword', validateRequest, function (req, res, next) {
    userQuery.chanpass(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else {
            res.json(info.body);
        }
    });
});

/**
 * @apiName Forgot Password
 * @apiGroup Users
 *
 * @api {post} /users/forgotpassword Forgot password (step 1)
 * @apiUse DefaultSecurityMethod

 * 
 * @apiParam {String} phone phone of the User.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 205 Need Verification Code
 *     { 
 *          type: 'forgotPassMessage',
 *          message: 'Send Again With Verification Code' 
 *     }
 * @apiUse ForgetPwdError
 */

/**
 * @apiName Forgot Password (add verification code)
 * @apiGroup Users
 * 
 * @api {post} /users/forgotpassword Forgot password (step 2)
 * @apiUse DefaultSecurityMethod
 * 
 * @apiParam {String} phone phone of the User.
 * @apiParam {String} new_password new password of the User.
 * @apiParam {String} verification code from sms
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Signup Successfully
 *     { 
 *          type: 'forgotPassMessage',
 *          message: 'Authentication succeeded' 
 *     }
 * @apiUse ForgetPwdError
 */

router.post('/forgotpassword', validateDefault, function (req, res, next) {
    userQuery.forgotpass(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else if (info.needVerificationCode) {
            return res.status(205).json(info.body);
        } else {
            res.json(info.body);
        }
    });
});

/**
 * @apiName Logout
 * @apiGroup Users
 * 
 * @api {post} /users/logout User logout
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Signup Successfully
 *     { 
 *          type: 'logoutMessage',
 *          message: 'Logout succeeded' 
 *     }
 * @apiError {String} Others Remember ‘jti’ and contact me
 */

router.post('/logout', validateRequest, function (req, res, next) {
    userQuery.logout(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else {
            res.json(info);
        }
    });
});

/**
 * @apiName AddBot
 * @apiGroup Users
 * @apiPermission admin_manager
 *
 * @api {post} /users/addbot Add bot 
 * @apiUse JWT
 * 
 * @apiParam {String} botName bot name.
 * @apiParam {String} scopeID scope id.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     { 
 *          type: 'signupMessage',
 *          message: 'Authentication succeeded',
 *          keys: {
 *              apiKey: String,
 *              secretKey: String
 *          } 
 *     }
 * @apiUse AddbotError
 */
router.post('/addbot', regAsAdminManager, validateRequest, function (
    req,
    res,
    next
) {
    userQuery.addBot(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else {
            res.json(info.body);
        }
    });
});

/**
 * @apiName CreateBotKey
 * @apiGroup Users
 * @apiPermission admin_manager
 *
 * @api {post} /users/createBotKey Create new key pair for bot 
 * @apiUse JWT
 * 
 * @apiParam {String} bot bot name.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     { 
 *          type: 'signupMessage',
 *          message: 'Authentication succeeded',
 *          keys: {
 *              apiKey: String,
 *              secretKey: String
 *          } 
 *     }
 */
router.post('/createBotKey', regAsAdminManager, validateRequest, function (
    req,
    res,
    next
) {
    userQuery.createBotKey(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else {
            res.json(info.body);
        }
    });
});

/**
 * @apiName Subscribe SNS service
 * @apiGroup Users
 *
 * @api {post} /users/subscribeSNS Subscribe SNS service
 * @apiUse JWT
 * 
 * @apiParam {String} deviceToken Token of the device.
 * @apiParam {String} appType customer or shop.
 * @apiParam {String} system The system what the user use (ios | android).
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     { 
 *          type: 'subscribeMessage',
 *          message: 'Subscribe succeeded',
 *     }
 * @apiUse SubscribeSNSError
 */
router.post('/subscribeSNS', validateRequest, function (req, res, next) {
    var deviceToken = req.body.deviceToken
        .replace(/\s/g, '')
        .replace('<', '')
        .replace('>', '');
    var type = req.body.appType;
    var system = req.body.system;
    if (
        typeof deviceToken === undefined ||
        typeof type === undefined ||
        typeof system === undefined
    ) {
        return res.status(401).json({
            code: 'D009',
            type: 'subscribeMessage',
            message: 'Content not Complete',
        });
    } else if (!(type === SnsAppType.SHOP || type === SnsAppType.CUSTOMER) || !(system === "ios" || system === "android")) {
        return res.status(401).json({
            code: 'D010',
            type: 'subscribeMessage',
            message: 'Content invalid',
        });
    }
    res.json({
        type: 'subscribeMessage',
        message: 'Subscribe succeeded',
    });
    if (deviceToken !== 'HEYBITCH') {
        var dbUser = req._user;
        subscribeSNS(system, type, deviceToken, function (err, arn) {
            if (err) return debug.error(err);
            var newObject = {};
            if (dbUser.pushNotificationArn)
                for (var key in dbUser.pushNotificationArn)
                    newObject[key] = dbUser.pushNotificationArn[key];
            newObject[type + '-' + system] = arn;
            dbUser.pushNotificationArn = newObject;
            dbUser.save((err) => {
                if (err) return debug.error(err);
            });
        });
    }
});

/**
 * @apiName DataByToken
 * @apiGroup Users
 * 
 * @api {get} /users/byToken Get user data by token
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *	        usingAmount : 0,
 *	        data : [
 *		    {
 *			    container : String, // #001
 *			    time : Date
 *			    returned : Boolean
 *			    type : String // 12oz 玻璃杯
 *			    store : String // 正興咖啡館
 *			    returnTime : Date // If returned == true
 *		    }, ...
 *	        ],
 *	        globalAmount : Number
 *      }
 */

router.get('/data/byToken', regAsStore, regAsBot, validateRequest, function (
    req,
    res,
    next
) {
    var key = req.headers.userapikey;
    redis.get('user_token:' + key, (err, reply) => {
        if (err) return next(err);
        if (!reply)
            return res.status(403).json({
                code: 'F013',
                type: 'borrowContainerMessage',
                message: 'Rent Request Expired',
            });
        User.findOne({
                'user.phone': reply,
            },
            (err, dbUser) => {
                if (err) return next(err);
                var store = DataCacheFactory.get('store');
                var containerType = DataCacheFactory.get('containerType');
                Trade.find({
                        $or: [{
                                'tradeType.action': 'Rent',
                                'newUser.phone': dbUser.user.phone,
                            },
                            {
                                'tradeType.action': 'Return',
                                'oriUser.phone': dbUser.user.phone,
                            },
                            {
                                'tradeType.action': 'UndoReturn',
                                'newUser.phone': dbUser.user.phone,
                            },
                        ],
                    },
                    function (err, tradeList) {
                        if (err) return next(err);

                        tradeList.sort((a, b) => a.tradeTime - b.tradeTime);
                        cleanUndoTrade('Return', tradeList);

                        var containerKey;
                        var tmpReturnedObject;
                        var inUsedDict = {};
                        var returnedList = [];
                        tradeList.forEach(aTrade => {
                            containerKey =
                                aTrade.container.id + '-' + aTrade.container.cycleCtr;
                            if (aTrade.tradeType.action === 'Rent') {
                                inUsedDict[containerKey] = {
                                    container: '#' + intReLength(aTrade.container.id, 3),
                                    containerCode: aTrade.container.id,
                                    time: aTrade.tradeTime,
                                    type: containerType[aTrade.container.typeCode].name,
                                    store: store[aTrade.oriUser.storeID].name,
                                    cycle: aTrade.container.cycleCtr,
                                    returned: false,
                                };
                            } else if (
                                aTrade.tradeType.action === 'Return' &&
                                inUsedDict[containerKey]
                            ) {
                                tmpReturnedObject = {};
                                Object.assign(tmpReturnedObject, inUsedDict[containerKey]);
                                Object.assign(tmpReturnedObject, {
                                    returned: true,
                                    returnTime: aTrade.tradeTime,
                                });
                                delete tmpReturnedObject.cycle;
                                delete inUsedDict[containerKey];
                                returnedList.unshift(tmpReturnedObject);
                            }
                        });

                        var inUsedList = Object.values(inUsedDict).sort(
                            (a, b) => b.time - a.time
                        );
                        res.json({
                            usingAmount: inUsedList.length,
                            data: inUsedList.concat(returnedList),
                        });
                    }
                );
            }
        );
    });
});

/**
 * @apiName Data
 * @apiGroup Users
 * 
 * @api {get} /users/data Get user data
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *	        usingAmount : 0,
 *	        data : [
 *		    {
 *			    container : String, // #001
 *			    time : Date
 *			    returned : Boolean
 *			    type : String // 12oz 玻璃杯
 *			    store : String // 正興咖啡館
 *			    returnTime : Date // If returned == true
 *		    }, ...
 *	        ],
 *	        globalAmount : Number
 *      }
 */

router.get('/data', validateRequest, function (req, res, next) {
    var dbUser = req._user;
    var store = DataCacheFactory.get('store');
    var containerType = DataCacheFactory.get('containerType');
    Trade.find({
            $or: [{
                    'tradeType.action': 'Rent',
                    'newUser.phone': dbUser.user.phone,
                },
                {
                    'tradeType.action': 'Return',
                    'oriUser.phone': dbUser.user.phone,
                },
                {
                    'tradeType.action': 'UndoReturn',
                    'newUser.phone': dbUser.user.phone,
                },
            ],
        },
        function (err, tradeList) {
            if (err) return next(err);

            tradeList.sort((a, b) => a.tradeTime - b.tradeTime);
            cleanUndoTrade('Return', tradeList);

            var containerKey;
            var tmpReturnedObject;
            var inUsedDict = {};
            var returnedList = [];
            tradeList.forEach(aTrade => {
                containerKey = aTrade.container.id + '-' + aTrade.container.cycleCtr;
                if (aTrade.tradeType.action === 'Rent') {
                    inUsedDict[containerKey] = {
                        container: '#' + intReLength(aTrade.container.id, 3),
                        containerCode: aTrade.container.id,
                        time: aTrade.tradeTime,
                        type: containerType[aTrade.container.typeCode].name,
                        store: store[aTrade.oriUser.storeID].name,
                        cycle: aTrade.container.cycleCtr,
                        returned: false,
                    };
                } else if (
                    aTrade.tradeType.action === 'Return' &&
                    inUsedDict[containerKey]
                ) {
                    tmpReturnedObject = {};
                    Object.assign(tmpReturnedObject, inUsedDict[containerKey]);
                    Object.assign(tmpReturnedObject, {
                        returned: true,
                        returnTime: aTrade.tradeTime,
                    });
                    delete tmpReturnedObject.cycle;
                    delete inUsedDict[containerKey];
                    returnedList.unshift(tmpReturnedObject);
                }
            });

            var inUsedList = Object.values(inUsedDict).sort(
                (a, b) => b.time - a.time
            );
            getGlobalUsedAmount((err, globalAmount) => {
                if (err) return next(err);
                res.json({
                    usingAmount: inUsedList.length,
                    data: inUsedList.concat(returnedList),
                    globalAmount,
                });
            });
        }
    );
});

/**
 * @apiName PointLog
 * @apiGroup Users
 * 
 * @api {get} /users/pointLog Get user pointLog
 * @apiUse LINE
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *	        pointLogs : [
 *		    {
 *			    logTime : Date,
 *			    title : String,
 *			    body : String,
 *			    quantityChange : Number
 *		    }, ...
 *	        ]
 *      }
 */

router.get('/pointLog', validateLine, function (req, res, next) {
    var dbUser = req._user;

    PointLog.find({
        "user": dbUser._id
    }, {}, {
        sort: {
            logTime: -1
        }
    }, function (err, pointLogList) {
        if (err) return next(err);

        res.json({
            pointLogs: pointLogList.map(aPointLog => ({
                logTime: aPointLog.logTime,
                title: aPointLog.title,
                body: aPointLog.body,
                quantityChange: aPointLog.quantityChange
            }))
        });
    });
});

module.exports = router;