const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('deliveryList');
const getDeliverContent = require('../helpers/tools.js').getDeliverContent;
const DataCacheFactory = require('../models/dataCacheFactory');
const validateRequest = require('../middlewares/validation/validateRequest')
    .JWT;
const regAsStore = require('../middlewares/validation/validateRequest')
    .regAsStore;
const regAsAdmin = require('../middlewares/validation/validateRequest')
    .regAsAdmin;
const validateCreateApiContent = require('../middlewares/validation/deliveryList/contentValidation.js')
    .validateCreateApiContent;
const validateBoxingApiContent = require('../middlewares/validation/deliveryList/contentValidation.js')
    .validateBoxingApiContent;
const validateStockApiContent = require('../middlewares/validation/deliveryList/contentValidation.js')
    .validateStockApiContent;
const validateChangeStateApiContent = require('../middlewares/validation/deliveryList/contentValidation.js')
    .validateChangeStateApiContent;
const validateSignApiContent = require('../middlewares/validation/deliveryList/contentValidation.js')
    .validateSignApiContent;
const validateModifyApiContent = require('../middlewares/validation/deliveryList/contentValidation.js').validateModifyApiContent;
const changeStateProcess = require('../controllers/boxTrade.js').changeStateProcess;
const containerStateFactory = require('../controllers/boxTrade.js').containerStateFactory;
const Box = require('../models/DB/boxDB');
const Trade = require('../models/DB/tradeDB');

const DeliveryList = require('../models/DB/deliveryListDB.js');
const ErrorResponse = require('../models/enums/error').ErrorResponse;
const BoxStatus = require('../models/enums/boxEnum').BoxStatus;
const UserRole = require('../models/enums/userEnum').UserRole;

const dateCheckpoint = require('@lastlongerproject/toolkit').dateCheckpoint;
const cleanUndoTrade = require('@lastlongerproject/toolkit').cleanUndoTrade;

const changeContainersState = require('../controllers/containerTrade');
const ProgramStatus = require('../models/enums/programEnum').ProgramStatus;
const historyDays = 14;

/**
 * @apiName DeliveryList create delivery list
 * @apiGroup DeliveryList
 *
 * @api {post} /deliveryList/create/:destiantionStoreId Create delivery list
 * @apiPermission admin
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
 *      {
 *          phone: String,
 *          boxList: [
 *              {
 *                  boxName: String,
 *                  boxOrderContent: [
 *                      {
 *                          containerType: String,
 *                          amount: Number
 *                      },...
 *                  ],
 *                  dueDate: Date
 *              }
 *          ]
 *      }
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "CreateMessage",
            message: "Create Succeed",
            boxIDs: Array
        }
 * @apiUse CreateError
 */
router.post(
    '/create/:storeID',
    regAsAdmin,
    validateRequest,
    validateCreateApiContent,
    function (req, res, next) {
        let creator = req.body.phone;
        let storeID = parseInt(req.params.storeID);

        Promise.all(req._boxArray.map(box => box.save()))
            .then(success => {
                let list = new DeliveryList({
                    listID: req._listID,
                    boxList: req._boxIDs,
                    storeID,
                    creator: creator,
                });
                list.save().then(result => {
                    return res.status(200).json({
                        type: 'CreateMessage',
                        message: 'Create delivery list successfully',
                        boxIDs: req._boxIDs,
                    });
                });
            })
            .catch(err => {
                debug.error(err);
                return res.status(500).json(ErrorResponse.H006);
            });
    }
);

/**
 * @apiName DeliveryList boxing
 * @apiGroup DeliveryList
 *
 * @api {post} /deliveryList/box Boxing
 * @apiPermission admin
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
 *      {
 *          phone: String,
 *          boxList: [
 *              {
 *                  ID: Number,
 *                  containerList: Array,
 *                  comment: String
 *              },...
 *          ]
 *      }
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "BoxMessage",
            message: "Box Succeed"
        }
 * @apiUse CreateError
 */
