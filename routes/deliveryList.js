const express = require('express');
const router = express.Router();
const jwt = require('jwt-simple');
const crypto = require('crypto');
const debug = require('../helpers/debugger')('deliveryList');
const redis = require('../models/redis');
const DataCacheFactory = require('../models/dataCacheFactory');

const keys = require('../config/keys');
const baseUrl = require('../config/config.js').serverBaseUrl;
const wetag = require('@lastlongerproject/toolkit').wetag;
const intReLength = require('@lastlongerproject/toolkit').intReLength;
const timeFormatter = require('@lastlongerproject/toolkit').timeFormatter;
const cleanUndoTrade = require('@lastlongerproject/toolkit').cleanUndoTrade;
const dateCheckpoint = require('@lastlongerproject/toolkit').dateCheckpoint;
const fullDateString = require('@lastlongerproject/toolkit').fullDateString;
const getDateCheckpoint = require('@lastlongerproject/toolkit')
    .getDateCheckpoint;

const validateDefault = require('../middlewares/validation/validateDefault');
const validateRequest = require('../middlewares/validation/validateRequest')
    .JWT;
const regAsBot = require('../middlewares/validation/validateRequest').regAsBot;
const regAsStore = require('../middlewares/validation/validateRequest')
    .regAsStore;
const regAsAdmin = require('../middlewares/validation/validateRequest')
    .regAsAdmin;
const regAsStoreManager = require('../middlewares/validation/validateRequest')
    .regAsStoreManager;
const regAsAdminManager = require('../middlewares/validation/validateRequest')
    .regAsAdminManager;
const validateCreateApiContent = require('../middlewares/validation/deliveryList/contentValidation.js')
    .validateCreateApiContent;
const validateBoxingApiContent = require('../middlewares/validation/deliveryList/contentValidation.js')
    .validateBoxingApiContent;
const validateStockApiContent = require('../middlewares/validation/deliveryList/contentValidation.js')
    .validateStockApiContent;
const validateChangeStateApiContent = require('../middlewares/validation/deliveryList/contentValidation.js')
    .validateChangeStateApiContent;
const changeStateProcess = require('../controllers/boxTrade.js').changeStateProcess;

const Box = require('../models/DB/boxDB');
const User = require('../models/DB/userDB');
const Store = require('../models/DB/storeDB');
const Trade = require('../models/DB/tradeDB');
const Place = require('../models/DB/placeIdDB');
const Container = require('../models/DB/containerDB');
const DeliveryList = require('../models/DB/deliveryListDB.js');
const ErrorResponse = require('../models/variables/error.js').ErrorResponse;
const BoxStatus = require('../models/variables/boxEnum.js').BoxStatus;

const changeContainersState = require('../controllers/containerTrade');
const ProgramStatus = require('../models/variables/programEnum.js').ProgramStatus;

/**
 * @apiName DeliveryList create delivery list
 * @apiGroup DeliveryList
 *
 * @api {post} /create/:destiantionStoreId Create delivery list
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
 *                          containerType: Number,
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
    function(req, res, next) {
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
 * @api {post} /box Boxing
 * @apiPermission admin
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
 *      {
 *          phone: String,
 *          boxList: [
 *              {
 *                  boxId: String,
 *                  boxDeliverContent: [
 *                      {
 *                          containerType: String,
 *                          amount: Number
 *                      },...
 *                  ],
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
 * @apiUse ChangeStateError
 */
