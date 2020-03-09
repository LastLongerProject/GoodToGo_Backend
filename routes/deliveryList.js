const express = require('express');
const router = express.Router();
const debug = require('../helpers/debugger')('deliveryList');

const validateRequest = require('../middlewares/validation/authorization/validateRequest').JWT;
const checkRoleIsStore = require('../middlewares/validation/authorization/validateRequest').checkRoleIsStore;
const checkRoleIsCleanStation = require('../middlewares/validation/authorization/validateRequest').checkRoleIsCleanStation;
const {
    validateCreateApiContent,
    validateBoxingApiContent,
    validateStockApiContent,
    validateChangeStateApiContent,
    validateModifyApiContent,
    fetchBoxCreation,
    validateBoxStatus
} = require('../middlewares/validation/content/deliveryList.js');

const changeContainersState = require('../controllers/containerTrade');
const changeStateProcess = require('../controllers/boxTrade.js').changeStateProcess;
const containerStateFactory = require('../controllers/boxTrade.js').containerStateFactory;

const Box = require('../models/DB/boxDB');
const Trade = require('../models/DB/tradeDB');
const Store = require('../models/DB/storeDB');
const Station = require('../models/DB/stationDB');
const DeliveryList = require('../models/DB/deliveryListDB.js');

const BoxStatus = require('../models/enums/boxEnum').BoxStatus;
const BoxAction = require('../models/enums/boxEnum').BoxAction;
const RoleType = require('../models/enums/userEnum').RoleType;
const RoleElement = require('../models/enums/userEnum').RoleElement;
const ErrorResponse = require('../models/enums/error').ErrorResponse;
const ContainerAction = require('../models/enums/containerEnum').Action;
const ContainerState = require('../models/enums/containerEnum').State;
const ProgramStatus = require('../models/enums/programEnum').ProgramStatus;
const StateChangingError = require('../models/enums/programEnum').StateChangingError;

const dateCheckpoint = require('../helpers/toolkit').dateCheckpoint;
const isSameDay = require('../helpers/toolkit').isSameDay;

const getDeliverContent = require('../helpers/tools.js').getDeliverContent;
const getContainerHash = require('../helpers/tools').getContainerHash;
const getStoreListInArea = require('../helpers/tools').getStoreListInArea;
const storeIsInArea = require('../helpers/tools').checkStoreIsInArea;

const historyDays = 14;

/**
 * @apiName Get Station Dictionary
 * @apiGroup DeliveryList
 *
 * @api {get} /stationDict Get Station Dictionary
 * @apiPermission station
 * @apiUse JWT
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            [stationID]: String // "台南庫存"
        }
 */
router.get('/stationDict', checkRoleIsStore(), checkRoleIsCleanStation(), validateRequest, function (req, res, next) {
    Station.find({}, {}, {
        sort: {
            ID: 1
        }
    }, (err, stations) => {
        if (err) return next(err);
        const stationDict = {};
        stations.forEach(aStation => stationDict[aStation.ID] = aStation.name);
        res.json(stationDict);
    });
});

/**
 * @apiName DeliveryList create delivery list
 * @apiGroup DeliveryList
 *
 * @api {post} /deliveryList/create/:destiantionStoreId Create delivery list
 * @apiPermission station
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
 *      {
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

    const dbRole = req._thisRole;
    let stationID;
    const thisRoleType = dbRole.roleType;
    try {
        switch (thisRoleType) {
            case RoleType.CLEAN_STATION:
                stationID = dbRole.getElement(RoleElement.STATION_ID, false);
                break;
            default:
                return next();
        }
    } catch (error) {
        return next(error);
    }

    if (!storeIsInArea(storeID, stationID))
        return res.status(401).json({
            code: 'F016',
            type: 'DeliveryListMessage',
            message: "Store is not in your Area"
        });
    Promise.all(req._boxArray.map(box => box.save()))
        .then(() => {
            let list = new DeliveryList({
                listID: req._listID,
                boxList: req._boxIDs,
                storeID,
                stationID,
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
 * @api {post} /deliveryList/box/:boxID Boxing
 * @apiPermission station
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
    {
        boxContent: {
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
router.post('/box/:boxID', checkRoleIsCleanStation(), validateRequest, validateBoxingApiContent, function (req, res, next) {
    let dbUser = req._user;
    let boxContent = req.body.boxContent;

    const dbRole = req._thisRole;
    let stationID;
    const thisRoleType = dbRole.roleType;
    try {
        switch (thisRoleType) {
            case RoleType.CLEAN_STATION:
                stationID = dbRole.getElement(RoleElement.STATION_ID, false);
                break;
            default:
                return next();
        }
    } catch (error) {
        return next(error);
    }

    const boxID = req.params.boxID;
    const containerList = boxContent.containerList;
    const comment = boxContent.comment;

    Box.findOne({
        boxID: boxID,
    }, function (err, aBox) {
        if (err) return next(err);
        if (!aBox || aBox.stationID !== stationID)
            return res.status(403).json({
                code: 'F012',
                type: 'BoxingMessage',
                message: 'Box is not exist',
            });
        changeContainersState(
            containerList,
            dbUser, {
                action: ContainerAction.BOXING,
                newState: ContainerState.BOXED,
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
                                phone: dbUser.user.phone,
                                boxStatus: BoxStatus.Boxing,
                                boxAction: BoxAction.Pack,
                                timestamps: Date.now(),
                            }
                        },
                        status: BoxStatus.Boxing,
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
 * @apiPermission station
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
    {
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
            boxID: Number
        }
 * @apiUse CreateError
 */
