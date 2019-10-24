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
const {
    validateCreateApiContent, 
    validateBoxingApiContent, 
    validateStockApiContent,
    validateChangeStateApiContent,
    validateSignApiContent,
    validateModifyApiContent,
    fetchBoxCreation,
    validateBoxStatus
} = require('../middlewares/validation/deliveryList/contentValidation.js');

const changeStateProcess = require('../controllers/boxTrade.js').changeStateProcess;
const containerStateFactory = require('../controllers/boxTrade.js').containerStateFactory;
const Box = require('../models/DB/boxDB');
const Trade = require('../models/DB/tradeDB');
const Store = require('../models/DB/storeDB');
const Container = require('../models/DB/containerDB');

const DeliveryList = require('../models/DB/deliveryListDB.js');
const ErrorResponse = require('../models/enums/error').ErrorResponse;
const BoxStatus = require('../models/enums/boxEnum').BoxStatus;
const BoxAction = require('../models/enums/boxEnum').BoxAction;
const UserRole = require('../models/enums/userEnum').UserRole;

const dateCheckpoint = require('../helpers/toolkit').dateCheckpoint;
const cleanUndoTrade = require('../helpers/toolkit').cleanUndoTrade;
const isSameDay = require('../helpers/toolkit').isSameDay;

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
    fetchBoxCreation,
    validateCreateApiContent,
    function (req, res, next) {
        let creator = req.body.phone;
        let storeID = parseInt(req.params.storeID);
        
        Promise.all(req._boxArray.map(box => box.save()))
            .then(() => {
                let list = new DeliveryList({
                    listID: req._listID,
                    boxList: req._boxIDs,
                    storeID,
                    creator: creator,
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
    '/stock/:storeID?',
    regAsAdmin,
    validateRequest,
    fetchBoxCreation,
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
                            ErrorResponse.H007.message = boxInfo.message;
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
                        let boxInfo = await changeStateProcess(element, aBox, phone);
                        if (boxInfo.status === ProgramStatus.Success) {
                            return changeContainersState(
                                aBox.containerList,
                                dbUser, {
                                    action: 'Sign',
                                    newState: 1
                                }, {
                                    boxID,
                                    storeID: reqByAdmin ? aBox.storeID : undefined
                                },
                                async (err, tradeSuccess, reply) => {
                                    if (err) return next(err);
                                    if (!tradeSuccess) return res.status(500).json(reply);
                                    return containerStateFactory(BoxStatus.Signed, aBox, dbUser, boxInfo.info, res, next);
                                });
                        }
                        ErrorResponse.H007.message = boxInfo.message;
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
        let storeList = DataCacheFactory.get(DataCacheFactory.keys.STORE);
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
    regAsAdmin, 
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

/**
 * @apiName DeliveryList Get stocked boxes in the specific warehouse
 * @apiGroup DeliveryList
 *
 * @api {get} /deliveryList/box/list/query Universal DeliveryList Box Query
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
    '/box/list/query',
    regAsAdmin,
    validateRequest,
    async function (req, res, next) {
        let boxStatus = req.query.boxStatus;
        let storeID = req.query.storeID && parseInt(req.query.storeID);
        let offset = parseInt(req.query.offset) || 0;
        let batch = parseInt(req.query.batch) || 0;
        let ascend = req.query.ascent !== 'false'

        let query = {
            storeID,
            'status': boxStatus
        }

        Object.keys(query).forEach(key => query[key] === undefined ? delete query[key] : '');

        if (!Object.keys(query).length) 
            return res.status(400).json({code: "F014", type: "missing parameters", message: "At least one query parameter required"})

        const sorter = {"_id": ascend ? 1 : -1}
        const offsetBoxes = await Box.find().sort(sorter).limit(offset + 1).exec()
        const theBox = offsetBoxes.slice(-1).pop()
        const idSorter = ascend ? {'$gte': theBox._id} : {'$lte': theBox._id}

        Box.find( {
            ...query,
            '_id': idSorter
        })
            .sort(sorter)
            .limit(batch)
            .exec((err, boxes) => {
                if (err) return next(err);
                let boxObjs = boxes.map(box=>({
                    ID: box.boxID,
                    storeID: box.storeID,
                    boxName: box.boxName || "",
                    dueDate: box.dueDate || "",
                    status: box.status || "",
                    action: box.action || [],
                    deliverContent: getDeliverContent(box.containerList),
                    orderContent: box.boxOrderContent || [],
                    containerList: box.containerList,
                    user: box.user,
                    comment: box.comment || ""
                }))
                return res.status(200).json(boxObjs);
            })
    }
);

const Sorter = {
    CONTAINER:              1 << 2,
    STORE:                  1 << 3,
    DESCEND_ARRIVAL:        1 << 4,
    ASCEND_ARRIVAL:         1 << 5,
    DESCEND_CREATED_DATE:   1 << 6,
    ASCEND_CREATED_DATE:    1 << 7
}

async function createTextSearchQuery(keyword) {
    const regex = { $regex: keyword, $options: 'i'}

    let keywordNumber = parseInt(keyword)
    let storeIDs = []
    
    if (isNaN(keywordNumber)) {
        let stores = await Store.find({ name: regex }).exec()
        storeIDs = (stores && stores.map(aStore=>aStore.id)) || []
    }

    let storeIDQuery = {
        storeID: { $in: storeIDs }
    }
    
    let searchQuery = !isNaN(keywordNumber) ? {
        $or: [
            {
                boxName: regex
            },
            {
                $where: `this.boxID.toString().match(/${keyword}/)`
            },
            {
                containerList: keywordNumber
            }
        ]
    } : {
        $or: [
            {
                boxName: regex
            }
        ].concat(storeIDs.length === 0 ? [] : [storeIDQuery])
    }

    return searchQuery
}

function parseSorter(rawValue) {
    switch (rawValue) {
    case Sorter.CONTAINER:
        return { "boxOrderContent": 1}
    case Sorter.STORE:
        return { "storeID": 1 }
    case Sorter.DESCEND_ARRIVAL:
        return { "dueDate": 1 }
    case Sorter.ASCEND_ARRIVAL:
        return { "dueDate": -1 }
    case Sorter.DESCEND_CREATED_DATE:
        return { "_id": -1 }
    default:
        return { "_id": 1 }
    }
}

router.get(
    '/box/list/query/:sorter',
    regAsAdmin,
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
            return res.status(400).json({code: "F014", type: "missing parameters", message: "At least one query parameter required"})

        Object.assign(query, keyword !== '' ? await createTextSearchQuery(keyword) : {})

        Box.find(query)
            .sort(sorter)
            .skip(offset)
            .limit(batch)
            .exec((err, boxes) => {
                if (err) return next(err);
                let boxObjs = boxes.map(box=>({
                    ID: box.boxID,
                    storeID: box.storeID,
                    boxName: box.boxName || "",
                    dueDate: box.dueDate || "",
                    status: box.status || "",
                    action: box.action || [],
                    deliverContent: getDeliverContent(box.containerList),
                    orderContent: box.boxOrderContent || [],
                    containerList: box.containerList,
                    user: box.user,
                    comment: box.comment || ""
                }))
                return res.status(200).json(boxObjs);
            })
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
        let storeList = DataCacheFactory.get(DataCacheFactory.keys.STORE);
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
            'updatedAt': {
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

                                let info = {
                                    ...req.body,
                                    $push: {
                                        action: {
                                            phone: dbAdmin.user.phone,
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
                let info = {...req.body};

                if (info.storeID !== undefined || info.dueDate !== undefined) {
                    let assignAction = info.storeID && box.storeID !== info.storeID && {
                        phone: dbAdmin.user.phone,
                        destinationStoreId: info.storeID,
                        boxStatus: box.status,
                        boxAction: BoxAction.Assign,
                        timestamps: Date.now()
                    }
    
                    let modifyDateAction = info.dueDate && !isSameDay(info.dueDate, box.dueDate) && {
                        phone: dbAdmin.user.phone,
                        boxStatus: box.status,
                        boxAction: BoxAction.ModifyDueDate,
                        timestamps: Date.now()
                    }

                    info = {
                        ...info,
                        $push: {
                            action: {
                                $each: [modifyDateAction, assignAction].filter(e=>e)
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

router.delete('/deleteBox/:boxID', regAsAdmin, validateRequest, function (req, res, next) {
    let boxID = req.params.boxID;
    let dbAdmin = req._user;

    Box.findOne({
        boxID
    })
        .exec()
        .then(aBox => {
            return changeContainersState(
                aBox.containerList,
                dbAdmin, {
                    action: 'Unboxing',
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

router.get('/reloadHistory', regAsAdmin, regAsStore, validateRequest, function (req, res, next) {
    var dbUser = req._user;
    var dbKey = req._key;
    const batch = parseInt(req.query.batch) || 0
    const offset = parseInt(req.query.offset) || 0
    const isCleanReload = req.query.cleanReload === 'true'
    const needBoth = req.query.cleanReload === undefined
    var queryCond = (dbKey.roleType === UserRole.CLERK) ?
        {
            'tradeType.action': 'ReadyToClean',
            'oriUser.storeID': dbUser.roles.clerk.storeID,
            'tradeTime': {
                '$gte': dateCheckpoint(1 - historyDays)
            }
        } :
        {
            'tradeType.action': 'ReadyToClean',
            'tradeTime': {
                '$gte': dateCheckpoint(1 - historyDays)
            }
        };

    if (!needBoth) {
        queryCond = isCleanReload ? 
            { ...queryCond, "tradeType.oriState": 1} :
            { ...queryCond, "tradeType.oriState": {"$ne": 1}}
    }

    let aggregate = Trade.aggregate({
        $match: queryCond
    }, {
        $group: { 
            _id: {timestamp: "$tradeTime", state: "$tradeType.oriState", oriStore: "$oriUser.storeID"}, 
            containerList: {$addToSet: "$container.id"}, 
            newUser: {$first: "$newUser"},
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
                            $eq: [dbKey.roleType, UserRole.CLERK]
                        },
                        then: undefined,
                        else: "$newUser.phone"
                    }
                },
                timestamps: "$_id.timestamp"
            }]
        }
    })

    if (batch) {
        aggregate = aggregate.limit(batch)
    }
    
    aggregate
        .skip(offset)
        .sort({dueDate: -1})
        .exec((err, list) => {
            if (err) return next(err);
            list.forEach (box => {
                const content = getDeliverContent(box.containerList)
                box.orderContent = content
                box.deliverContent = content
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
    '/overview/:boxStatus',
    regAsAdmin,
    validateRequest,
    validateBoxStatus,
    async function (req, res, next) {
        let status = req.params.boxStatus
        let storeID = parseInt(req.query.storeID) || -1
        let query = Object.assign({status}, storeID !== -1 ? {storeID} : {})

        let overview = await Box.aggregate({
            $match: query
        }, {
            $group: {
                _id: null,
                containerIDs: { $push: '$containerList'},
                storeIDs: { $addToSet: '$storeID' },
                total: { $sum: 1 }
            }
        }, {
            $project: {
                _id: 0,
                containers: { $reduce: {
                    input: '$containerIDs',
                    initialValue: [],
                    in: { $concatArrays: ['$$value', '$$this']}
                }},
                storeAmount: { $size: '$storeIDs' },
                total: '$total'
            }
        })
            .exec((err, overviews) => {
                if (err) return next(err)
                let overview = overviews[0]

                Container.aggregate({
                    $match: {
                        ID: { $in: overview.containers }
                    }
                },{
                    $group: {
                        _id: '$typeCode',
                        amount: { $sum: 1 }
                    }
                }, {
                    $project: {
                        _id: 0,
                        typeCode: '$_id',
                        amount: '$amount'
                    }
                })
                    .exec((err, containerTypes) => {
                        if (err) return next(err)
                        res.status(200).json({...overview, containers: containerTypes})
                    })
            })
    }
);

module.exports = router;