router.post(
    ['/cleanStation/box', '/box'],
    regAsAdmin,
    validateRequest,
    validateBoxingApiContent,
    function(req, res, next) {
        let dbAdmin = req._user;
        let boxList = req.body.boxList;
        let phone = req.body.phone;

        for (let element of boxList) {
            let boxID = element.boxId;
            const containerList = element.containerList;
            const boxDeliverContent = element.boxDeliverContent;
            const comment = element.comment;

            Box.findOne({
                    boxID: boxID,
                },
                function(err, aBox) {
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
                        },
                        (err, tradeSuccess, reply) => {
                            if (err) {
                                return next(err);
                            }
                            if (!tradeSuccess) return res.status(403).json(reply);
                            aBox.update({
                                    boxDeliverContent: boxDeliverContent,
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
                                },
                                function(err, result) {
                                    if (err) return res.status(500).json(ErrorResponse.H006);

                                    return res.status(200).json({
                                        type: 'BoxingMessage',
                                        message: 'Boxing Succeeded',
                                    });
                                }
                            );
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
 * @api {post} /box Create stock box
 * @apiPermission admin
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
 *      {
 *          phone: String,
 *          boxList: [
 *              {
 *                  boxName: String,
 *                  boxDeliverContent: [
 *                      {
 *                          containerType: String,
 *                          amount: Number
 *                      },...
 *                  ],
 *                  containerList: Array,
 *              },...
 *          ]
 *      }
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "StockMessage",
            message: "Stock successfully"
        }
 * @apiUse CreateError
 * @apiUse ChangeStateError
 */
router.post(
    '/stock',
    regAsAdmin,
    validateRequest,
    validateStockApiContent,
    function(req, res, next) {
        let dbAdmin = req._user;
        let boxList = req.body.boxList;
        let phone = req.body.phone;

        for (let element of boxList) {
            let boxID = element.boxId;
            const containerList = element.containerList;
            const boxDeliverContent = element.boxDeliverContent;
            const comment = element.comment;

            Box.findOne({
                    boxID: boxID,
                },
                function(err, aBox) {
                    if (err) return next(err);
                    if (aBox)
                        return res.status(403).json(ErrorResponse.F012);

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
                                        boxIDs: req._boxIDs,
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
 * @apiName DeliveryList boxing
 * @apiGroup DeliveryList
 *
 * @api {post} /box change state
 * @apiPermission admin
 * @apiUse JWT
 * @apiParamExample {json} Request-Example:
 *      {
 *          phone: String,
 *          boxList: [
 *              {
 *                  id: String
 *                  oldState: String, // State:['Boxing', 'Delivering', 'Signed', 'Stocked']
 *                  newState: String, // State:['Boxing', 'Delivering', 'Signed', 'Stocked']
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
 * @apiUse ChangeStateError
 */
router.post(
    '/changeState',
    regAsAdmin,
    validateRequest,
    validateChangeStateApiContent,
    async function(req, res, next) {
        let dbAdmin = req._user;
        let phone = req.body.phone;
        let boxList = req.body.boxList;
        for (let element of boxList) {
            const oldState = element.oldState;
            const newState = element.newState;
            var boxID = element.id;
            Box.findOne({
                    boxID: boxID,
                },
                async function(err, aBox) {
                    if (err) return next(err);
                    if (!aBox)
                        return res.status(403).json({
                            code: 'F012',
                            type: 'BoxingMessage',
                            message: 'Box is not exist',
                        });
                    try {
                        let result = await changeStateProcess(oldState, newState, aBox, phone);
                        console.log(result)
                        if (result.status === ProgramStatus.Success) {

                        }
                    } catch (err) {
                        next(err);
                    }

                }
            );
        }
    }
);

module.exports = router;

function containerStateFactory(oldState, newState, aBox, dbAdmin) {
    if (oldState === BoxStatus.Boxing && newState === BoxStatus.Delivering) {
        changeContainersState(
            aBox.containerList,
            dbAdmin, {
                action: 'Delivery',
                newState: 0,
            }, {
                boxID,
                storeID,
            },
            (err, tradeSuccess, reply) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(reply);
                aBox.delivering = true;
                aBox.stocking = false;
                aBox.storeID = storeID;
                aBox.user.delivery = dbAdmin.user.phone;
                aBox.save(function(err) {
                    if (err) return next(err);
                    res.json(reply);
                });
            }
        );
    }

    if (oldState === BoxStatus.Delivering && newState === BoxStatus.Boxing) {

    }

    if (oldState === BoxStatus.Signed && newState === BoxStatus.Stocked) {

    }

    if (oldState === BoxStatus.Stocked && newState === BoxStatus.Boxing) {

    }

    if (oldState === BoxStatus.Signed && newState === BoxStatus.Archived) {

    }

}