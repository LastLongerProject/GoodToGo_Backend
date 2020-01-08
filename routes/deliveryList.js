const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('deliveryList');
const getDeliverContent = require('../helpers/tools.js').getDeliverContent;
const getContainerHash = require('../helpers/tools').getContainerHash;
const validateRequest = require('../middlewares/validation/authorization/validateRequest').JWT;
const checkRoleIsStore = require('../middlewares/validation/authorization/validateRequest').checkRoleIsStore;
const checkRoleIsCleanStation = require('../middlewares/validation/authorization/validateRequest').checkRoleIsCleanStation;
const {
    validateCreateApiContent,
    validateBoxingApiContent,
    validateStockApiContent,
    validateChangeStateApiContent,
    validateSignApiContent,
    validateModifyApiContent,
    fetchBoxCreation,
    validateBoxStatus
} = require('../middlewares/validation/content/deliveryList.js');

const changeStateProcess = require('../controllers/boxTrade.js').changeStateProcess;
const containerStateFactory = require('../controllers/boxTrade.js').containerStateFactory;
const Box = require('../models/DB/boxDB');
const Trade = require('../models/DB/tradeDB');
const Store = require('../models/DB/storeDB');

const DeliveryList = require('../models/DB/deliveryListDB.js');
const ErrorResponse = require('../models/enums/error').ErrorResponse;
const BoxStatus = require('../models/enums/boxEnum').BoxStatus;
const BoxAction = require('../models/enums/boxEnum').BoxAction;
const RoleType = require('../models/enums/userEnum').RoleType;
const RoleElement = require('../models/enums/userEnum').RoleElement;
const ContainerAction = require('../models/enums/containerEnum').Action;

const dateCheckpoint = require('../helpers/toolkit').dateCheckpoint;
const isSameDay = require('../helpers/toolkit').isSameDay;