router.post(
    ['/cleanStation/box', '/box'],
    regAsAdmin,
    validateRequest,
    validateBoxingApiContent,
    function (req, res, next) {
        let dbAdmin = req._user;
        let boxList = req.body.boxList;
        let phone = req.body.phone;

        for (let element of boxList) {
            let boxID = element.ID;
            const containerList = element.containerList;
            const comment = element.comment;

            Box.findOne({
                boxID: boxID,
            },
                function (err, aBox) {
                    if (err) return next(err);
                    if (!aBox)
                        return res.status(403).json({
                            code: 'F012',
                            type: 'BoxingMessage',
                            message: 'Box is not exist',
                        });
                    changeContainersState(
                        containerList,
                        dbAdmin, {
                            action: 'Boxing',
                            newState: 5,
                        }, {
                            boxID,
                            storeID: aBox.storeID
                        },
                        (err, tradeSuccess, reply) => {
                            if (err) {
                                return next(err);
                            }
                            if (!tradeSuccess) return res.status(403).json(reply);
                            aBox.update({
                                containerList: containerList,
                                comment: comment,
                                $push: {
                                    action: {
                                        phone: phone,
                                        boxStatus: BoxStatus.Boxing,
                                        timestamps: Date.now(),
                                    }
                                },
                                status: BoxStatus.Boxing,
                            }, {
                                    upsert: true,
                                }).exec()
                                .then(() => {
                                    return res.status(200).json({
                                        type: 'BoxingMessage',
                                        message: 'Boxing Succeeded',
                                    });
                                }).catch(() => {
                                    return res.status(500).json(ErrorResponse.H006);
                                });
                        }
                    );
                }
            );
        }
    }
);

/**
 * @apiName DeliveryList stock
 * @apiGroup DeliveryList
 *
 * @api {post} /deliveryList/stock Create stock box
 * @apiPermission admin
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
 *      {
 *          phone: String,
 *          boxList: [
 *              {
 *                  boxName: String,
 *                  containerList: Array,
 *              },...
 *          ]
 *      }
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "StockMessage",
            message: "Stock successfully",
            boxIDs: Array
        }
 * @apiUse CreateError
 */
router.post(
    '/stock',
    regAsAdmin,
    validateRequest,
    validateStockApiContent,
    function (req, res, next) {
        const dbAdmin = req._user;
        const boxList = req.body.boxList;

        for (let element of boxList) {
            const containerList = element.containerList;
            const boxID = element.boxID;

            changeContainersState(
                containerList,
                dbAdmin, {
                    action: 'Boxing',
                    newState: 5,
                }, {
                    boxID,
                },
                (err, tradeSuccess, reply) => {
                    if (err) {
                        return next(err);
                    }
                    if (!tradeSuccess) return res.status(403).json(reply);
                    Promise.all(req._boxArray.map(box => box.save()))
                        .then(() => {
                            return res.status(200).json({
                                type: 'StockMessage',
                                message: 'Stock successfully',
                                boxIDs: req._boxIDs
                            });
                        })
                        .catch(err => {
                            debug.error(err);
                            return res.status(500).json(ErrorResponse.H006);
                        });
                }
            );
        }
    }
);

/**
 * @apiName DeliveryList change state
 * @apiGroup DeliveryList
 *
 * @api {post} /deliveryList/changeState Change state
 * @apiPermission admin
 * @apiUse JWT
 * @apiDescription
 *      **available state changing list**: 
 *      - Boxing -> Stocked 
 *      - Boxing -> Delivering 
 *      - Delivering -> Boxing 
 *      - Signed -> Stocked 
 *      - Stocked -> Boxing 
 * @apiParamExample {json} Request-Example:
 *      {
 *          phone: String,
 *          boxList: [
 *              {
 *                  id: String
 *                  newState: String, // State:['Boxing', 'Delivering', 'Signed', 'Stocked'], if you wanna sign a box, use sign api
 *                  [destinationStoreId]: String // only need when update Stocked to Boxing 
 *              },...
 *          ]
 *      }
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "ChangeStateMessage",
            message: "Change state successfully"
        }
 * @apiUse CreateError
 * @apiUse ChangeStateError
 */
