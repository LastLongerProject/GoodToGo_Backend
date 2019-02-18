const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('deliveryList');
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
const DeliveryList = require('../models/DB/deliveryListDB.js');
const ErrorResponse = require('../models/variables/error.js').ErrorResponse;
const BoxStatus = require('../models/variables/boxEnum.js').BoxStatus;

const changeContainersState = require('../controllers/containerTrade');
const ProgramStatus = require('../models/variables/programEnum.js').ProgramStatus;

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
 *                  ]
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

        DeliveryList.find({
                listID: req._listID,
            })
            .exec()
            .then(result => {
                if (result.length !== 0) {
                    return res.status(403).json(ErrorResponse.H001);
                }
            })
            .catch(err => {
                debug.error(err);
                return next(err);
            });
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
 *                  boxId: String,
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
            let boxID = element.boxId;
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
                                .then(result => {
                                    return res.status(200).json({
                                        type: 'BoxingMessage',
                                        message: 'Boxing Succeeded',
                                    });
                                }).catch(err => {
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
        let dbAdmin = req._user;
        let boxList = req.body.boxList;

        for (let element of boxList) {
            let boxID = element.boxId;
            const containerList = element.containerList;

            Box.findOne({
                    boxID: boxID,
                },
                function (err, aBox) {
                    if (err) return next(err);
                    if (aBox) return res.status(403).json(ErrorResponse.F012);

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
                                .then(success => {
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
 *      available state changing list: 
 *      Boxing -> Stocked 
 *      , Boxing -> BoxStatus 
 *      , Delivering -> Boxing 
 *      , Signed -> Stocked 
 *      , Stocked -> Boxing 
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
                        let result = await changeStateProcess(element, aBox, phone);
                        if (result.status === ProgramStatus.Success) {
                            return containerStateFactory(newState, aBox, dbAdmin, res, next);
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
 *                  id: String
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
            var boxID = element.id;
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
                            changeContainersState(
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
                                }
                            );
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
                    name: String,
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
                if (!box.storeID) continue;

                result.forEach(obj => {
                    if (obj.storeID === box.storeID) {
                        obj.boxObjs.push({
                            ID: box.boxID,
                            name: box.boxName || "",
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
                    name: String,
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
                if (!box.storeID) continue;

                result.forEach(obj => {
                    if (obj.storeID === box.storeID) {
                        obj.boxObjs.push({
                            ID: box.boxID,
                            name: box.boxName || "",
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
 * @apiName DeliveryList modify box info
 * @apiGroup DeliveryList
 *
 * @api {post} /deliveryList/modifyBoxInfo/:boxID Modify box info
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
                                let result = await box.update(req.body).exec();
                                if (result.ok === 1) {
                                    return res.status(200).json({
                                        type: "ModifyMessage",
                                        message: "Modify successfully"
                                    });
                                }
                                return res.status(500).json(ErrorResponse.H011);
                            }
                        );
                    }
                );
            }
        } catch (err) {
            debug.error(err);
            return next(err);
        }
    });
});

module.exports = router;

function transContainerType(typeCode) {
    let storeList = DataCacheFactory.get('store');
    return storeList[String(typeCode)].name;
}

function getDeliverContent(containerList) {
    let container = DataCacheFactory.get('container');
    let deliverContent = {};
    containerList.forEach(element => {
        if (!deliverContent[container[element]]) deliverContent[container[element]] = {
            amount: 0
        };
        deliverContent[container[element]]['amount']++;
    });

    return Object.keys(deliverContent).map(containerType => {
        return {
            containerType,
            amount: deliverContent[containerType]['amount']
        }
    });
}