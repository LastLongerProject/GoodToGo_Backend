const express = require('express');
const router = express.Router();
const jwt = require('jwt-simple');
const debug = require('debug')('goodtogo_backend:containers_get');

const validateDefault = require('../../middlewares/validation/validateDefault');
const validateRequest = require('../../middlewares/validation/validateRequest').JWT;
const regAsStore = require('../../middlewares/validation/validateRequest').regAsStore;
const regAsAdmin = require('../../middlewares/validation/validateRequest').regAsAdmin;

const keys = require('../../config/keys');
const baseUrl = require('../../config/config.js').serverBaseUrl;

const Box = require('../../models/DB/boxDB');
const Trade = require('../../models/DB/tradeDB');
const DataCacheFactory = require("../../models/dataCacheFactory");

const wetag = require('@lastlongerproject/toolkit').wetag;
const intReLength = require('@lastlongerproject/toolkit').intReLength;
const dateCheckpoint = require('@lastlongerproject/toolkit').dateCheckpoint;
const cleanUndoTrade = require('@lastlongerproject/toolkit').cleanUndoTrade;

const historyDays = 14;

/**
 * @apiName Containers get list 
 * @apiGroup Containers
 *
 * @api {get} /containers/get/list Get list 
 * 
 * @apiUse DefaultSecurityMethod
 * @apiHeader If-None-Match : // ‘Etag’ header value from last /stores/list response
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            "containerType" : [
                {
                    typeCode : Number, // 0
                    name : String, // 12oz 玻璃杯
                    version : Number,
                    icon : {
                        "1x": "https://app.goodtogo.tw/images/icon/00_1x/:token",
                        "2x": "https://app.goodtogo.tw/images/icon/00_2x/:token",
                        "3x": "https://app.goodtogo.tw/images/icon/00_3x/:token"
                    }
                }, ...
            ],
            "containerDict": {
                "1": "12oz 玻璃杯",...
            }
        }
 *
 */
router.get('/list', validateDefault, function(req, res, next) {
    var typeDict = DataCacheFactory.get('containerType');
    var containerDict = DataCacheFactory.get('container');
    var tmpIcon;
    var tmpArr = [];
    var date = new Date();
    var payload = {
        'iat': Date.now(),
        'exp': date.setMinutes(date.getMinutes() + 5)
    };
    keys.serverSecretKey((err, key) => {
        var token = jwt.encode(payload, key);
        res.set('etag', wetag([containerDict, typeDict]));
        for (var aType in typeDict) {
            tmpIcon = {};
            for (var j = 1; j <= 3; j++) {
                tmpIcon[j + 'x'] = `${baseUrl}/images/icon/${intReLength(typeDict[aType].typeCode, 2)}_${j}x/${token}`;
            }
            tmpArr.push({
                typeCode: typeDict[aType].typeCode,
                name: typeDict[aType].name,
                version: typeDict[aType].version,
                icon: tmpIcon
            });
        }
        var resJSON = {
            containerType: tmpArr,
            containerDict: containerDict
        };
        res.json(resJSON);
    });
});

/**
 * @apiName Containers get toDelivery list
 * @apiGroup Containers
 *
 * @api {get} /containers/get/toDelivery Get toDelivery list
 * 
 * @apiUse JWT
 * @apiPermission admin
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            toDelivery:
            [ 
                { 
                    boxID: String //102457,
                    boxTime: Date // '2018-10-26T09:13:40.267Z',
                    phone: {
                        "box": String
                    },
                    typeList: [
                        "12oz 玻璃杯"
                    ],
                    containerList: {
                        "12oz 玻璃杯": [
                            1,...
                        ]
                    },
                    stocking: Boolean,
                    isDelivering: Boolean,
                    containerOverview: [
                            {
                                "containerType": "12oz 玻璃杯",
                                "amount": 1
                            },...
                        ] 
                    },
                    ...
            ]
        }
 *
 */
