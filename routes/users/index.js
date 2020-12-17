const express = require('express');
const router = express.Router();
const debug = require('../../helpers/debugger')('users/index');

const userQuery = require('../../controllers/userQuery');
const userTrade = require('../../controllers/userTrade');
const pointTrade = require('../../controllers/pointTrade');

const validateLine = require('../../middlewares/validation/authorization/validateLine');
const validateDefault = require('../../middlewares/validation/authorization/validateDefault');
const validateRequest = require('../../middlewares/validation/authorization/validateRequest').JWT;
const checkRoleIsBot = require('../../middlewares/validation/authorization/validateRequest').checkRoleIsBot;
const checkRoleIsStore = require('../../middlewares/validation/authorization/validateRequest').checkRoleIsStore;
const checkRoleIsAdmin = require('../../middlewares/validation/authorization/validateRequest').checkRoleIsAdmin;

const intReLength = require('../../helpers/toolkit').intReLength;
const cleanUndoTrade = require('../../helpers/toolkit').cleanUndoTrade;

const sendSMS = require("../../helpers/aws/SNS").sms_now;
const subscribeSNS = require('../../helpers/aws/SNS').sns_subscribe;
const SnsAppType = require('../../models/enums/notificationEnum').AppType;

const redis = require('../../models/redis');
const User = require('../../models/DB/userDB');
const Trade = require('../../models/DB/tradeDB');
const Coupon = require('../../models/DB/couponDB');
const PointLog = require('../../models/DB/pointLogDB');
const DataCacheFactory = require('../../models/dataCacheFactory');
const getGlobalUsedAmount = require('../../models/computed/containerStatistic').global_used;
const RoleType = require('../../models/enums/userEnum').RoleType;
const RoleElement = require('../../models/enums/userEnum').RoleElement;
const ContainerAction = require('../../models/enums/containerEnum').Action;

const setDefaultPassword = require('../../config/keys').setDefaultPassword;
const getVerificationCode = require('../../config/keys').getVerificationCode;

const signupRoute = require("./signup");
const roleRoute = require("./role");

router.use('/signup', signupRoute);
router.use('/role', roleRoute);

/**
 * @apiName Login
 * @apiGroup Users
 * @apiDescription See "Role" in <a href="#api-_">Auth</a>
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
 *                  "admin": {
 *                      "stationID": Number,
 *                      "manager": Boolean,
 *                      "apiKey": String,
 *                      "secretKey": String
 *                  } // ids' info will store in its own object
 *              },
 *              "roleList": [
 *                  {
 *                      "roleType": String,
 *                      "apiKey": String,
 *                      "secretKey": String,
 *                      "manager": Boolean, // if [roleType] === "store" || [roleType] === "station"
 *                      "stationID": Number,  // if [roleType] === "station"
 *                      "stationName": String,  // if [roleType] === "station"
 *                      "boxable": String,  // if [roleType] === "station"
 *                      "storeID": Number,  // if [roleType] === "store"
 *                      "storeName": String,  // if [roleType] === "store"
 *                      "group": String  // if [roleType] === "customer"
 *                  }
 *              ]
 *          };
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
 * @apiName Fetch
 * @apiGroup Users
 * @apiDescription See "Role" in <a href="#api-_">Auth</a>
 *
 * @api {post} /users/fetchRole User Fetch Role List
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
 *      HTTP/1.1 200 Login Successfully (res.header.authorization)
 *      { 
 *          **Decoded JWT**
 *          payload = {
 *              "roles": {
 *                  "typeList": [ //the list with ids that you can use
 *                      "admin"
 *                  ],
 *                  "admin": {
 *                      "stationID": Number,
 *                      "manager": Boolean,
 *                      "apiKey": String,
 *                      "secretKey": String
 *                  } // ids' info will store in its own object
 *              },
 *              "roleList": [
 *                  {
 *                      "roleType": String,
 *                      "apiKey": String,
 *                      "secretKey": String,
 *                      "manager": Boolean, // if [roleType] === "store" || [roleType] === "station"
 *                      "stationID": Number,  // if [roleType] === "station"
 *                      "stationName": String,  // if [roleType] === "station"
 *                      "boxable": String,  // if [roleType] === "station"
 *                      "storeID": Number,  // if [roleType] === "store"
 *                      "storeName": String,  // if [roleType] === "store"
 *                      "group": String  // if [roleType] === "customer"
 *                  }
 *              ]
 *          };
 *      }
 * @apiUse LoginError
 */