router.post(
    '/changeState',
    regAsAdmin,
    validateRequest,
    validateChangeStateApiContent,
    function (req, res, next) {
        let dbAdmin = req._user;
        let phone = req.body.phone;
        let boxList = req.body.boxList;

        for (let element of boxList) {
            const newState = element.newState;
            var boxID = element.id;

            Box.findOne({
                boxID: boxID,
            },
                async function (err, aBox) {
                    if (err) return next(err);
                    if (!aBox)
                        return res.status(403).json({
                            code: 'F012',
                            type: 'BoxingMessage',
                            message: 'Box is not exist'
                        });
                    if (aBox.status === BoxStatus.Stocked && newState === BoxStatus.Boxing && !element.destinationStoreId) {
                        return res.status(403).json(ErrorResponse.H005_3);
                    }
                    if (aBox.status === BoxStatus.Delivering && newState === BoxStatus.Signed) {
                        return res.status(403).json(ErrorResponse.H008);
                    }
                    try {
                        let boxInfo = await changeStateProcess(element, aBox, phone);
                        if (boxInfo.status === ProgramStatus.Success) {
                            return containerStateFactory(newState, aBox, dbAdmin, boxInfo.info, res, next);
                        } else {
                            ErrorResponse.H007.message = result.message;
                            return res.status(403).json(ErrorResponse.H007);
                        }
                    } catch (err) {
                        debug.error(err);
                        next(err);
                    }

                }
            );
        }
    }
);

/**
 * @apiName DeliveryList sign
 * @apiGroup DeliveryList
 *
 * @api {post} /deliveryList/sign Sign
 * @apiPermission admin
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
 *      {
 *          phone: String,
 *          boxList: [
 *              {
 *                  ID: String
 *              },...
 *          ]
 *      }
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "ChangeStateMessage",
            message: "Change State successfully"
        }
 * @apiUse CreateError
 * @apiUse ChangeStateError
 */
router.post(
    '/sign',
    regAsStore,
    regAsAdmin,
    validateRequest,
    validateSignApiContent,
    async function (req, res, next) {
        let dbUser = req._user;
        let phone = req.body.phone;
        let boxList = req.body.boxList;
        var reqByAdmin = req._key.roleType === 'admin';

        for (let element of boxList) {
            var boxID = element.ID;
            element.newState = BoxStatus.Signed;
            Box.findOne({
                boxID: boxID,
            },
                async function (err, aBox) {
                    if (err) return next(err);
                    if (!aBox)
                        return res.status(403).json({
                            code: 'F012',
                            type: 'BoxingMessage',
                            message: 'Box is not exist',
                        });
                    try {
                        let result = await changeStateProcess(element, aBox, phone);
                        if (result.status === ProgramStatus.Success) {
                            return changeContainersState(
                                aBox.containerList,
                                dbUser, {
                                    action: 'Sign',
                                    newState: 1
                                }, {
                                    boxID,
                                    storeID: reqByAdmin ? aBox.storeID : undefined
                                },
                                (err, tradeSuccess, reply) => {
                                    if (err) return next(err);
                                    if (!tradeSuccess) return res.status(500).json(reply);
                                    return res.status(200).json({
                                        type: "SignMessage",
                                        message: "Sign successfully"
                                    });
                                });
                        }
                        ErrorResponse.H007.message = result.message;
                        return res.status(403).json(ErrorResponse.H007);
                    } catch (err) {
                        debug.error(err);
                        next(err);
                    }
                }
            );
        }
    }
);

/**
 * @apiName DeliveryList Get list
 * @apiGroup DeliveryList
 *
 * @api {get} /deliveryList/box/list Box list
 * @apiPermission admin
 * @apiUse JWT
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        [   
            {
                storeID: Number
                boxObjs: [{
                    ID: Number //boxID,
                    boxName: String,
                    dueDate: Date,
                    status: String,
                    action: [
                        {
                            phone: String,
                            boxStatus: String,
                            timestamps: Date
                        },...
                    ],
                    deliverContent: [
                        {
                            amount: Number,
                            containerType: String
                        },...
                    ],
                    orderContent: [
                        {
                            amount: Number,
                            containerType: String
                        },...
                    ],
                    containerList: Array //boxID,
                    comment: String // If comment === "" means no error
                },...]
            },...
        ]
 */