router.get('/toDelivery', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    var containerDict = DataCacheFactory.get('containerWithDeactive');
    process.nextTick(function() {
        Box.find(function(err, boxList) {
            if (err) return next(err);
            if (boxList.length === 0) return res.json({
                toDelivery: []
            });
            var boxArr = [];
            var thisBox;
            var thisType;
            for (var i = 0; i < boxList.length; i++) {
                thisBox = boxList[i].boxID;
                var thisBoxTypeList = [];
                var thisBoxContainerList = {};
                for (var j = 0; j < boxList[i].containerList.length; j++) {
                    thisType = containerDict[boxList[i].containerList[j]];
                    if (thisBoxTypeList.indexOf(thisType) < 0) {
                        thisBoxTypeList.push(thisType);
                        thisBoxContainerList[thisType] = [];
                    }
                    thisBoxContainerList[thisType].push(boxList[i].containerList[j]);
                }
                boxArr.push({
                    boxID: thisBox,
                    boxTime: boxList[i].updatedAt,
                    phone: boxList[i].user,
                    typeList: thisBoxTypeList,
                    containerList: thisBoxContainerList,
                    stocking: boxList[i].stocking,
                    isDelivering: boxList[i].delivering,
                    destinationStore: boxList[i].storeID
                });
            }
            for (var i = 0; i < boxArr.length; i++) {
                boxArr[i].containerOverview = [];
                for (var j = 0; j < boxArr[i].typeList.length; j++) {
                    boxArr[i].containerOverview.push({
                        containerType: boxArr[i].typeList[j],
                        amount: boxArr[i].containerList[boxArr[i].typeList[j]].length
                    });
                }
            }
            boxArr.sort((a, b) => {
                return b.boxTime - a.boxTime;
            });
            var resJSON = {
                toDelivery: boxArr
            };
            res.json(resJSON);
        });
    });
});

/**
 * @apiName Containers get delivery history
 * @apiGroup Containers
 *
 * @api {get} /containers/get/toDelivery Get delivery history
 * 
 * @apiUse JWT
 * @apiPermission admin
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            pastDelivery:
            [
                { 
                    "boxID": 1,
                    "boxTime": "2017-11-05T15:05:37.456Z",
                    "phone": {
                        "delivery": String // 配送的人
                    },
                    "typeList": [
                        "12oz 玻璃杯"
                    ],
                    "containerList": {
                        "12oz 玻璃杯": [
                            1,...
                        ]
                    },
                    "containerOverview": [
                        {
                            "containerType": "12oz 玻璃杯",
                            "amount": 1
                        },...
                    ],
                    "destinationStore": Number // store ID 
                },
                ...
            ]
        }
 *
 */
router.get('/deliveryHistory', regAsAdmin, validateRequest, function(req, res, next) {
    var dbAdmin = req._user;
    var typeDict = DataCacheFactory.get('containerType');
    Trade.find({
        'tradeType.action': 'Sign',
        'tradeTime': {
            '$gte': dateCheckpoint(1 - historyDays)
        }
    }, function(err, list) {
        if (err) return next(err);
        if (list.length === 0) return res.json({
            pastDelivery: []
        });
        list.sort((a, b) => {
            return b.tradeTime - a.tradeTime;
        });
        var boxArr = [];
        var boxIDArr = [];
        var thisBox;
        var thisBoxTypeList;
        var thisBoxContainerList;
        var lastIndex;
        var nowIndex;
        var thisType;
        for (var i = 0; i < list.length; i++) {
            thisBox = list[i].container.box;
            thisType = typeDict[list[i].container.typeCode].name;
            lastIndex = boxArr.length - 1;
            if (lastIndex < 0 || boxArr[lastIndex].boxID !== thisBox || (boxArr[lastIndex].boxTime - list[i].tradeTime) !== 0) {
                boxIDArr.push(thisBox);
                boxArr.push({
                    boxID: thisBox,
                    boxTime: list[i].tradeTime,
                    phone: {
                        delivery: list[i].oriUser.phone
                    },
                    typeList: [],
                    containerList: {},
                    destinationStore: list[i].newUser.storeID
                });
            }
            nowIndex = boxArr.length - 1;
            thisBoxTypeList = boxArr[nowIndex].typeList;
            thisBoxContainerList = boxArr[nowIndex].containerList;
            if (thisBoxTypeList.indexOf(thisType) < 0) {
                thisBoxTypeList.push(thisType);
                thisBoxContainerList[thisType] = [];
            }
            thisBoxContainerList[thisType].push(list[i].container.id);
        }
        for (var i = 0; i < boxArr.length; i++) {
            boxArr[i].containerOverview = [];
            for (var j = 0; j < boxArr[i].typeList.length; j++) {
                boxArr[i].containerOverview.push({
                    containerType: boxArr[i].typeList[j],
                    amount: boxArr[i].containerList[boxArr[i].typeList[j]].length
                });
            }
        }
        var resJSON = {
            pastDelivery: boxArr
        };
        res.json(resJSON);
    });
});

