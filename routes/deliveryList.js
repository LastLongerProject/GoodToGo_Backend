const express = require('express');
const router = express.Router();
const jwt = require('jwt-simple');
const crypto = require('crypto');
const debug = require('../helpers/debugger')('stores');
const redis = require("../models/redis");
const DataCacheFactory = require("../models/dataCacheFactory");

const keys = require('../config/keys');
const baseUrl = require('../config/config.js').serverBaseUrl;
const wetag = require('@lastlongerproject/toolkit').wetag;
const intReLength = require('@lastlongerproject/toolkit').intReLength;
const timeFormatter = require('@lastlongerproject/toolkit').timeFormatter;
const cleanUndoTrade = require('@lastlongerproject/toolkit').cleanUndoTrade;
const dateCheckpoint = require('@lastlongerproject/toolkit').dateCheckpoint;
const fullDateString = require('@lastlongerproject/toolkit').fullDateString;
const getDateCheckpoint = require('@lastlongerproject/toolkit').getDateCheckpoint;

const validateDefault = require('../middlewares/validation/validateDefault');
const validateRequest = require('../middlewares/validation/validateRequest').JWT;
const regAsBot = require('../middlewares/validation/validateRequest').regAsBot;
const regAsStore = require('../middlewares/validation/validateRequest').regAsStore;
const regAsAdmin = require('../middlewares/validation/validateRequest').regAsAdmin;
const regAsStoreManager = require('../middlewares/validation/validateRequest').regAsStoreManager;
const regAsAdminManager = require('../middlewares/validation/validateRequest').regAsAdminManager;
const Box = require('../models/DB/boxDB');
const User = require('../models/DB/userDB');
const Store = require('../models/DB/storeDB');
const Trade = require('../models/DB/tradeDB');
const Place = require('../models/DB/placeIdDB');
const Container = require('../models/DB/containerDB');
const DeliveryList = require('../models/DB/deliveryListDB.js');
const getGlobalUsedAmount = require('../models/variables/globalUsedAmount');
const DEMO_CONTAINER_ID_LIST = require('../config/config').demoContainers;

/**
 * @apiName DeliveryList create delivery list
 * @apiGroup DeliveryList
 *
 * @api {post} /create Create delivery list
 * @apiPermission admin
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: "CreateMessage",
            message: "Create Succeed"
        }
 * @apiUse CreateError
 * @apiUse ChangeStateError
 */
router.post('/create/:destinationStoreId', regAsAdmin, validateRequest, function(req, res, next) {
    let creator = req._user;
    let destinationStoreId = parseInt(req.params.store);
    let boxList = req.body.boxList;
    if (boxList === undefined || !Array.isArray(boxList)) {
        return res.status(403).json({
            code: 'H001',
            type: "CreateMessage",
            message: "Data format invalid (boxList must be an array)"
        });
    }

    boxList.forEach(element => {

    });

    list = new DeliveryList({

    })
});

function validateRequestContent(element) {
    if (!('boxName' in element) || !('boxContent' in element) || !('dueDate' in element) || !('user' in element) || !('containerList' in element) ||
        !('status' in element) || !('comment' in element) || !('error' in element)) {
        return res.status(403).json({
            code: 'H002',
            type: "CreateMessage",
            message: "Missing info in bloxList element"
        });
    } else if (!Array.isArray(element.boxContent)) {
        return res.status(403).json({
            code: 'H003',
            type: "CreateMessage",
            message: "Data format invalid (containerList must be an array)"
        });
    }
}