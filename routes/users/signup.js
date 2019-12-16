const express = require('express');
const router = express.Router();
const debug = require('../../helpers/debugger')('users');

const userQuery = require('../../controllers/userQuery');
const couponTrade = require('../../controllers/couponTrade');

const validateDefault = require('../../middlewares/validation/validateDefault');
const validateRequest = require('../../middlewares/validation/validateRequest').JWT;
const regAsStore = require('../../middlewares/validation/validateRequest').regAsStore;
const regAsStoreManager = require('../../middlewares/validation/validateRequest').regAsStoreManager;
const regAsAdminManager = require('../../middlewares/validation/validateRequest').regAsAdminManager;

const UserRole = require('../../models/enums/userEnum').UserRole;
const RegisterMethod = require('../../models/enums/userEnum').RegisterMethod;

const setDefaultPassword = require('../../config/keys').setDefaultPassword;

router.use(function (req, res, next) {
    req._options = {};
    req._setSignupVerification = function (options) {
        if (typeof options === "undefined") options = {};
        req._options.passVerify = options.hasOwnProperty("passVerify") ? options.passVerify : false;
        req._options.needVerified = options.hasOwnProperty("needVerified") ? options.needVerified : true;
        req._options.passPhoneValidation = options.hasOwnProperty("passPhoneValidation") ? options.passPhoneValidation : false;
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

router.post('/', validateDefault, function (req, res, next) {
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

router.post('/clerk', regAsStoreManager, regAsAdminManager, validateRequest, function (req, res, next) {
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
    setDefaultPassword(req);
    userQuery.signup(req, function (err, user, info) {
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

router.post('/storeManager', regAsAdminManager, validateRequest, function (req, res, next) {
    // for CLERK
    req.body.role = {
        typeCode: UserRole.CLERK,
        manager: true,
        storeID: req.body.storeID
    };
    req._setSignupVerification({
        needVerified: false,
        passVerify: true,
        passPhoneValidation: true
    });
    req._options.registerMethod = RegisterMethod.BY_ADMIN;
    setDefaultPassword(req);
    userQuery.signup(req, function (err, user, info) {
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

router.post('/lineUser', validateDefault, function (req, res, next) {
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
});

/**
 * @apiName SignUp-LineUser-Root
 * @apiGroup Users
 * @apiPermission admin_manager
 *
 * @api {post} /users/signup/lineUserRoot Sign up for new line user by admin
 * @apiUse JWT
 * 
 * @apiParam {String} line_liff_userID line_liff_userID of the User.
 * @apiParam {String} line_channel_userID line_channel_userID of the User.
 * @apiParam {String} phone phone of the User.
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Need Verification Code
 *     { 
 *          type: 'signupMessage',
 *          message: 'Authentication succeeded',
 *          userPurchaseStatus: String ("free_user" or "purchased_user")
 *     }
 * @apiUse SignupError
 */

router.post('/lineUserRoot', regAsAdminManager, validateRequest, function (req, res, next) {
    req._options.passVerify = true;
    req._options.agreeTerms = true;
    req._options.registerMethod = RegisterMethod.BY_ADMIN;
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
});

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
router.post('/root', regAsStore, regAsAdminManager, validateRequest, function (req, res, next) {
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
    setDefaultPassword(req);
    userQuery.signup(req, function (err, user, info) {
        if (err) {
            return next(err);
        } else if (!user) {
            return res.status(401).json(info);
        } else {
            res.json(info.body);
        }
    });
});

module.exports = router;