const changeContainersState = require('../controllers/containerTrade');
const ProgramStatus = require('../models/enums/programEnum').ProgramStatus;
const StateChangingError = require('../models/enums/programEnum').StateChangingError;
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
router.post('/create/:storeID', checkRoleIsCleanStation(), validateRequest, fetchBoxCreation, validateCreateApiContent, function (req, res, next) {
    let creator = req.body.phone;
    let storeID = parseInt(req.params.storeID);

    Promise.all(req._boxArray.map(box => box.save()))
        .then(() => {
            let list = new DeliveryList({
                listID: req._listID,
                boxList: req._boxIDs,
                storeID,
                creator
            });
            list.save().then(() => {
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
});

/**
 * @apiName DeliveryList boxing
 * @apiGroup DeliveryList
 *
 * @api {post} /deliveryList/box Boxing
 * @apiPermission admin
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
    {
        phone: String,
        boxContent: {
            ID: Number,
            containerList: Array,
            comment: String
        }
    }
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "BoxMessage",
            message: "Box Succeed"
        }
 * @apiUse CreateError
 */
router.post(['/cleanStation/box', '/box'], checkRoleIsCleanStation(), validateRequest, validateBoxingApiContent, function (req, res, next) {
    let dbUser = req._user;
    let boxContent = req.body.boxContent;
    let phone = req.body.phone;

    const boxID = boxContent.ID;
    const containerList = boxContent.containerList;
    const comment = boxContent.comment;

    Box.findOne({
        boxID: boxID,
    }, function (err, aBox) {
        if (err) return next(err);
        if (!aBox)
            return res.status(403).json({
                code: 'F012',
                type: 'BoxingMessage',
                message: 'Box is not exist',
            });
        changeContainersState(
            containerList,
            dbUser, {
                action: ContainerAction.BOXING,
                newState: 5,
            }, {
                boxID,
                storeID: aBox.storeID
            }, (err, tradeSuccess, reply) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(reply);
                aBox.update({
                        containerList: containerList,
                        containerHash: getContainerHash(containerList),
                        comment: comment,
                        $push: {
                            action: {
                                phone: phone,
                                boxStatus: BoxStatus.Boxing,
                                boxAction: BoxAction.Pack,
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
    });
});

/**
 * @apiName DeliveryList stock
 * @apiGroup DeliveryList
 *
 * @api {post} /deliveryList/stock Create stock box
 * @apiPermission admin
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
    {
        phone: String,
        boxContent: {
            boxName: String,
            containerList: Array,
        }
    }
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "StockMessage",
            message: "Stock successfully",
            boxIDs: Array
        }
 * @apiUse CreateError
 */
router.post('/stock/:storeID?', checkRoleIsCleanStation(), validateRequest, fetchBoxCreation, validateStockApiContent, function (req, res, next) {
    const dbUser = req._user;
    const boxContent = req.body.boxContent;

    const containerList = boxContent.containerList;
    const boxID = boxContent.boxID;

    changeContainersState(
        containerList,
        dbUser, {
            action: ContainerAction.BOXING,
            newState: 5,
        }, {
            boxID,
        }, (err, tradeSuccess, reply) => {
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
});

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
 *      - Dispatching -> Stocked 
 *      - Stocked -> Dispatching 
 * @apiParamExample {json} Request-Example:
    {
        phone: String,
        boxContent: {
            id: String
            newState: String, // State:['Boxing', 'Delivering', 'Signed', 'Stocked'], if you wanna sign a box, use sign api
            [destinationStoreId]: String // only need when update Stocked to Boxing 
        }
    }
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "ChangeStateMessage",
            message: "Change state successfully"
        }
 * @apiUse CreateError
 * @apiUse ChangeStateError
 */
router.post('/changeState', checkRoleIsCleanStation(), validateRequest, validateChangeStateApiContent, function (req, res, next) {
    let dbUser = req._user;
    let phone = req.body.phone;
    let boxContent = req.body.boxContent;

    const newState = boxContent.newState;
    const boxID = boxContent.id;

    Box.findOne({
        boxID: boxID,
    }, async function (err, aBox) {
        if (err) return next(err);
        if (!aBox)
            return res.status(403).json({
                code: 'F012',
                type: 'BoxingMessage',
                message: 'Box is not exist'
            });
        if (aBox.status === BoxStatus.Delivering && newState === BoxStatus.Signed)
            return res.status(403).json(ErrorResponse.H008);

        try {
            let boxInfo = await changeStateProcess(boxContent, aBox, phone);
            if (boxInfo.status === ProgramStatus.Error) {
                switch (boxInfo.errorType) {
                    case StateChangingError.MissingArg:
                        ErrorResponse.H005_4.message += ", Missing Arguments: " + boxInfo.argumentNameList.join(" ,");
                        return res.status(403).json(ErrorResponse.H005_4);
                    case StateChangingError.InvalidStateChanging:
                        ErrorResponse.H007.message = "Invalid box state changing";
                        return res.status(403).json(ErrorResponse.H007);
                    case StateChangingError.ArgumentInvalid:
                        ErrorResponse.H005_4.message += ", " + boxInfo.message;
                        return res.status(403).json(ErrorResponse.H005_4);
                }
            }
            let stateInfo = await containerStateFactory(boxInfo.validatedStateChanging, aBox, dbUser, boxInfo.info);
            if (stateInfo.status !== ProgramStatus.Success) {
                return res.status(403).json(ProgramStatus.message);
            }
            return res.json({
                type: "ChangeStateMessage",
                message: "Change state successfully"
            });
        } catch (err) {
            next(err);
        }
    });
});

/**
 * @apiName DeliveryList sign
 * @apiGroup DeliveryList
 *
 * @api {post} /deliveryList/sign Sign
 * @apiPermission admin
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
    {
        phone: String,
        boxContent: {
            ID: String
        }
    }
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
    checkRoleIsStore(),
    checkRoleIsCleanStation(),
    validateRequest,
    validateSignApiContent,
    async function (req, res, next) {
        let dbUser = req._user;
        let phone = req.body.phone;
        let boxContent = req.body.boxContent;

        const dbRole = req._thisRole;
        let thisStoreID;
        const thisRoleType = dbRole.roleType;
        try {
            switch (thisRoleType) {
                case RoleType.CLEAN_STATION:
                    break;
                case RoleType.STORE:
                    thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
                    break;
                default:
                    next();
            }
        } catch (error) {
            next(error);
        }
        const reqByCleanStation = thisRoleType === RoleType.CLEAN_STATION;

        const boxID = boxContent.ID;
        boxContent.newState = BoxStatus.Signed;
        Box.findOne({
            boxID: boxID,
        }, async function (err, aBox) {
            if (err) return next(err);
            if (!aBox)
                return res.status(403).json({
                    code: 'F012',
                    type: 'BoxingMessage',
                    message: 'Box is not exist',
                });
            if (!reqByCleanStation && aBox.storeID !== thisStoreID)
                return res.status(403).json({
                    code: 'F008',
                    type: 'BoxingMessage',
                    message: "Box is not belong to user's store"
                });
            try {
                let boxInfo = await changeStateProcess(boxContent, aBox, phone);
                if (boxInfo.status !== ProgramStatus.Success) {
                    ErrorResponse.H007.message = boxInfo.message;
                    return res.status(403).json(ErrorResponse.H007);
                }
                let stateInfo = await containerStateFactory(boxInfo.validatedStateChanging, aBox, dbUser, boxInfo.info);
                if (stateInfo.status !== ProgramStatus.Success) {
                    return res.status(403).json(ProgramStatus.message);
                }
                return res.json({
                    type: "SignMessage",
                    message: "Sign successfully"
                });
            } catch (err) {
                next(err);
            }
        });
    }
);

/**
 * @apiName DeliveryList Get Box
 * @apiGroup DeliveryList
 *
 * @api {get} /deliveryList/box/:boxID
 * @apiPermission admin
 * @apiUse JWT
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
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
            }
 */
router.get(
    '/box/:boxID',
    validateRequest,
    async (req, res, next) => {
        const boxID = req.params.boxID
        let box = await Box.findOne({
            boxID
        })

        if (box) {
            res.status(200).json({
                ID: box.boxID,
                storeID: box.storeID,
                boxName: box.boxName || "",
                dueDate: box.dueDate || "",
                status: box.status || "",
                action: box.action || [],
                deliverContent: getDeliverContent(box.containerList),
                orderContent: box.boxOrderContent || [],
                containerList: box.containerList,
                containerHash: box.containerHash,
                user: box.user,
                comment: box.comment || ""
            })
        } else {
            res.status(403).json({
                code: 'F012',
                type: 'BoxingMessage',
                message: 'Box is not exist',
            })
        }
    }
);



const Sorter = {
    CONTAINER: 1 << 2,
    STORE: 1 << 3,
    DESCEND_ARRIVAL: 1 << 4,
    ASCEND_ARRIVAL: 1 << 5,
    DESCEND_CREATED_DATE: 1 << 6,
    ASCEND_CREATED_DATE: 1 << 7
}

async function createTextSearchQuery(keyword) {
    const regex = {
        $regex: keyword,
        $options: 'i'
    }

    let keywordNumber = parseInt(keyword)
    let storeIDs = []

    if (isNaN(keywordNumber)) {
        let stores = await Store.find({
            name: regex
        }).exec()
        storeIDs = (stores && stores.map(aStore => aStore.id)) || []
    }

    let storeIDQuery = {
        storeID: {
            $in: storeIDs
        }
    }

    let searchQuery = !isNaN(keywordNumber) ? {
        $or: [{
                boxName: regex
            },
            {
                $where: `this.boxID.toString().match(/${keyword}/)`
            }
        ].concat(String(keywordNumber) === keyword ? [{
            containerList: keywordNumber
        }] : [])
    } : {
        $or: [{
            boxName: regex
        }].concat(storeIDs.length === 0 ? [] : [storeIDQuery])
    }

    return searchQuery
}

function parseSorter(rawValue) {
    switch (rawValue) {
        case Sorter.CONTAINER:
            return {
                "containerHash": 1
            };
        case Sorter.STORE:
            return {
                "storeID": 1
            };
        case Sorter.DESCEND_ARRIVAL:
            return {
                "deliveringDate": -1
            };
        case Sorter.ASCEND_ARRIVAL:
            return {
                "deliveringDate": 1
            };
        case Sorter.DESCEND_CREATED_DATE:
            return {
                "_id": -1
            };
        default:
            return {
                "_id": 1
            };
    }
}

/**
 * @apiName DeliveryList Get stocked boxes in the specific warehouse
 * @apiGroup DeliveryList
 *
 * @api {get} /deliveryList/box/list/query/:sorter Universal DeliveryList Box Query
 * @apiPermission admin
 * @apiUse JWT
 * @apiParam {storeID} warehouse id
 * @apiParam {offset} offset of the updated date
 * @apiParam {boxStatus[]} desired box status
 * @apiParam {batch} batch size
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
    '/box/list/query/:sorter',
    checkRoleIsCleanStation(),
    validateRequest,
    async function (req, res, next) {
        let boxStatus = req.query.boxStatus;
        let storeID = req.query.storeID && parseInt(req.query.storeID);
        let offset = parseInt(req.query.offset) || 0;
        let batch = parseInt(req.query.batch) || 0;
        let sorterRawValue = parseInt(req.params.sorter) || 1 << 6
        let keyword = req.query.keyword || ''
        const sorter = parseSorter(sorterRawValue)

        let query = {
            storeID,
            'status': boxStatus
        }

        Object.keys(query).forEach(key => query[key] === undefined ? delete query[key] : '');

        if (!Object.keys(query).length)
            return res.status(400).json({
                code: "F014",
                type: "missing parameters",
                message: "At least one query parameter required"
            })

        Object.assign(query, keyword !== '' ? await createTextSearchQuery(keyword) : {})

        Box.find(query)
            .sort(sorter)
            .skip(offset)
            .limit(batch)
            .exec((err, boxes) => {
                if (err) return next(err);
                let boxObjs = boxes.map(box => ({
                    ID: box.boxID,
                    storeID: box.storeID,
                    boxName: box.boxName || "",
                    dueDate: box.dueDate || "",
                    status: box.status || "",
                    action: box.action || [],
                    deliverContent: getDeliverContent(box.containerList),
                    orderContent: box.boxOrderContent || [],
                    containerList: box.containerList,
                    containerHash: box.containerHash,
                    user: box.user,
                    comment: box.comment || "",
                    deliveringDate: box.deliveringDate
                }))
                return res.status(200).json(boxObjs);
            })
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
    checkRoleIsStore(),
    validateRequest,
    async function (req, res, next) {
        let boxStatus = req.params.status;
        const dbRole = req._thisRole;
        let thisStoreID;
        try {
            thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
        } catch (error) {
            next(error);
        }
        let startFrom = parseInt(req.params.startFrom);
        let boxObjs = [];

        Box.find({
            'status': boxStatus,
            'storeID': thisStoreID,
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
                    containerHash: box.containerHash,
                    user: box.user,
                    comment: box.comment || ""
                });
            }

            return res.status(200).json(boxObjs);
        });
    });

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
router.patch('/modifyBoxInfo/:boxID', checkRoleIsCleanStation(), validateRequest, validateModifyApiContent, async function (req, res, next) {
    let boxID = req.params.boxID;
    let dbUser = req._user;
    let containerList = req.body['containerList'] ? req.body['containerList'] : undefined;
    req.body['dueDate'] ? req.body['dueDate'] = new Date(req.body['dueDate']) : undefined;

    Box.findOne({
        boxID
    }, async (err, box) => {
        try {
            if (containerList) {
                changeContainersState(
                    box.containerList,
                    dbUser, {
                        action: ContainerAction,
                        newState: 4
                    }, {
                        bypassStateValidation: true,
                    },
                    (err, tradeSuccess, reply) => {
                        if (err) return next(err);
                        if (!tradeSuccess) return res.status(403).json(reply);
                        changeContainersState(
                            containerList,
                            dbUser, {
                                action: ContainerAction.BOXING,
                                newState: 5
                            }, {
                                boxID,
                            },
                            async (err, tradeSuccess, reply) => {
                                if (err) return next(err);
                                if (!tradeSuccess) return res.status(403).json(reply);

                                let info = {
                                    ...req.body,
                                    containerHash: getContainerHash(containerList),
                                    $push: {
                                        action: {
                                            phone: dbUser.user.phone,
                                            boxStatus: box.status,
                                            boxAction: BoxAction.Pack,
                                            timestamps: Date.now()
                                        }
                                    }
                                }

                                await box.update(info).exec();
                                return res.status(200).json({
                                    type: "ModifyMessage",
                                    message: "Modify successfully"
                                });
                            }
                        );
                    }
                );
            } else {
                let info = {
                    ...req.body
                };

                if (info.storeID !== undefined || info.dueDate !== undefined) {
                    let assignAction = info.storeID && box.storeID !== info.storeID && {
                        phone: dbUser.user.phone,
                        destinationStoreId: info.storeID,
                        boxStatus: box.status,
                        boxAction: BoxAction.Assign,
                        timestamps: Date.now()
                    }

                    let modifyDateAction = info.dueDate && !isSameDay(info.dueDate, box.dueDate) && {
                        phone: dbUser.user.phone,
                        boxStatus: box.status,
                        boxAction: BoxAction.ModifyDueDate,
                        timestamps: Date.now()
                    }

                    info = {
                        ...info,
                        deliveringDate: info.storeID && box.storeID !== info.storeID && Date.now(),
                        $push: {
                            action: {
                                $each: [modifyDateAction, assignAction].filter(e => e)
                            }
                        }
                    }
                }

                await box.update(info).exec();
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

router.delete('/deleteBox/:boxID', checkRoleIsCleanStation(), validateRequest, function (req, res, next) {
    let boxID = req.params.boxID;
    let dbUser = req._user;

    Box.findOne({
            boxID
        })
        .exec()
        .then(aBox => {
            return changeContainersState(
                aBox.containerList,
                dbUser, {
                    action: ContainerAction.UNBOXING,
                    newState: 4
                }, {
                    bypassStateValidation: true,
                },
                async (err, tradeSuccess, reply) => {
                    if (err) return next(err);
                    if (!tradeSuccess) return res.status(403).json(reply);
                    await aBox.remove();
                    return res.status(200).json({
                        type: "DeleteMessage",
                        message: "Delete successfully"
                    });
                }
            );
        }).catch(err => {
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

router.get('/reloadHistory', checkRoleIsCleanStation(), checkRoleIsStore(), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStoreID;
    let thisRoleType = dbRole.roleType;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        next(error);
    }
    const batch = parseInt(req.query.batch) || 0
    const offset = parseInt(req.query.offset) || 0
    const isCleanReload = req.query.cleanReload === 'true'
    const needBoth = req.query.cleanReload === undefined
    var queryCond = (thisRoleType === RoleType.STORE) ? {
        'tradeType.action': 'ReadyToClean',
        'oriUser.storeID': thisStoreID,
        'tradeTime': {
            '$gte': dateCheckpoint(1 - historyDays)
        }
    } : {
        'tradeType.action': 'ReadyToClean',
        'tradeTime': {
            '$gte': dateCheckpoint(1 - historyDays)
        }
    };

    if (!needBoth) {
        queryCond = isCleanReload ? {
            ...queryCond,
            "tradeType.oriState": 1
        } : {
            ...queryCond,
            "tradeType.oriState": {
                "$ne": 1
            }
        }
    }

    let aggregate = Trade.aggregate([{
        $match: queryCond
    }, {
        $group: {
            _id: {
                timestamp: "$tradeTime",
                state: "$tradeType.oriState",
                oriStore: "$oriUser.storeID"
            },
            containerList: {
                $addToSet: "$container.id"
            },
            newUser: {
                $first: "$newUser"
            },
        }
    }, {
        $project: {
            status: {
                $cond: {
                    if: {
                        $eq: ['$_id.state', 1]
                    },
                    then: "cleanReload",
                    else: "reload",
                }
            },
            dueDate: "$_id.timestamp",
            containerList: "$containerList",
            storeID: "$_id.oriStore",
            action: [{
                boxStatus: BoxStatus.Archived,
                boxAction: BoxAction.Archive,
                phone: {
                    $cond: {
                        if: {
                            $eq: [thisRoleType, RoleType.STORE]
                        },
                        then: undefined,
                        else: "$newUser.phone"
                    }
                },
                timestamps: "$_id.timestamp"
            }]
        }
    }])

    if (batch) {
        aggregate = aggregate.limit(batch)
    }

    aggregate
        .skip(offset)
        .sort({
            dueDate: -1
        })
        .exec((err, list) => {
            if (err) return next(err);
            list.forEach(box => {
                const content = getDeliverContent(box.containerList)
                box.orderContent = content
                box.deliverContent = content
                box.containerHash = getContainerHash(box.containerList)
                box._id = undefined
            });

            res.status(200).json(list);
        })
});

/**
 * @apiName DeliveryList Get delivery list overview
 * @apiGroup DeliveryList
 *
 * @api {get} /deliveryList/overview Specific clean station's overview
 * @apiPermission admin
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        
            {
                Boxing: Number,
                Delivering: Number,
                Stocked: Number
            }
        
 */
router.get(
    '/overview',
    checkRoleIsCleanStation(),
    validateRequest,
    validateBoxStatus,
    async function (req, res, next) {
        let status = req.query.boxStatus
        let storeID = parseInt(req.query.storeID) || -1
        let query = Array.isArray(status) ? {
            status: {
                $in: status
            }
        } : {
            status
        }

        Object.assign(query, storeID !== -1 ? {
            storeID
        } : {})

        Box.aggregate([{
                $match: query
            }, {
                $group: {
                    _id: null,
                    containerIDs: {
                        $push: '$containerList'
                    },
                    storeIDs: {
                        $addToSet: '$storeID'
                    },
                    total: {
                        $sum: 1
                    }
                }
            }, {
                $project: {
                    _id: 0,
                    containers: {
                        $reduce: {
                            input: '$containerIDs',
                            initialValue: [],
                            in: {
                                $concatArrays: ['$$value', '$$this']
                            }
                        }
                    },
                    storeAmount: {
                        $size: '$storeIDs'
                    },
                    total: '$total'
                }
            }])
            .exec((err, overviews) => {
                if (err) return next(err)
                let overview = overviews[0]

                if (!overview) {
                    return res.status(200).json({
                        containers: [],
                        storeAmount: 0,
                        total: 0
                    })
                }

                res.status(200).json({
                    ...overview,
                    containers: getDeliverContent(overview.containers)
                })
            })
    }
);

module.exports = router;