router.get(
    '/box/list',
    regAsAdmin,
    validateRequest,
    async function (req, res, next) {
        let result = [];
        let storeList = DataCacheFactory.get('store');
        for (let i = 0; i < Object.keys(storeList).length; i++) {
            result.push({
                storeID: Number(Object.keys(storeList)[i]),
                boxObjs: []
            });
        }
        Box.find({}, (err, boxes) => {
            if (err) return next(err);
            for (let box of boxes) {
                if (!String(box.storeID)) continue;

                result.forEach(obj => {
                    if (String(obj.storeID) === String(box.storeID)) {
                        obj.boxObjs.push({
                            ID: box.boxID,
                            boxName: box.boxName || "",
                            dueDate: box.dueDate || "",
                            status: box.status || "",
                            action: box.action || [],
                            deliverContent: getDeliverContent(box.containerList),
                            orderContent: box.boxOrderContent || [],
                            containerList: box.containerList,
                            user: box.user,
                            comment: box.comment || ""
                        });
                    }
                });
            }
            result = result.filter(obj => {
                return obj.boxObjs.length > 0;
            });
            return res.status(200).json(result);
        });
    }
);

/**
 * @apiName DeliveryList Get specific status list
 * @apiGroup DeliveryList
 *
 * @api {get} /deliveryList/box/list/:status Specific status box list
 * @apiPermission admin
 * @apiUse JWT
 * @apiDescription
 * **Status**
 * - Created: "Created",
 * - Boxing: "Boxing",
 * - Delivering: "Delivering",
 * - Signed: "Signed",
 * - Stocked: "Stocked"
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        [   
            {
                storeID: Number
                boxObjs: [{
                    ID: Number //boxID,
                    boxName: String,
                    dueDate: Date,
                    status: String,
                    action: [
                        {
                            phone: String,
                            boxStatus: String,
                            timestamps: Date
                        },...
                    ],
                    deliverContent: [
                        {
                            amount: Number,
                            containerType: String
                        },...
                    ],
                    orderContent: [
                        {
                            amount: Number,
                            containerType: String
                        },...
                    ],
                    containerList: Array //boxID,
                    comment: String // If comment === "" means no error
                },...]
            },...
        ]
 */
router.get(
    '/box/list/:status',
    regAsAdmin,
    validateRequest,
    async function (req, res, next) {
        let result = [];
        let storeList = DataCacheFactory.get('store');
        let boxStatus = req.params.status;
        for (let i = 0; i < Object.keys(storeList).length; i++) {
            result.push({
                storeID: Number(Object.keys(storeList)[i]),
                boxObjs: []
            });
        }
        Box.find({
            'status': boxStatus
        }, (err, boxes) => {
            if (err) return next(err);
            for (let box of boxes) {
                if (!String(box.storeID)) continue;

                result.forEach(obj => {
                    if (String(obj.storeID) === String(box.storeID)) {
                        obj.boxObjs.push({
                            ID: box.boxID,
                            boxName: box.boxName || "",
                            dueDate: box.dueDate || "",
                            status: box.status || "",
                            action: box.action || [],
                            deliverContent: getDeliverContent(box.containerList),
                            orderContent: box.boxOrderContent || [],
                            containerList: box.containerList,
                            user: box.user,
                            comment: box.comment || ""
                        });
                    }
                });
            }
            result = result.filter(obj => {
                return obj.boxObjs.length > 0;
            });
            return res.status(200).json(result);
        });
    }
);

/**
 * @apiName DeliveryList Get specific store list
 * @apiGroup DeliveryList
 *
 * @api {get} /deliveryList/box/specificList/:status/:startFrom Specific store and specific status box list
 * @apiPermission clerk
 * @apiUse JWT
 * @apiDescription
 * **Status**
 * - Created: "Created",
 * - Boxing: "Boxing",
 * - Delivering: "Delivering",
 * - Signed: "Signed",
 * - Stocked: "Stocked"
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        
            {
                boxObjs: [{
                    ID: Number //boxID,
                    boxName: String,
                    dueDate: Date,
                    status: String,
                    action: [
                        {
                            phone: String,
                            boxStatus: String,
                            timestamps: Date
                        },...
                    ],
                    deliverContent: [
                        {
                            amount: Number,
                            containerType: String
                        },...
                    ],
                    orderContent: [
                        {
                            amount: Number,
                            containerType: String
                        },...
                    ],
                    containerList: Array //boxID,
                    comment: String // If comment === "" means no error
                },...]
            }
        
 */