router.post('/stock', checkRoleIsCleanStation(), validateRequest, fetchBoxCreation, validateStockApiContent, function (req, res, next) {
    const dbUser = req._user;

    const box = req._box;
    const boxID = box.boxID;
    const containerList = box.containerList;

    changeContainersState(
        containerList,
        dbUser, {
            action: ContainerAction.BOXING,
            newState: ContainerState.BOXED,
        }, {
            boxID,
        }, (err, tradeSuccess, reply) => {
            if (err) return next(err);
            if (!tradeSuccess) return res.status(403).json(reply);
            box.save(err => {
                if (err) return next(err);
                return res.status(200).json({
                    type: 'StockMessage',
                    message: 'Stock successfully',
                    boxID
                });
            });
        }
    );
});

/**
 * @apiName DeliveryList change state
 * @apiGroup DeliveryList
 *
 * @api {post} /deliveryList/changeState/:boxID Change state
 * @apiPermission station
 * @apiUse JWT
 * @apiDescription
 *      **available state changing list**: 
 *      (0) - Boxing -> Stocked 
 *      (1) - Boxing -> Delivering 
 *      (2) - Delivering -> Boxing 
 *      (3) - Signed -> Stocked 
 *      (4) - Stocked -> Boxing 
 *      (5) - Dispatching -> Stocked 
 *      (6) - Stocked -> Dispatching 
 *      (7) - Boxing -> Dispatching 
 * @apiParamExample {json} Request-Example:
    {
        boxContent: {
            newState: String, // State:['Boxing', 'Delivering', 'Signed', 'Stocked', 'Dispatching'], if you wanna sign a box, use sign api
            [destinationStationID]: Number, // Needed when state changing is (6), (8)
            [destinationStoreID]: Number, // Needed when state changing is (4)
            [boxAction]: String // Needed when state changing is (6), (8); Action: ['AcceptDispatch', 'RejectDispatch']
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
router.post('/changeState/:boxID', checkRoleIsCleanStation(), validateRequest, validateChangeStateApiContent, function (req, res, next) {
    let dbUser = req._user;
    let phone = dbUser.user.phone;
    let boxContent = req.body.boxContent;

    const newState = boxContent.newState;
    const boxID = req.params.boxID;

    const dbRole = req._thisRole;
    let stationID;
    const thisRoleType = dbRole.roleType;
    try {
        switch (thisRoleType) {
            case RoleType.CLEAN_STATION:
                stationID = dbRole.getElement(RoleElement.STATION_ID, false);
                Object.assign(boxContent, {
                    stationID
                });
                break;
            default:
                return next();
        }
    } catch (error) {
        return next(error);
    }

    Box.findOne({
        boxID: boxID,
    }, async function (err, aBox) {
        if (err) return next(err);
        if (!aBox || aBox.stationID !== stationID)
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
                    default:
                        return next(boxInfo.message);
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
 * @api {post} /deliveryList/sign/:boxID Sign
 * @apiPermission station
 * @apiPermission clerk
 * @apiUse JWT
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
    '/sign/:boxID',
    checkRoleIsStore(),
    checkRoleIsCleanStation(),
    validateRequest,
    async function (req, res, next) {
        let dbUser = req._user;
        let phone = dbUser.user.phone;
        const dbRole = req._thisRole;
        let thisStoreID, thisStationID;
        const thisRoleType = dbRole.roleType;
        try {
            switch (thisRoleType) {
                case RoleType.CLEAN_STATION:
                    thisStationID = dbRole.getElement(RoleElement.STATION_ID, false);
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

        const boxID = req.params.boxID;
        let boxContent = {
            newState: BoxStatus.Signed
        };
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
            if ((!reqByCleanStation && aBox.storeID !== thisStoreID) ||
                (reqByCleanStation && aBox.stationID !== thisStationID))
                return res.status(403).json({
                    code: 'F008',
                    type: 'BoxingMessage',
                    message: "Box is not belong to user"
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
 * @apiPermission station
 * @apiPermission clerk
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
    checkRoleIsStore(),
    checkRoleIsCleanStation(),
    validateRequest,
    async (req, res, next) => {
        const boxID = req.params.boxID
        const query = {
            boxID
        };

        const dbRole = req._thisRole;
        let thisStoreID, thisStationID;
        const thisRoleType = dbRole.roleType;
        try {
            switch (thisRoleType) {
                case RoleType.CLEAN_STATION:
                    thisStationID = dbRole.getElement(RoleElement.STATION_ID, false);
                    Object.assign(query, {
                        stationID: thisStationID
                    });
                    break;
                case RoleType.STORE:
                    thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
                    Object.assign(query, {
                        storeID: thisStoreID
                    });
                    break;
                default:
                    next();
            }
        } catch (error) {
            next(error);
        }

        let box = await Box.findOne(query)
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
    ASCEND_CREATED_DATE: 1 << 7,
    DESCEND_UPDATED_DATE: 1 << 8,
    ASCEND_UPDATED_DATE: 1 << 9,
};

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
        case Sorter.ASCEND_UPDATED_DATE:
            return {
                "updatedAt": 1
            };
        case Sorter.DESCEND_UPDATED_DATE:
            return {
                "updatedAt": -1
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
 * @apiPermission station
 * @apiUse JWT
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
    checkRoleIsStore(),
    checkRoleIsCleanStation(),
    validateRequest,
    async function (req, res, next) {
        let boxStatus = req.query.boxStatus;
        let offset = parseInt(req.query.offset) || 0;
        let batch = parseInt(req.query.batch) || 0;
        let sorterRawValue = parseInt(req.params.sorter) || 1 << 6
        let keyword = req.query.keyword || ''
        const sorter = parseSorter(sorterRawValue)

        const dbRole = req._thisRole;
        let stationID, storeID;
        const thisRoleType = dbRole.roleType;
        try {
            switch (thisRoleType) {
                case RoleType.CLEAN_STATION:
                    stationID = dbRole.getElement(RoleElement.STATION_ID, false);
                    break;
                case RoleType.STORE:
                    storeID = dbRole.getElement(RoleElement.STORE_ID, false);
                    break;
                default:
                    next();
            }
        } catch (error) {
            next(error);
        }

        let query = {
            stationID,
            storeID,
            status: Array.isArray(boxStatus) ? {
                $in: boxStatus
            } : boxStatus
        };

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
                    stationID: box.stationID,
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
            });
    }
);

/**
 * @apiName DeliveryList Get specific store list
 * @apiGroup DeliveryList
 *
 * @api {get} /deliveryList/box/specificList/:status/:startFrom Specific store and specific status box list
 * @apiPermission station
 * @apiPermission clerk
 * @apiUse JWT
 * @apiDescription
 * **Status**
 * - Created: "Created",
 * - Boxing: "Boxing",
 * - Delivering: "Delivering",
 * - Signed: "Signed",
 * - Stocked: "Stocked"
 * - Dispatching: "Dispatching"
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
    checkRoleIsCleanStation(),
    validateRequest,
    async function (req, res, next) {
        let boxStatus = req.params.status;
        let startFrom = parseInt(req.params.startFrom);
        let boxObjs = [];
        const query = {
            'status': boxStatus,
            'createdAt': {
                '$lte': dateCheckpoint(startFrom + 1),
                '$gt': dateCheckpoint(startFrom - 14)
            },
        };

        const dbRole = req._thisRole;
        let thisStoreID, thisStationID;
        const thisRoleType = dbRole.roleType;
        try {
            switch (thisRoleType) {
                case RoleType.CLEAN_STATION:
                    thisStationID = dbRole.getElement(RoleElement.STATION_ID, false);
                    Object.assign(query, {
                        stationID: thisStationID
                    });
                    break;
                case RoleType.STORE:
                    thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
                    Object.assign(query, {
                        storeID: thisStoreID
                    });
                    break;
                default:
                    next();
            }
        } catch (error) {
            next(error);
        }

        Box.find(query, (err, boxes) => {
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
 * @apiPermission station
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

    const dbRole = req._thisRole;
    let thisStationID;
    const thisRoleType = dbRole.roleType;
    try {
        switch (thisRoleType) {
            case RoleType.CLEAN_STATION:
                thisStationID = dbRole.getElement(RoleElement.STATION_ID, false);
                break;
            default:
                return next();
        }
    } catch (error) {
        return next(error);
    }

    Box.findOne({
        boxID,
        stationID: thisStationID
    }, async (err, box) => {
        try {
            if (containerList) {
                changeContainersState(
                    box.containerList,
                    dbUser, {
                        action: ContainerAction.UNBOXING,
                        newState: ContainerState.RELOADED
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
                                newState: ContainerState.BOXED
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
                    let assignAction = (typeof info.storeID !== "undefined" && box.storeID !== info.storeID) ? {
                        phone: dbUser.user.phone,
                        destinationStoreId: info.storeID,
                        storeID: {
                            from: box.storeID,
                            to: info.storeID
                        },
                        boxStatus: box.status,
                        boxAction: BoxAction.Assign,
                        timestamps: Date.now()
                    } : null;

                    let modifyDateAction = (typeof info.dueDate !== "undefined" && !isSameDay(info.dueDate, box.dueDate)) ? {
                        phone: dbUser.user.phone,
                        boxStatus: box.status,
                        boxAction: BoxAction.ModifyDueDate,
                        timestamps: Date.now()
                    } : null;

                    info = {
                        ...info,
                        deliveringDate: (typeof info.storeID !== "undefined" && box.storeID !== info.storeID) ? Date.now() : null,
                        $push: {
                            action: {
                                $each: [modifyDateAction, assignAction].filter(e => e)
                            }
                        }
                    };
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
 * @apiPermission station
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
    const dbRole = req._thisRole;
    let thisStationID;
    const thisRoleType = dbRole.roleType;
    try {
        switch (thisRoleType) {
            case RoleType.CLEAN_STATION:
                thisStationID = dbRole.getElement(RoleElement.STATION_ID, false);
                break;
            default:
                return next();
        }
    } catch (error) {
        return next(error);
    }

    Box.findOne({
            boxID,
            stationID: thisStationID
        })
        .exec()
        .then(aBox => {
            return changeContainersState(
                aBox.containerList,
                dbUser, {
                    action: ContainerAction.UNBOXING,
                    newState: ContainerState.RELOADED
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
 * @apiPermission station
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
    const batch = parseInt(req.query.batch) || 0
    const offset = parseInt(req.query.offset) || 0
    const isCleanReload = req.query.cleanReload === 'true'
    const needBoth = req.query.cleanReload === undefined
    const query = {
        'tradeType.action': 'ReadyToClean',
        'tradeTime': {
            '$gte': dateCheckpoint(1 - historyDays)
        }
    };

    const dbRole = req._thisRole;
    let thisStoreID, thisStationID;
    let thisRoleType = dbRole.roleType;
    try {
        switch (thisRoleType) {
            case RoleType.CLEAN_STATION:
                thisStationID = dbRole.getElement(RoleElement.STATION_ID, false);
                var storeIdList = getStoreListInArea(thisStationID);
                Object.assign(query, {
                    'oriUser.storeID': {
                        "$in": storeIdList
                    }
                });
                break;
            case RoleType.STORE:
                thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
                Object.assign(query, {
                    'oriUser.storeID': thisStoreID
                });
                break;
            default:
                return next();
        }
    } catch (error) {
        return next(error);
    }

    if (!needBoth) {
        if (isCleanReload) {
            Object.assign(query, {
                "tradeType.oriState": ContainerState.READY_TO_USE
            });
        } else {
            Object.assign(query, {
                "tradeType.oriState": {
                    "$ne": ContainerState.READY_TO_USE
                }
            });
        }
    }

    let aggregate = Trade.aggregate([{
        $match: query
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
                        $eq: ['$_id.state', ContainerState.READY_TO_USE]
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
    }]);

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
        });
});

/**
 * @apiName Containers dispatch history
 * @apiGroup DeliveryList
 *
 * @api {get} /deliveryList/dispatchHistory Dispatch history
 * 
 * @apiUse JWT
 * @apiPermission station
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            action: [
                {
                    "boxID": Number,
                    "phone": String,
                    "containerList": [
                        Number,...
                    ],
                    "timestamp": Date,
                    "action": String, // ["getDispatch", "sendDispatch"]
                    "toStationID":Number,
                    "boxAccepted": Boolean or null
                },...
            ]
        }
 */