/**
 * @apiName Containers reload history
 * @apiGroup Containers
 *
 * @api {get} /containers/get/reloadHistory Reload history
 * 
 * @apiUse JWT
 * @apiPermission admin
 * @apiPermission clerk
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            reloadHistory::
            [
                { 
                    {
                        "boxTime": "2017-11-05T15:05:37.456Z",
                        "typeList": [
                            "12oz 玻璃杯"
                        ],
                        "phone": {
                            "reload": String // (清洗站)回收的人
                        },
                        "from": 1, // (清洗站)storeID
                        "containerList": {
                            "12oz 玻璃杯": [
                                1,...
                            ]
                        },
                        "containerOverview": [
                            {
                                "containerType": "12oz 玻璃杯",
                                "amount": 1
                            },...
                        ],
                        "cleanReload": Boolean // if TRUE, 為乾淨回收
                    },
                    ...
                }
            ]
        }
 *
 */
router.get('/reloadHistory', regAsAdmin, regAsStore, validateRequest, function(req, res, next) {
    var dbUser = req._user;
    var dbKey = req._key;
    var typeDict = DataCacheFactory.get('containerType');
    var queryCond;
    var queryDays;
    if (req.query.days && !isNaN(parseInt(req.query.days))) queryDays = req.query.days;
    else queryDays = historyDays;
    if (dbKey.roleType === 'clerk')
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
    Trade.find(queryCond, function(err, list) {
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
        for (var aTradeTime in tradeTimeDict) {
            tradeTimeDict[aTradeTime].sort((a, b) => a.oriUser.storeID - b.oriUser.storeID);
            tradeTimeDict[aTradeTime].forEach(theTrade => {
                thisTypeName = typeDict[theTrade.container.typeCode].name;
                boxDictKey = `${theTrade.oriUser.storeID}-${theTrade.tradeTime}-${(theTrade.tradeType.oriState === 1)}`;
                if (!boxDict[boxDictKey])
                    boxDict[boxDictKey] = {
                        boxTime: theTrade.tradeTime,
                        typeList: [],
                        containerList: {},
                        cleanReload: (theTrade.tradeType.oriState === 1),
                        phone: (dbKey.roleType === 'clerk') ? undefined : {
                            reload: theTrade.newUser.phone
                        },
                        from: (dbKey.roleType === 'clerk') ? undefined : theTrade.oriUser.storeID
                    };
                if (boxDict[boxDictKey].typeList.indexOf(thisTypeName) === -1) {
                    boxDict[boxDictKey].typeList.push(thisTypeName);
                    boxDict[boxDictKey].containerList[thisTypeName] = [];
                }
                boxDict[boxDictKey].containerList[thisTypeName].push(theTrade.container.id);
            });
        }

        var boxArr = Object.values(boxDict);
        boxArr.sort((a, b) => b.boxTime - a.boxTime);
        for (var i = 0; i < boxArr.length; i++) {
            boxArr[i].containerOverview = [];
            for (var j = 0; j < boxArr[i].typeList.length; j++) {
                boxArr[i].containerOverview.push({
                    containerType: boxArr[i].typeList[j],
                    amount: boxArr[i].containerList[boxArr[i].typeList[j]].length
                });
            }
        }
        var resJSON = {
            reloadHistory: boxArr
        };
        res.json(resJSON);
    });
});

module.exports = router;