router.get(
    '/box/specificList/:status/:startFrom',
    regAsStore,
    validateRequest,
    async function (req, res, next) {

        let boxStatus = req.params.status;
        let storeID = parseInt(req._user.roles.clerk.storeID);
        let startFrom = parseInt(req.params.startFrom);
        let boxObjs = [];

        Box.find({
            'status': boxStatus,
            'storeID': storeID,
            'createdAt': {
                '$lte': dateCheckpoint(startFrom + 1),
                '$gt': dateCheckpoint(startFrom - 14)
            },
        }, (err, boxes) => {
            if (err) return next(err);
            for (let box of boxes) {
                boxObjs.push({
                    ID: box.boxID,
                    boxName: box.boxName || "",
                    dueDate: box.dueDate || "",
                    status: box.status || "",
                    action: box.action || [],
                    deliverContent: getDeliverContent(box.containerList),
                    orderContent: box.boxOrderContent || [],
                    containerList: box.containerList,
                    user: box.user,
                    comment: box.comment || ""
                });
            }

            return res.status(200).json(boxObjs);
        });
    }
);

/**
 * @apiName DeliveryList modify box info
 * @apiGroup DeliveryList
 *
 * @api {patch} /deliveryList/modifyBoxInfo/:boxID Modify box info
 * @apiPermission admin
 * @apiUse JWT
 * @apiDescription 
 * **Can modify** 
 * 
 * 1. "storeID: Number"
 * 
 * 2. "dueDate: Date"
 * 
 * 3. "boxOrderContent: [{containerType, amount},...]"
 * 
 * 4. "containerList: Array<Number>"
 * 
 * 5. "comment: String"
 * 
 * 6. "boxName: String" 
 * 
 * @apiParamExample {json} Request-Example:
 *      {
 *          <the key wanna modify> : <new value>,
 *      }
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "ModifyMessage",
            message: "Modify successfully"
        }
 * @apiUse ModifyError
 */
router.patch('/modifyBoxInfo/:boxID', regAsAdmin, validateRequest, validateModifyApiContent, async function (req, res, next) {
    let boxID = req.params.boxID;
    let dbAdmin = req._user;
    let containerList = req.body['containerList'] ? req.body['containerList'] : undefined;
    req.body['dueDate'] ? req.body['dueDate'] = new Date(req.body['dueDate']) : undefined;

    Box.findOne({
        boxID
    }, async (err, box) => {
        try {
            if (containerList) {
                changeContainersState(
                    box.containerList,
                    dbAdmin, {
                        action: 'Unboxing',
                        newState: 4
                    }, {
                        bypassStateValidation: true,
                    },
                    (err, tradeSuccess, reply) => {
                        if (err) return next(err);
                        if (!tradeSuccess) return res.status(403).json(reply);
                        changeContainersState(
                            containerList,
                            dbAdmin, {
                                action: 'Boxing',
                                newState: 5
                            }, {
                                boxID,
                            },
                            async (err, tradeSuccess, reply) => {
                                if (err) return next(err);
                                if (!tradeSuccess) return res.status(403).json(reply);
                                await box.update(req.body).exec();
                                return res.status(200).json({
                                    type: "ModifyMessage",
                                    message: "Modify successfully"
                                });
                            }
                        );
                    }
                );
            } else {
                await box.update(req.body).exec();
                return res.status(200).json({
                    type: "ModifyMessage",
                    message: "Modify successfully"
                });
            }
        } catch (err) {
            debug.error(err);
            return next(err);
        }
    });
});

/**
 * @apiName DeliveryList delete box info
 * @apiGroup DeliveryList
 *
 * @api {delete} /deliveryList/deleteBox/:boxID Delete box info
 * @apiPermission admin
 * @apiUse JWT
 * @apiDescription 

 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "DeleteMessage",
            message: "Delete successfully"
        }
 */

router.delete('/deleteBox/:boxID', regAsAdmin, validateRequest, function (req, res, next) {
    let boxID = req.params.boxID;

    Box.remove({
        boxID
    })
        .exec()
        .then(() => res.status(200).json({
            type: "DeleteMessage",
            message: "Delete successfully"
        })).catch(err => {
            debug.error(err);
            return next(err);
        });
});