const DispatchStatus = {
    GET_DISPATCH: "getDispatch",
    SEND_DISPATCH: "sendDispatch"
};

router.get('/dispatchHistory', checkRoleIsCleanStation(), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStationID;
    try {
        thisStationID = dbRole.getElement(RoleElement.STATION_ID, false);
    } catch (error) {
        return next(error);
    }
    const batch = parseInt(req.query.batch) || 0;
    const offset = parseInt(req.query.offset) || 0;

    let aggregate = Box.aggregate([{
        $match: {
            $or: [{
                    "action.boxAction": BoxAction.Dispatch,
                    "action.stationID.from": thisStationID
                },
                {
                    "action.boxAction": BoxAction.Dispatch,
                    "action.stationID.to": thisStationID
                }
            ]
        }
    }, {
        $unwind: {
            path: "$action"
        }
    }, {
        $match: {
            "action.boxAction": {
                "$in": [BoxAction.Dispatch, BoxAction.AcceptDispatch, BoxAction.RejectDispatch]
            }
        }
    }, {
        $project: {
            boxID: "$boxID",
            phone: "$action.phone",
            containerList: "$containerList",
            timestamp: "$action.timestamps",
            action: "$action.boxAction",
            toStationID: "$action.stationID.to"
        }
    }])

    if (batch) {
        aggregate = aggregate.limit(batch);
    }

    aggregate
        .skip(offset)
        .sort({
            timestamp: 1
        })
        .exec((err, actions) => {
            if (err) return next(err);
            const formattedAction = [];
            const resolvedAction = [];
            actions.forEach(anAction => {
                if (anAction.action === BoxAction.Dispatch) {
                    if (anAction.toStationID === thisStationID)
                        formattedAction.push(Object.assign(anAction, {
                            action: DispatchStatus.GET_DISPATCH,
                            boxAccepted: null
                        }));
                    else
                        formattedAction.push(Object.assign(anAction, {
                            action: DispatchStatus.SEND_DISPATCH,
                            boxAccepted: null
                        }));
                } else if (anAction.action === BoxAction.AcceptDispatch) {
                    const index = findLastIndexOf(formattedAction, anFormattedAction => anFormattedAction.boxID === anAction.boxID);
                    resolvedAction.unshift(Object.assign(formattedAction.splice(index, 1)[0], {
                        boxAccepted: true
                    }));
                } else if (anAction.action === BoxAction.RejectDispatch) {
                    const index = findLastIndexOf(formattedAction, anFormattedAction => anFormattedAction.boxID === anAction.boxID);
                    resolvedAction.unshift(Object.assign(formattedAction.splice(index, 1)[0], {
                        boxAccepted: false
                    }));
                }
            });
            res.status(200).json({
                action: resolvedAction
            });
        });
});

/**
 * @apiName DeliveryList Get delivery list overview
 * @apiGroup DeliveryList
 *
 * @api {get} /deliveryList/overview Specific clean station's overview
 * @apiPermission station
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

        const dbRole = req._thisRole;
        let thisStationID;
        let thisRoleType = dbRole.roleType;
        try {
            switch (thisRoleType) {
                case RoleType.CLEAN_STATION:
                    thisStationID = dbRole.getElement(RoleElement.STATION_ID, false);
                    break;
                default:
                    next();
            }
        } catch (error) {
            next(error);
        }

        let query = {
            stationID: thisStationID,
            status: Array.isArray(status) ? {
                $in: status
            } : status
        };

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
                if (err) return next(err);
                let overview = overviews[0];

                if (!overview) {
                    return res.status(200).json({
                        containers: [],
                        storeAmount: 0,
                        total: 0
                    });
                }

                res.status(200).json({
                    ...overview,
                    containers: getDeliverContent(overview.containers)
                });
            });
    }
);

module.exports = router;

function findLastIndexOf(source, target) {
    if (!Array.isArray(source))
        throw new Error("[Source] is not itertable");
    let i = source.length - 1;
    for (; i >= 0; i--) {
        if (target(source[i]))
            return i;
    }
    return i;
}