router.post('/fetchRole', validateRequest, function (req, res, next) {
    userQuery.fetchRole(req, function (err, user, info) {
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
 * @apiParam {String} verification_code verification code from sms
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
 * @apiName Reset User's Password
 * @apiGroup Users
 * 
 * @api {post} /users/resetpassword Reset password
 * @apiUse JWT
 * @apiPermission admin_manager
 * 
 * @apiParam {String} phone phone of the User.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Signup Successfully
 *     { 
 *          type: 'resetPassMessage',
 *          message: 'Authentication succeeded' 
 *     }
 * @apiUse ResetPwdError
 */

router.post('/resetpassword', checkRoleIsAdmin({
    "manager": true
}), validateRequest, function (req, res, next) {
    setDefaultPassword(req, true);
    userQuery.resetPass(req, function (err, user, info) {
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
 * @apiName SendVerificationCode
 * @apiGroup Users
 * @apiPermission admin
 *
 * @api {post} /users/sendCode Send Verification Code to User Manually
 * @apiUse JWT
 * 
 * @apiParam {String} phone phone of the User.
 * @apiSuccessExample {json} Success-Response:
    HTTP/1.1 200 Signup Successfully
    { 
        type: 'signupMessage',
        message: 'Send succeeded',
        code: Number
    }
 * @apiUse SignupError
 */
router.post('/sendCode', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    const phone = req.body.phone;
    if (userQuery.phoneIsNotValid(phone))
        return res.status(401).json({
            code: 'D009',
            type: 'resetPassMessage',
            message: 'Phone is not valid'
        });
    const newCode = getVerificationCode();
    sendSMS(`+886${phone.substr(1, 10)}`, `您的好盒器註冊驗證碼為：${newCode}，請於1天內完成驗證。`, function (err, snsMsg) {
        if (err) return next(err);
        const ttl = new Date();
        ttl.setSeconds(ttl.getSeconds() + 60 * 60 * 24);
        userQuery.setVerificationCode(phone, newCode, ttl, err => {
            if (err) return next(err);
            res.json({
                type: 'signupMessage',
                message: 'Send succeeded',
                code: newCode
            });
        });
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
 * @apiParam {String} returnToStoreID set return to storeID.
 * @apiParam {String} reloadToStationID set reload to stationID.
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
router.post('/addbot', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
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
 * @api {post} /users/createBotKey Fetch new key pair for bot 
 * @apiUse JWT
 * 
 * @apiParam {String} bot bot ID.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     { 
 *          type: 'signupMessage',
 *          message: 'Authentication succeeded',
 *          keys: [{
 *              apiKey: String,
 *              secretKey: String,
 *              roleID: String
 *          },...]
 *     }
 */
router.post('/createBotKey', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    userQuery.createBotKey(req, function (err, user, info) {
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
 * @apiName ChangeBotRole
 * @apiGroup Users
 * @apiPermission admin_manager
 *
 * @api {post} /users/changeBotRole Change bot's role setting
 * @apiUse JWT
 * 
 * @apiParam {String} bot bot name.
 * @apiParam {Number} rentFromStoreID StoreID for Rent.
 * @apiParam {Number} returnToStoreID StoreID for Return.
 * @apiParam {Number} reloadToStationID StationID for Reload.
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     { 
 *          type: 'changeBotRoleMessage',
 *          message: 'ChangeBotRole succeeded'
 *     }
 */
router.post('/changeBotRole', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    if (!typeof req.body.bot === "string" ||
        !(req.body.rentFromStoreID === null || typeof req.body.rentFromStoreID === "number") ||
        !(req.body.returnToStoreID === null || typeof req.body.returnToStoreID === "number") ||
        !(req.body.reloadToStationID === null || typeof req.body.reloadToStationID === "number"))
        return res.status(401).json({
            code: 'D???',
            type: 'changeBotRoleMessage',
            message: 'Content is not complete'
        });
    User.findOne({
        "user.phone": req.body.bot
    }, (err, dbBot) => {
        if (err) return next(err);
        if (dbBot.roleList[0].roleType !== RoleType.BOT)
            return next(new Error("Unknown Error: Bot's Role Structure in Database is invalid."))
        dbBot.roles.bot.rentFromStoreID = req.body.rentFromStoreID;
        dbBot.roleList[0].rentFromStoreID = req.body.rentFromStoreID;
        dbBot.roles.bot.returnToStoreID = req.body.returnToStoreID;
        dbBot.roleList[0].returnToStoreID = req.body.returnToStoreID;
        dbBot.roles.bot.reloadToStationID = req.body.reloadToStationID;
        dbBot.roleList[0].reloadToStationID = req.body.reloadToStationID;
        if (dbBot.roles.clerk)
            dbBot.roles.clerk.storeID = req.body.returnToStoreID;
        dbBot.markModified('roles');
        dbBot.markModified('roleList');
        dbBot.save(err => {
            if (err) return next(err);
            res.json({
                type: 'changeBotRoleMessage',
                message: 'ChangeBotRole succeeded',
            });
        });
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

router.get('/data/byToken', checkRoleIsStore(), checkRoleIsBot(), validateRequest, function (req, res, next) {
    const key = req.headers.userapikey;
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
        }, (err, dbUser) => {
            if (err) return next(err);
            var store = DataCacheFactory.get(DataCacheFactory.keys.STORE);
            var containerType = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
            Trade.find({
                $or: [{
                        'tradeType.action': ContainerAction.RENT,
                        'newUser.phone': dbUser.user.phone,
                    }, {
                        'tradeType.action': ContainerAction.UNDO_RENT,
                        'oriUser.phone': dbUser.user.phone,
                    },
                    {
                        'tradeType.action': ContainerAction.RETURN,
                        'oriUser.phone': dbUser.user.phone,
                    },
                    {
                        'tradeType.action': ContainerAction.UNDO_RETURN,
                        'newUser.phone': dbUser.user.phone,
                    },
                ],
            }, function (err, tradeList) {
                if (err) return next(err);

                tradeList.sort((a, b) => a.tradeTime - b.tradeTime);
                cleanUndoTrade([ContainerAction.RENT, ContainerAction.RETURN], tradeList);

                var containerKey;
                var tmpReturnedObject;
                var inUsedDict = {};
                var returnedList = [];
                tradeList.forEach(aTrade => {
                    containerKey = aTrade.container.id + '-' + aTrade.container.cycleCtr;
                    if (aTrade.tradeType.action === ContainerAction.RENT) {
                        inUsedDict[containerKey] = {
                            container: '#' + intReLength(aTrade.container.id, 3),
                            containerCode: aTrade.container.id,
                            time: aTrade.tradeTime,
                            type: containerType[aTrade.container.typeCode].name,
                            store: store[aTrade.oriUser.storeID].name,
                            cycle: aTrade.container.cycleCtr,
                            returned: false,
                        };
                    } else if (aTrade.tradeType.action === ContainerAction.RETURN && inUsedDict[containerKey]) {
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

                const inUsedList = Object.values(inUsedDict).sort((a, b) => b.time - a.time);
                res.json({
                    usingAmount: inUsedList.length,
                    data: inUsedList.concat(returnedList),
                });
            });
        });
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
    var store = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    var containerType = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
    Trade.find({
            $or: [{
                    'tradeType.action': ContainerAction.RENT,
                    'newUser.phone': dbUser.user.phone,
                }, {
                    'tradeType.action': ContainerAction.UNDO_RENT,
                    'oriUser.phone': dbUser.user.phone,
                },
                {
                    'tradeType.action': ContainerAction.RETURN,
                    'oriUser.phone': dbUser.user.phone,
                },
                {
                    'tradeType.action': ContainerAction.UNDO_RETURN,
                    'newUser.phone': dbUser.user.phone,
                },
            ],
        }, {}, {
            sort: {
                tradeTime: 1
            }
        },
        function (err, tradeList) {
            if (err) return next(err);

            cleanUndoTrade([ContainerAction.RENT, ContainerAction.RETURN], tradeList);

            var containerKey;
            var tmpReturnedObject;
            var inUsedDict = {};
            var returnedList = [];
            tradeList.forEach(aTrade => {
                containerKey = aTrade.container.id + '-' + aTrade.container.cycleCtr;
                if (aTrade.tradeType.action === ContainerAction.RENT) {
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
                    aTrade.tradeType.action === ContainerAction.RETURN &&
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

router.get('/pointLog', validateLine.all, function (req, res, next) {
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

/**
 * @apiName PurchaseStatus
 * @apiGroup Users
 * 
 * @api {get} /users/purchaseStatus Get user purchaseStatus
 * @apiUse LINE_Channel
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *         purchaseStatus : String,
 *         userGroup : String
 *     }
 */

router.get('/purchaseStatus', validateLine.all, function (req, res, next) {
    var dbUser = req._user;
    let theRole;
    let userGroup;
    try {
        theRole = dbUser.findRole({
            roleType: RoleType.CUSTOMER
        });
        userGroup = theRole.getElement(RoleElement.CUSTOMER_GROUP, false);
    } catch (error) {
        return next(error);
    }
    res.json({
        purchaseStatus: dbUser.getPurchaseStatus(),
        userGroup
    });
});

/**
 * @apiName GetMyPhone
 * @apiGroup Users
 * 
 * @api {get} /users/getMyPhone Get user's phone number
 * @apiUse LINE_Channel
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 
 *     {
 *         phone : String
 *     }
 */

router.get('/getMyPhone', validateLine.all, function (req, res, next) {
    const dbUser = req._user;

    res.json({
        phone: dbUser.user.phone
    });
});

/**
 * @apiName UsedHistory
 * @apiGroup Users
 * 
 * @api {get} /users/usedHistory Get user's container using history 
 * @apiUse LINE
 * 
 * @apiSuccessExample {json} Success-Response:
 *  HTTP/1.1 200 
 *  {
 *      history : [
 *          {
 *              containerID : String, // "#123"
 *              containerType : String, // "大器杯"
 *              rentTime : Date,
 *              rentStore : String, // "好盒器基地"
 *              returnTime : Date,
 *              returnStore : String // "好盒器基地"
 *          }, ...
 *      ]
 *  }
 */

router.get('/usedHistory', validateLine.all, function (req, res, next) {
    const dbUser = req._user;
    const ContainerTypeDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
    const StoreDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);

    Trade.find({
        "$or": [{
                "newUser.phone": dbUser.user.phone,
                "tradeType.action": ContainerAction.RENT,
                "container.inLineSystem": true
            },
            {
                'tradeType.action': ContainerAction.UNDO_RENT,
                'oriUser.phone': dbUser.user.phone
            },
            {
                "oriUser.phone": dbUser.user.phone,
                "tradeType.action": ContainerAction.RETURN
            },
            {
                'tradeType.action': ContainerAction.UNDO_RETURN,
                'newUser.phone': dbUser.user.phone
            }
        ]
    }, {}, {
        sort: {
            tradeTime: 1
        }
    }, function (err, tradeList) {
        if (err) return next(err);

        const rentHistory = {};
        const integratedTrade = {};
        cleanUndoTrade([ContainerAction.RENT, ContainerAction.RETURN], tradeList);
        tradeList.forEach(aTrade => {
            const tradeKey = `${aTrade.container.id}-${aTrade.container.cycleCtr}`;
            if (aTrade.tradeType.action === ContainerAction.RENT) {
                rentHistory[tradeKey] = {
                    containerID: `#${aTrade.container.id}`,
                    containerType: ContainerTypeDict[aTrade.container.typeCode].name,
                    rentTime: aTrade.tradeTime,
                    rentStore: StoreDict[aTrade.oriUser.storeID].name
                };
            } else if (aTrade.tradeType.action === ContainerAction.RETURN) {
                if (!rentHistory[tradeKey]) return;
                integratedTrade[tradeKey] = Object.assign(rentHistory[tradeKey], {
                    returnTime: aTrade.tradeTime,
                    returnStore: StoreDict[aTrade.newUser.storeID].name
                });
            }
        });

        res.json({
            history: Object.values(integratedTrade).reverse()
        });
    });
});

router.post('/addPoint/:phone', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    const userToAddPoint = req.params.phone;

    const pointMultiplier = parseInt(req.body.pointMultiplier);
    const toStore = parseInt(req.body.toStore);
    const containerIdList = req.body.containerIdList;
    const bonusPointActivity = req.body.bonusPointActivity;

    if (isNaN(pointMultiplier) || isNaN(toStore) || !Array.isArray(containerIdList) || (bonusPointActivity !== null && typeof bonusPointActivity.txt === "undefined"))
        return res.status(403).json({
            success: false,
            msg: "Para not complete"
        });

    const storeDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    const quantity = containerIdList.length;
    const point = quantity * pointMultiplier;

    if (quantity === 0) return res.status(403).json({
        success: false,
        msg: "No container"
    });

    User.findOne({
        "user.phone": userToAddPoint
    }, (err, theUser) => {
        if (err) return next(err);
        if (!theUser) return res.status(403).json({
            success: false,
            msg: "Can't find the User"
        });
        pointTrade.sendPoint(point, theUser, {
            title: `歸還了${quantity}個容器`,
            body: `${containerIdList.join(", ")}` +
                ` @ ${storeDict[toStore].name}${bonusPointActivity === null? "": `-${bonusPointActivity.txt}`}`
        });
        res.json({
            success: true,
            phone: userToAddPoint,
            newPoint: theUser.point,
            msg: "Done"
        });
    });
});

router.post('/unbindLineUser/:phone', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    const userToUnbind = req.params.phone;
    User.updateOne({
        "user.phone": userToUnbind
    }, {
        "agreeTerms": false,
        "$unset": {
            "user.line_liff_userID": 1,
            "user.line_channel_userID": 1
        }
    }, (err, raw) => {
        res.json({
            err,
            raw
        });
    });
});

router.post('/addPurchaseUsers', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    const usersToAdd = req.body.userList;
    const tasks = usersToAdd.map(aUser => new Promise((resolve, reject) =>
        userTrade.purchase(aUser, (err, oriUser) => {
            if (err) return reject(err);
            resolve(oriUser);
        })));
    Promise
        .all(tasks)
        .then(results => {
            results = results.filter(aResult => aResult !== null)
            debug.log(`Add ${results.length} Purchase User.`);
            res.json({
                success: true,
                userList: results
            });
        })
        .catch(next);
});

router.post("/banUser/:phone", checkRoleIsAdmin(), validateRequest, (req, res, next) => {
    const byUser = req._user;
    const userPhone = req.params.phone;
    User.findOne({
        "user.phone": userPhone
    }, (err, dbUser) => {
        if (err) return next(err);
        if (!dbUser) return res.json({
            success: false,
            describe: "Can't find user"
        });
        userTrade.banUser(dbUser, null, byUser.user.phone);
        userTrade.refreshUserUsingStatus(dbUser, {
            sendNotice: true,
            banOrUnbanUser: false
        }, err => {
            if (err) return next(err);
            res.json({
                success: true
            });
        });
    });
});

router.post("/unbanUser/:phone", checkRoleIsAdmin(), validateRequest, (req, res, next) => {
    const byUser = req._user;
    const userPhone = req.params.phone;
    User.findOne({
        "user.phone": userPhone
    }, (err, dbUser) => {
        if (err) return next(err);
        if (!dbUser) return res.json({
            success: false,
            describe: "Can't find user"
        });
        userTrade.unbanUser(dbUser, false, byUser.user.phone);
        userTrade.refreshUserUsingStatus(dbUser, {
            sendNotice: true,
            banOrUnbanUser: false
        }, err => {
            if (err) return next(err);
            res.json({
                success: true
            });
        });
    });
});

router.get("/bannedUser", (req, res, next) => { // none json reply
    User.find({
        "hasBanned": true
    }, (err, result) => {
        if (err) return next(err);
        let txt = "";
        result.forEach(aResult => {
            txt += `[${aResult.user.phone}(${aResult.user.name})]、`
        })
        res.send(txt).end();
    });
});

router.get("/couponUsingStatus", (req, res, next) => { // none json reply
    User.find({
        "hasPurchase": true,
        "agreeTerms": true
    }, (err, result) => {
        if (err) return next(err);
        Coupon.find({
            "used": true
        }, (err, couponList) => {
            if (err) return next(err);
            const couponDict = {};
            couponList.forEach(aCoupon => {
                if (!couponDict[aCoupon.user]) couponDict[aCoupon.user] = 0;
                couponDict[aCoupon.user]++;
            });
            let txt = '<table border="1">' +
                "<tr><th>電話（名字）</th><th>點數</th><th>使用過的優惠券數量</th></tr>";
            result.forEach(aResult => {
                txt += `<tr><td>${aResult.user.phone}（${aResult.user.name || "未命名"}）</td>` +
                    `<td>${aResult.point}</td>` +
                    `<td>${couponDict[aResult._id] || 0}</tr>`;
            })
            txt += "</table>"
            res.send(txt).end();
        });
    });
});

module.exports = router;