/**
 * @apiName Containers reload history
 * @apiGroup DeliveryList
 *
 * @api {get} /deliveryList/reloadHistory Reload history
 * 
 * @apiUse JWT
 * @apiPermission admin
 * @apiPermission clerk
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            [
                {
                    "containerList": [
                        36
                    ],
                    "status": "reload",
                    "action": [
                        {
                            "boxStatus": "Archived",
                            "timestamps": "2019-04-26T08:50:07.072Z"
                        }
                    ],
                    "orderContent": [
                        {
                            "containerType": "12oz 玻璃杯",
                            "amount": 1
                        }
                    ]
                }
            ]
        }
 *
 */

router.get('/reloadHistory', regAsAdmin, regAsStore, validateRequest, function (req, res, next) {
    var dbUser = req._user;
    var dbKey = req._key;
    var typeDict = DataCacheFactory.get('containerType');
    var queryCond;
    var queryDays;
    if (req.query.days && !isNaN(parseInt(req.query.days))) queryDays = req.query.days;
    else queryDays = historyDays;
    if (dbKey.roleType === UserRole.CLERK)
        queryCond = {
            '$or': [{
                'tradeType.action': 'ReadyToClean',
                'oriUser.storeID': dbUser.roles.clerk.storeID
            }, {
                'tradeType.action': 'UndoReadyToClean'
            }],
            'tradeTime': {
                '$gte': dateCheckpoint(1 - queryDays)
            }
        };
    else
        queryCond = {
            'tradeType.action': {
                '$in': ['ReadyToClean', 'UndoReadyToClean']
            },
            'tradeTime': {
                '$gte': dateCheckpoint(1 - queryDays)
            }
        };
    Trade.find(queryCond, function (err, list) {
        if (err) return next(err);
        if (list.length === 0) return res.json({
            reloadHistory: []
        });
        list.sort((a, b) => a.tradeTime - b.tradeTime);
        cleanUndoTrade('ReadyToClean', list);

        var tradeTimeDict = {};
        list.forEach(aTrade => {
            if (!tradeTimeDict[aTrade.tradeTime]) tradeTimeDict[aTrade.tradeTime] = [];
            tradeTimeDict[aTrade.tradeTime].push(aTrade);
        });

        var boxDict = {};
        var boxDictKey;
        var thisTypeName;
        let typeList = [];
        for (var aTradeTime in tradeTimeDict) {
            tradeTimeDict[aTradeTime].sort((a, b) => a.oriUser.storeID - b.oriUser.storeID);
            tradeTimeDict[aTradeTime].forEach(theTrade => {
                thisTypeName = typeDict[theTrade.container.typeCode].name;
                boxDictKey = `${theTrade.oriUser.storeID}-${theTrade.tradeTime}-${(theTrade.tradeType.oriState === 1)}`;
                if (!boxDict[boxDictKey])
                    boxDict[boxDictKey] = {
                        containerList: [],
                        status: (theTrade.tradeType.oriState === 1) ? 'cleanReload' : 'reload',
                        action: [{
                            boxStatus: BoxStatus.Archived,
                            phone: (dbKey.roleType === UserRole.CLERK) ? undefined : theTrade.newUser.phone,
                            timestamps: theTrade.tradeTime
                        }],
                        storeID: (dbKey.roleType === UserRole.CLERK) ? undefined : theTrade.oriUser.storeID
                    };
                if (typeList.indexOf(thisTypeName) === -1) {
                    typeList.push(thisTypeName);
                    boxDict[boxDictKey].containerList = [];
                }
                boxDict[boxDictKey].containerList.push(theTrade.container.id);
            });
        }

        var boxArr = Object.values(boxDict);
        boxArr.sort((a, b) => b.boxTime - a.boxTime);
        for (var i = 0; i < boxArr.length; i++) {
            boxArr[i].orderContent = [];
            for (var j = 0; j < typeList.length; j++) {
                boxArr[i].orderContent.push({
                    containerType: typeList[j],
                    amount: boxArr[i].containerList.length
                });
            }
        }

        res.json(boxArr);
    });
});

module.exports = router;