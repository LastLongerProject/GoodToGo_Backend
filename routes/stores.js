const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const debug = require('../helpers/debugger')('stores');
const redis = require("../models/redis");
const DataCacheFactory = require("../models/dataCacheFactory");

const baseUrl = require('../config/config.js').serverBaseUrl;
const intReLength = require('../helpers/toolkit').intReLength;
const timeFormatter = require('../helpers/toolkit').timeFormatter;
const cleanUndoTrade = require('../helpers/toolkit').cleanUndoTrade;
const dateCheckpoint = require('../helpers/toolkit').dateCheckpoint;
const fullDateString = require('../helpers/toolkit').fullDateString;
const getDateCheckpoint = require('../helpers/toolkit').getDateCheckpoint;

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
const Activity = require('../models/DB/activityDB')
const getGlobalUsedAmount = require('../models/variables/containerStatistic').global_used;
const getBookedAmount = require('../models/variables/containerStatistic').all_stores_booked;
const DEMO_CONTAINER_ID_LIST = require('../config/config').demoContainers;
const UserRole = require('../models/enums/userEnum').UserRole;
const RentalQualification = require('../models/enums/userEnum').RentalQualification;

const userIsAvailableForRentContainer = require('../helpers/tools').userIsAvailableForRentContainer;

const historyDays = 14;
const redisKey = storeID => `store_favorite:${storeID}`;

const MILLISECONDS_OF_A_WEEK = 1000 * 60 * 60 * 24 * 7;
const MILLISECONDS_OF_A_DAY = 1000 * 60 * 60 * 24;
const MILLISECONDS_OF_LOST_CONTAINER_SHOP = MILLISECONDS_OF_A_DAY * 31;
const MILLISECONDS_OF_LOST_CONTAINER_CUSTOMER = MILLISECONDS_OF_A_DAY * 7;

/**
 * @apiName Store list
 * @apiGroup Stores
 *
 * @api {get} /stores/list Get store list
 * @apiUse DefaultSecurityMethod
 * 
 * @apiSuccessExample {json} Success-Response:
       HTTP/1.1 200 
       {
            title: 'Stores list',
            contract_code_explanation: {
            '0': 'Only borrowable and returnable',
            '1': 'Only returnable',
            '2': 'Borrowable and returnable'
            },
            globalAmount: 0,
            shop_data: [{
                id: 0,
                name: '正興咖啡館',
                img_info: [Object],
                opening_hours: [Array],
                contract: [Object],
                location: [Object],
                address: '台南市中西區國華街三段43號',
                type: [Array],
                category: Number, // (0, 1, 9) = ("店舖", "活動", "庫存")
                testing: false
            },
            ...
            ]
        }
 * 
 */

router.get('/list', validateDefault, function (req, res, next) {
    var jsonData = {
        title: "Stores list",
        contract_code_explanation: {
            0: "Only borrowable and returnable",
            1: "Only returnable",
            2: "Borrowable and returnable"
        }
    };
    var tmpArr = [];
    process.nextTick(function () {
        Store.find({
            "project": {
                "$ne": "測試用"
            },
            "active": true
        }, {}, {
            sort: {
                id: 1
            }
        }, function (err, storeList) {
            if (err) return next(err);
            jsonData.globalAmount = 0;

            for (var i = 0; i < storeList.length; i++) {
                var tmpOpening = [];
                storeList[i].img_info.img_src = `${baseUrl}/images/store/${storeList[i].id}?ver=${storeList[i].img_info.img_version}`;
                for (var j = 0; j < storeList[i].opening_hours.length; j++)
                    tmpOpening.push({
                        close: storeList[i].opening_hours[j].close,
                        open: storeList[i].opening_hours[j].open
                    });
                tmpArr.push({
                    id: storeList[i].id,
                    name: storeList[i].name,
                    img_info: storeList[i].img_info,
                    opening_hours: tmpOpening,
                    contract: storeList[i].contract,
                    location: storeList[i].location,
                    address: storeList[i].address,
                    type: storeList[i].type,
                    category: storeList[i].category,
                    testing: (storeList[i].project === '正興杯杯') ? false : true
                });
            }

            jsonData.shop_data = tmpArr;
            res.json(jsonData);
        });
    });
});

/**
 * @apiName Store list JSON
 * @apiGroup Stores
 *
 * @api {get} /stores/list.js Get store list with JSON format
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 

        var placeid_json = [{"placeid":"ChIJ8c8g8WR2bjQRsgin1zcdMsk","name":"正興咖啡館","borrow":true,"return":true,"type":"咖啡, 生活小物, 旅宿"},...]
 * 
 * 
 * 
 */
router.get('/list/forOfficialPage', function (req, res, next) {
    Place.find({
        "project": {
            "$in": ["正興杯杯", "咖啡店連線", "器喝茶", "慧群", "磐飛"]
        },
        "active": true
    }, ["ID"], {
        sort: {
            id: 1
        }
    }, function (err, placeList) {
        if (err) return next(err);
        const storeDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
        res.json({
            storeList: placeList.map(aPlace => {
                let aStore = storeDict[aPlace.ID];
                let photo = null;
                if (aStore.img_info && aStore.img_info.img_version !== 0) photo = `${baseUrl}/images/store/${aStore.ID}?ver=${aStore.img_info.img_version}`;
                else if (aStore.photos_fromGoogle !== null) photo = `${baseUrl}/images/store/${aStore.ID}?ref=${aStore.photos_fromGoogle}`;
                return {
                    placeid: aStore.placeID,
                    name: aStore.name,
                    photo,
                    url: aStore.url_fromGoogle,
                    address: aStore.address,
                    opening_hours: {
                        periods: aStore.opening_hours
                    },
                    geometry_location: aStore.location,
                    borrow: aStore.contract.borrowable,
                    return: aStore.contract.returnable,
                    type: aStore.type
                };
            })
        });
    });
});

/**
 * @apiName Store list
 * @apiGroup Stores
 *
 * @api {get} /stores/list/:id Get store specific store info
 * @apiUse DefaultSecurityMethod
 * 
 * @apiSuccessExample {json} Success-Response:
       HTTP/1.1 200 
       {
            title: 'Store info',
            contract_code_explanation: {
            '0': 'Only borrowable and returnable',
            '1': 'Only returnable',
            '2': 'Borrowable and returnable'
            },
            globalAmount: 0,
            shop_data: [{
                id: 0,
                name: '正興咖啡館',
                img_info: [Object],
                opening_hours: [Array],
                contract: [Object],
                location: [Object],
                address: '台南市中西區國華街三段43號',
                type: [Array],
                category: Number, // (0, 1, 9) = ("店舖", "活動", "庫存")
                testing: false
            }]
        }
 * 
 */

router.get('/list/:id', validateDefault, function (req, res, next) {
    let storeId = req.params.id;

    Store.findOne({
        "project": {
            "$ne": "測試用"
        },
        "id": storeId
    }, function (err, store) {
        if (err) return next(err);
        if (!store) {
            return res.status(403).json({
                code: "E004",
                type: "StoresMessage",
                message: "No store found, please check id"
            });
        }

        var tmpOpening = [];
        store.img_info.img_src = `${baseUrl}/images/store/${store.id}?ver=${store.img_info.img_version}`;
        for (var i = 0; i < store.opening_hours.length; i++)
            tmpOpening.push({
                close: store.opening_hours[i].close,
                open: store.opening_hours[i].open
            });
        tmpOpening.sort((a, b) => {
            return a.close.day - b.close.day;
        });

        res.json({
            id: store.id,
            name: store.name,
            img_info: store.img_info,
            opening_hours: tmpOpening,
            contract: store.contract,
            location: store.location,
            address: store.address,
            type: store.type,
            category: store.category,
            testing: (store.project === '正興杯杯') ? false : true,
            activity: store.activity
        });
    });
});

/**
 * @apiName Store specific activity
 * @apiGroup Stores
 *
 * @api {get} /stores/activity/:activityID Get specific activity
 * @apiUse DefaultSecurityMethod
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            ID: '0',
            name: '沒活動',
            startAt: '2018-03-02T16:00:00.000Z',
            endAt: '2018-03-02T16:00:00.000Z' 
        }
 * @apiUse GetActivityError
 */
router.get('/activity/:activityID', validateDefault, function (req, res, next) {
    const ID = String(req.params.activityID);
    Activity
        .findOne({
            'ID': ID
        })
        .exec()
        .then(activity => {
            if (activity)
                return res.status(200).json({
                    name: activity.name,
                    startAt: activity.startAt,
                    endAt: activity.endAt
                });
            return res.status(404).json({
                code: "E005",
                type: "ActivityMessage",
                message: "activity not found, plz check id"
            });
        })
        .catch(err => {
            debug.error(err);
            return next(err);
        });
});

/**
 * @apiName Store activities list
 * @apiGroup Stores
 *
 * @api {get} /stores/activityList Get activities list
 * @apiUse DefaultSecurityMethod
 * 
 * @apiSuccessExample {json} Success-Response:
       HTTP/1.1 200 
       {
            [
                { 
                    ID: '0',
                    name: '沒活動',
                    startAt: '2018-03-02T16:00:00.000Z',
                    endAt: '2018-03-02T16:00:00.000Z' 
                },... 
            ]
        }
 * 
 */
router.get('/activityList', validateDefault, function (req, res, next) {
    Activity
        .find({})
        .exec()
        .then(activities => {
            if (activities) {
                let result = [];
                for (let {
                        ID: id,
                        name: name,
                        startAt: start,
                        endAt: end
                    } of activities) {
                    result.push({
                        ID: id,
                        name,
                        startAt: start,
                        endAt: end
                    });
                }
                return res.status(200).json(result);
            }

            return res.status(200).json({});
        })
        .catch(err => {
            debug.error(err);
            return next(err);
        });
});

/**
 * @apiName Store activities list of specific store
 * @apiGroup Stores
 * @apiDescription
 * still need to test
 * @api {get} /stores/activityList/:storeID Get activities list of specific store
 * @apiUse DefaultSecurityMethod
 * 
 * @apiSuccessExample {json} Success-Response:
       HTTP/1.1 200 
       {
            ["沒活動",...]
        }
 * 
 */
router.get('/activityList/:storeID', validateDefault, function (req, res, next) {
    let storeID = req.params.storeID;
    Store
        .findOne({
            'id': storeID
        })
        .exec()
        .then(activities => res.status(200).json(activities))
        .catch(err => {
            debug.error(err);
            next(err);
        });
});


/**
 * @apiName Store dict
 * @apiGroup Stores
 *
 * @api {get} /stores/dict Get store dict
 * @apiUse JWT
 * @apiPermission admin
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            '0': '正興咖啡館',
            '1': '布萊恩紅茶 (正興店)',
            ...
        }
 * 
 */

router.get('/dict', regAsStore, regAsAdmin, validateRequest, function (req, res, next) {
    process.nextTick(function () {
        Store.find({}, {}, {
            sort: {
                id: 1
            }
        }, function (err, storeList) {
            if (err) return next(err);
            let storeDict = {};
            storeList.forEach(aStore => storeDict[aStore.id] = aStore.name);
            res.json(storeDict);
        });
    });
});

/**
 * @apiName Store's clerk list
 * @apiGroup Stores
 *
 * @api {get} /stores/clerkList Get store's clerk list
 * @apiUse JWT
 * @apiPermission manager
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            clerkList:
            [
                { phone: '09xxxxxxxx', name: 'Handsome', isManager: true },
                ...
            ]
        }
 * 
 */
router.get('/clerkList', regAsStoreManager, regAsAdminManager, validateRequest, function (req, res, next) {
    const dbUser = req._user;
    const dbKey = req._key;
    const TYPE_CODE = dbKey.roleType;
    let condition;
    switch (TYPE_CODE) {
        case UserRole.ADMIN:
            condition = {
                'roles.admin.stationID': dbUser.roles.admin.stationID
            };
            break;
        case UserRole.CLERK:
            condition = {
                'roles.clerk.storeID': dbUser.roles.clerk.storeID
            };
            break;
        default:
            next();
    }
    process.nextTick(function () {
        User.find(condition, function (err, dbClerks) {
            if (err) return next(err);
            dbClerks.sort((a, b) => (a.roles[TYPE_CODE].manager === b.roles[TYPE_CODE].manager) ? 0 : a.roles[TYPE_CODE].manager ? -1 : 1);
            res.json({
                clerkList: dbClerks
                    .filter(aClerk => aClerk.user.phone !== undefined)
                    .map(aClerk => ({
                        phone: aClerk.user.phone,
                        name: aClerk.user.name,
                        isManager: aClerk.roles[TYPE_CODE].manager
                    }))
            });
        });
    });
});

/**
 * @apiName Layoff clerk
 * @apiGroup Stores
 *
 * @api {post} /stores/layoff/:id Layoff specific id
 * @apiUse JWT
 * @apiPermission store_manager
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            type: 'LayoffMessage',
            message: 'Layoff succeed'
        }
 * 
 * @apiUse LayoffError
 */

router.post('/layoff/:id', regAsStoreManager, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var toLayoff = req.params.id;
    process.nextTick(function () {
        User.findOne({
            'user.phone': toLayoff
        }, function (err, clerk) {
            if (err) return next(err);
            if (!clerk)
                return res.status(403).json({
                    code: 'E001',
                    type: "userSearchingError",
                    message: "No User: [" + toLayoff + "] Found",
                    data: toLayoff
                });
            else if (clerk.user.phone === dbStore.user.phone)
                return res.status(403).json({
                    code: 'E002',
                    type: "layoffError",
                    message: "Don't lay off yourself"
                });
            clerk.roles.clerk = null;
            clerk.roles.typeList.splice(clerk.roles.typeList.indexOf(UserRole.CLERK), 1);
            clerk.save(function (err) {
                if (err) return next(err);
                res.json({
                    type: 'LayoffMessage',
                    message: 'Layoff succeed'
                });
            });
        });
    });
});

/**
 * @apiName Store's status
 * @apiGroup Stores
 *
 * @api {get} /stores/status Get store's status
 * @apiUse JWT
 * @apiPermission clerk
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            containers:
            [ 
                { typeCode: 0, name: '12oz 玻璃杯', IdList: [], amount: 0 },
                ...    
            ],
            toReload:
            [ 
                { typeCode: 0, name: '12oz 玻璃杯', IdList: [Array], amount: 5 },
                ...
            ],
            todayData: { 
                rent: 0, 
                return: 0 
            },
            lostList: [// container ID] 
        }
 * 
 */
router.get('/status', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var tmpToUseArr = [];
    var tmpToReloadArr = [];
    let lastUsed = [];
    var type = Object.values(DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE));
    var forLoopLength = (dbStore.project !== "正興杯杯" && dbStore.project !== "咖啡店連線") ? type.length : ((type.length < 2) ? type.length : 2);
    for (var i = 0; i < forLoopLength; i++) {
        tmpToUseArr.push({
            typeCode: type[i].typeCode,
            name: type[i].name,
            IdList: [],
            amount: 0
        });
        tmpToReloadArr.push({
            typeCode: type[i].typeCode,
            name: type[i].name,
            IdList: [],
            amount: 0
        });
    }
    var resJson = {
        containers: tmpToUseArr,
        toReload: tmpToReloadArr,
        todayData: {
            rent: 0,
            return: 0
        },
        lostList: []
    };
    var tmpTypeCode;
    process.nextTick(function () {
        var containerQuery;
        if (dbStore.roles.clerk.storeID === 17) {
            containerQuery = {
                "$or": [{
                        'storeID': dbStore.roles.clerk.storeID,
                        'active': true
                    },
                    {
                        "ID": {
                            "$in": DEMO_CONTAINER_ID_LIST
                        }
                    }
                ]
            };
        } else {
            containerQuery = {
                'storeID': dbStore.roles.clerk.storeID,
                'active': true
            };
        }
        Container.find(containerQuery, function (err, containers) {
            for (let container of containers) {
                lastUsed[container.ID] = {
                    time: container.lastUsedAt.valueOf(),
                    status: container.statusCode
                };
            }
            let now = new Date();
            for (let containerID in lastUsed) {
                var timeToNow = now - lastUsed[containerID].time;
                if ((lastUsed[containerID].status === 1 || lastUsed[containerID].status === 3) && timeToNow >= MILLISECONDS_OF_LOST_CONTAINER_SHOP) {
                    resJson.lostList.push(parseInt(containerID));
                }
            }

            Trade.find({
                'tradeTime': {
                    '$gte': dateCheckpoint(0),
                    '$lt': dateCheckpoint(1)
                },
                '$or': [{
                        'tradeType.action': 'Rent',
                        'oriUser.storeID': dbStore.roles.clerk.storeID
                    },
                    {
                        'tradeType.action': 'Return',
                        'newUser.storeID': dbStore.roles.clerk.storeID
                    },
                    {
                        'tradeType.action': 'UndoReturn',
                        'oriUser.storeID': dbStore.roles.clerk.storeID
                    }
                ]
            }, function (err, trades) {
                if (err) return next(err);
                if (typeof containers !== 'undefined') {
                    for (var i in containers) {
                        tmpTypeCode = containers[i].typeCode;
                        if (tmpTypeCode >= 2 && (dbStore.project === "正興杯杯" || dbStore.project === "咖啡店連線")) continue;
                        if (containers[i].statusCode === 1 || DEMO_CONTAINER_ID_LIST.indexOf(containers[i].ID) !== -1) {
                            resJson.containers[tmpTypeCode].IdList.push(containers[i].ID);
                            resJson.containers[tmpTypeCode].amount++;
                        } else if (containers[i].statusCode === 3) {
                            resJson.toReload[tmpTypeCode].IdList.push(containers[i].ID);
                            resJson.toReload[tmpTypeCode].amount++;
                        }
                    }
                }
                cleanUndoTrade("Return", trades);
                if (typeof trades !== 'undefined') {
                    for (var i in trades) {
                        if (trades[i].tradeType.action === 'Rent')
                            resJson.todayData.rent++;
                        else if (trades[i].tradeType.action === 'Return')
                            resJson.todayData.return++;
                    }
                }
                res.json(resJson);
            });
        });
    });
});

/**
 * @apiName Store's openingTime
 * @apiGroup Stores
 *
 * @api {get} /stores/openingTime Get store's opening time
 * @apiUse JWT
 * @apiPermission clerk
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            opening_hours:
            [ 
                { 
                    _id: String,
                    close: { day: Number, time: String },  //0 means Sunday
                    open: { day: Number, time: String }
                },
                ...  // Missing day means day off
            ],
            isSync: true 
        }
 * 
 */
router.get('/openingTime', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    process.nextTick(function () {
        Store.findOne({
            'id': dbStore.roles.clerk.storeID,
            'active': true
        }, function (err, store) {
            if (err) return next(err);
            if (!store) return next('Mapping store ID failed');
            res.json({
                opening_hours: store.opening_hours,
                isSync: !store.opening_default
            });
        });
    });
});

/**
 * @apiName Store unset default openingTime
 * @apiGroup Stores
 *
 * @api {post} /stores/unsetDefaultOpeningTime Unset default opening time
 * @apiUse JWT
 * @apiPermission clerk
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { }
 * 
 */
router.post('/unsetDefaultOpeningTime', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    process.nextTick(function () {
        Store.findOne({
            'id': dbStore.roles.clerk.storeID,
            'active': true
        }, function (err, store) {
            if (err) return next(err);
            if (!store) return next('Mapping store ID failed');
            store.opening_default = false;
            store.save((err) => {
                if (err) return next(err);
                res.status(204).end();
            });
        });
    });
});

/**
 * @apiName Store get user's apiKey
 * @apiGroup Stores
 *
 * @api {get} /stores/getUser/:phone Get user's apiKey
 * @apiUse JWT
 * @apiPermission clerk
 * @apiPermission bot
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            phone: '09xxxxxxxx', 
            apiKey: String,
            availableAmount: Number
        }
 * 
 * @apiUse RentalQualificationError
 */
router.get('/getUser/:phone', regAsBot, regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var phone = req.params.phone.replace(/tel:|-/g, "");
    const thisRedisKey = redisKey(dbStore.roles.clerk.storeID); // BOT??
    process.nextTick(function () {
        User.findOne({
            'user.phone': new RegExp(phone.toString() + '$', "i")
        }, function (err, dbUser) {
            if (err)
                return next(err);
            if (!dbUser)
                return res.status(403).json({
                    code: 'E001',
                    type: "userSearchingError",
                    message: "No User: [" + phone + "] Found",
                    data: phone
                });
            userIsAvailableForRentContainer(dbUser, null, false, (err, isAvailable, detail) => {
                if (err) return next(err);
                if (!isAvailable) {
                    if (detail.rentalQualification === RentalQualification.BANNED)
                        return res.status(403).json({
                            code: 'F005',
                            type: 'userSearchingError',
                            message: 'User is banned'
                        });
                    if (detail.rentalQualification === RentalQualification.OUT_OF_QUOTA)
                        return res.status(403).json({
                            code: 'F014',
                            type: 'userSearchingError',
                            message: 'User is Out of quota',
                            data: {
                                purchaseStatus: dbUser.getPurchaseStatus(),
                                usingAmount: detail.data.usingAmount,
                                holdingQuantityLimitation: detail.data.holdingQuantityLimitation
                            }
                        });
                    else
                        return next(new Error("User is not available for renting container because of UNKNOWN REASON"));
                }

                var token = crypto.randomBytes(48).toString('hex').substr(0, 10);
                redis.set('user_token:' + token, dbUser.user.phone, (err, reply) => {
                    if (err) return next(err);
                    if (reply !== 'OK') return next(reply);
                    redis.expire('user_token:' + token, 60 * 30, (err, replyNum) => {
                        if (err) return next(err);
                        if (replyNum !== 1) return next(replyNum);
                        res.status(200).json({
                            phone: dbUser.user.phone,
                            apiKey: token,
                            availableAmount: detail.data.availableAmount
                        });
                        redis.zincrby(thisRedisKey, 1, dbUser.user.phone);
                    });
                });
            });
        });
    });
});

/**
 * @apiName Store check unreturned
 * @apiGroup Stores
 *
 * @api {get} /stores/checkUnReturned Check unreturned containers
 * @apiUse JWT
 * @apiPermission clerk
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            data: Array 
        }
 * 
 */
router.get('/checkUnReturned', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var rentedIdList = [];
    var resJson = {
        data: []
    };
    Trade.find({
        'tradeType.action': "Rent",
        'oriUser.storeID': dbStore.roles.clerk.storeID
    }, function (err, rentedList) {
        if (err) return next(err);
        rentedList.sort(function (a, b) {
            return b.tradeTime - a.tradeTime;
        });
        for (var i in rentedList)
            rentedIdList.push(rentedList[i].container.id);
        Trade.find({
            'tradeType.action': "Return",
            'container.id': {
                '$in': rentedIdList
            }
        }, function (err, returnedList) {
            if (err) return next(err);
            returnedList.sort(function (a, b) {
                return b.tradeTime - a.tradeTime;
            });
            for (var i in returnedList) {
                var index = rentedList.findIndex(function (ele) {
                    return ele.container.id === returnedList[i].container.id && ele.container.cycleCtr === returnedList[i].container.cycleCtr;
                });
                if (index !== -1) {
                    rentedList.splice(index, 1);
                }
            }
            for (var i in rentedList) {
                resJson.data.push({
                    id: rentedList[i].container.id,
                    phone: rentedList[i].newUser.phone,
                    by: rentedList[i].oriUser.phone,
                    rentedTime: rentedList[i].tradeTime.getTime()
                });
            }
            res.json(resJson);
        });
    });
});

const timeFormat = /^[0-1]{1}[0-9]{1}|[2]{1}[0-3]{1}:[0-9]{2}$/;
const dayFormat = /^[0-6]{1}$/;
/**
 * @apiName Store change open time
 * @apiGroup Stores
 *
 * @api {post} /stores/changeOpeningTime Change open time
 * @apiUse JWT
 * @apiPermission clerk_manager
 * 
 * @apiParamExample {json} Request-example 
        {
            opening_hours: [{
                close: {
                    time: String //ex. "19:00",
                    day: Number // 1
                },
                open: {
                    time: String //ex. "09:00",
                    day: Number // 1
                },
                _id: String
                },
                ...
            ]               
        }
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            type: 'changeOpeningTime', 
            message: 'Change succeed' 
        }
 * @apiUse ChangeOpeningTimeError
 */
router.post('/changeOpeningTime', regAsStoreManager, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var newData = req.body;
    var days = newData.opening_hours;
    if (Array.isArray(days)) {
        for (var i = 0; i < days.length; i++) {
            if (!(typeof days[i].close !== 'undefined' && typeof days[i].close.day !== 'undefined' && typeof days[i].close.time === 'string' &&
                    typeof days[i].open !== 'undefined' && typeof days[i].open.day !== 'undefined' && typeof days[i].open.time === 'string' &&
                    timeFormat.test(days[i].close.time) && timeFormat.test(days[i].open.time) &&
                    dayFormat.test(days[i].close.day) && dayFormat.test(days[i].open.day))) {
                return res.status(403).json({
                    code: 'E003',
                    type: "changeOpeningTimeError",
                    message: "Data format invalid"
                });
            }
        }
        Store.findOne({
            'id': dbStore.roles.clerk.storeID
        }, (err, aStore) => {
            if (err) return next(err);
            aStore.opening_hours = days;
            aStore.opening_default = true;
            aStore.save((err) => {
                if (err) return next(err);
                res.json({
                    type: "changeOpeningTime",
                    message: "Change succeed"
                });
            });
        });
    } else {
        res.status(403).json({
            code: 'E003',
            type: "changeOpeningTimeError",
            message: "Data format invalid"
        });
    }
});

/**
 * @apiName Store box to sign
 * @apiGroup Stores
 *
 * @api {get} /stores/boxToSign Get box to sign list
 * @apiUse JWT
 * @apiPermission clerk
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            toSign:
            [ 
                { 
                    boxID: String,
                    boxTime: Date,
                    typeList: [Array],
                    containerList: [Object],
                    isDelivering: Boolean,
                    destinationStore: Number //storeID,
                    containerOverview: [Array] 
                },
                ...
            ]
        }
 * 
 */
router.get('/boxToSign', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    process.nextTick(function () {
        var containerDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_WITH_DEACTIVE);
        var type = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
        Box.find({
            'storeID': dbStore.roles.clerk.storeID,
            'delivering': true
        }, {}, {
            "sort": {
                "updatedAt": -1
            }
        }, function (err, boxList) {
            if (err) return next(err);
            var boxArr = [];
            if (boxList.length !== 0) {
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
                        typeList: thisBoxTypeList,
                        containerList: thisBoxContainerList,
                        isDelivering: false,
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
            }
            Trade.find({
                'tradeType.action': 'Sign',
                'newUser.storeID': dbStore.roles.clerk.storeID,
                'tradeTime': {
                    '$gte': dateCheckpoint(1 - historyDays)
                }
            }, function (err, list) {
                if (err) return next(err);
                if (list.length !== 0) {
                    list.sort((a, b) => b.tradeTime - a.tradeTime);
                    var boxHistoryArr = [];
                    var boxIDArr = [];
                    var thisBoxTypeList;
                    var thisBoxContainerList;
                    var lastIndex;
                    var nowIndex;
                    for (var i = 0; i < list.length; i++) {
                        thisBox = list[i].container.box;
                        thisType = type[list[i].container.typeCode].name;
                        lastIndex = boxHistoryArr.length - 1;
                        if (lastIndex < 0 || boxHistoryArr[lastIndex].boxID !== thisBox || (boxHistoryArr[lastIndex].boxTime - list[i].tradeTime) !== 0) {
                            boxIDArr.push(thisBox);
                            boxHistoryArr.push({
                                boxID: thisBox,
                                boxTime: list[i].tradeTime,
                                typeList: [],
                                containerList: {},
                                isDelivering: true,
                                destinationStore: list[i].newUser.storeID
                            });
                        }
                        nowIndex = boxHistoryArr.length - 1;
                        thisBoxTypeList = boxHistoryArr[nowIndex].typeList;
                        thisBoxContainerList = boxHistoryArr[nowIndex].containerList;
                        if (thisBoxTypeList.indexOf(thisType) < 0) {
                            thisBoxTypeList.push(thisType);
                            thisBoxContainerList[thisType] = [];
                        }
                        thisBoxContainerList[thisType].push(list[i].container.id);
                    }
                    for (var i = 0; i < boxHistoryArr.length; i++) {
                        boxHistoryArr[i].containerOverview = [];
                        for (var j = 0; j < boxHistoryArr[i].typeList.length; j++) {
                            boxHistoryArr[i].containerOverview.push({
                                containerType: boxHistoryArr[i].typeList[j],
                                amount: boxHistoryArr[i].containerList[boxHistoryArr[i].typeList[j]].length
                            });
                        }
                    }
                    boxArr = boxArr.concat(boxHistoryArr);
                }
                var resJSON = {
                    toSign: boxArr
                };
                res.json(resJSON);
            });
        });
    });
});

/**
 * @apiName Store use amount
 * @apiGroup Stores
 *
 * @api {get} /stores/usedAmount Get used amount
 * @apiUse JWT
 * @apiPermission clerk
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            store:
            [ 
                { typeCode: Number, amount: Number },
                ...
            ],
            total: Number 
        }
 * 
 */
router.get('/usedAmount', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    process.nextTick(function () {
        var type = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
        Promise
            .all([new Promise((resolve, reject) => {
                    Trade.find({
                        'tradeType.action': 'Rent',
                        'oriUser.storeID': dbStore.roles.clerk.storeID
                    }, (err, tradeList) => {
                        if (err) return reject(err);
                        var dataList = {};
                        for (var aType in type) {
                            dataList[type[aType].typeCode] = {
                                typeCode: type[aType].typeCode,
                                amount: 0
                            };
                        }
                        for (var j = 0; j < tradeList.length; j++) {
                            dataList[tradeList[j].container.typeCode].amount++;
                        }
                        resolve(dataList);
                    });
                }),
                new Promise((resolve, reject) => {
                    getGlobalUsedAmount((err, globalAmount) => {
                        if (err) return reject(err);
                        resolve(globalAmount);
                    });
                })
            ])
            .then((data) => {
                res.json({
                    store: Object.values(data[0]),
                    total: data[1]
                });
            }).catch(err => next(err));
    });
});

/**
 * @apiName Store history
 * @apiGroup Stores
 *
 * @api {get} /stores/history Get history
 * @apiUse JWT
 * @apiPermission clerk
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            rentHistory: { 
                amount: Number, 
                dataList: Array 
            },
            returnHistory: { 
                amount: Number, 
                dataList: Array
            } 
        }
 * 
 */
router.get('/history', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var type = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
    process.nextTick(function () {
        Trade.find({
            'tradeTime': {
                '$gte': dateCheckpoint(1 - historyDays),
                '$lt': dateCheckpoint(1)
            },
            'tradeType.action': 'Rent',
            'oriUser.storeID': dbStore.roles.clerk.storeID
        }, function (err, rentTrades) {
            if (err) return next(err);
            Trade.find({
                'tradeTime': {
                    '$gte': dateCheckpoint(1 - historyDays),
                    '$lt': dateCheckpoint(1)
                },
                'tradeType.action': 'Return',
                'newUser.storeID': dbStore.roles.clerk.storeID
            }, function (err, returnTrades) {
                if (err) return next(err);
                if (typeof rentTrades !== 'undefined' && typeof returnTrades !== 'undefined') {
                    parseHistory(rentTrades, 'Rent', type, function (parsedRent) {
                        let resJson = {
                            rentHistory: {
                                amount: parsedRent.length,
                                dataList: parsedRent
                            }
                        };
                        parseHistory(returnTrades, 'Return', type, function (parsedReturn) {
                            resJson.returnHistory = {
                                amount: parsedReturn.length,
                                dataList: parsedReturn
                            };
                            res.json(resJson);
                        });
                    });
                }
            });
        });
    });
});

/**
 * @apiName Store history by container type
 * @apiGroup Stores
 *
 * @api {get} /stores/history/byContainerType Get history by container type
 * @apiUse JWT
 * @apiPermission clerk
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            personalLostHistory: Array,
            storeLostHistory: Array,
            usedHistory: Array,
            rentHistory: Array,
            returnHistory: Array,
            cleanReloadHistory: Array 
        }
 * 
 */
router.get('/history/byContainerType', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    var type = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
    req.clearTimeout();
    var tradeQuery = {
        '$or': [{
                'tradeType.action': 'Sign',
                'newUser.storeID': dbStore.roles.clerk.storeID
            },
            {
                'tradeType.action': 'Rent',
                'oriUser.storeID': dbStore.roles.clerk.storeID
            },
            {
                'tradeType.action': 'Return',
                'newUser.storeID': dbStore.roles.clerk.storeID
            },
            {
                'tradeType.action': 'Return',
                'oriUser.storeID': dbStore.roles.clerk.storeID
            },
            {
                'tradeType.action': 'UndoReturn',
                'oriUser.storeID': dbStore.roles.clerk.storeID
            },
            {
                'tradeType.action': 'ReadyToClean',
            },
            {
                'tradeType.action': 'UndoReadyToClean'
            }
        ]
    };
    if (req.query.days)
        Object.assign(tradeQuery, {
            'tradeTime': {
                '$gte': dateCheckpoint(1 - parseInt(req.query.days)),
                '$lt': dateCheckpoint(1)
            }
        });
    Trade.find(tradeQuery, {}, {
        sort: {
            tradeTime: 1
        }
    }, function (err, tradeList) {
        if (err) return next(err);

        cleanUndoTrade(['Return', 'ReadyToClean'], tradeList);

        var storeLostTradesDict = {};
        var personalLostTradesDict = {};
        var usedTrades = [];
        var rentTrades = [];
        var returnTrades = [];
        var cleanReloadTrades = [];
        tradeList.forEach(aTrade => {
            let containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
            if (aTrade.tradeType.action === "Sign") {
                storeLostTradesDict[containerKey] = aTrade;
            } else if (aTrade.tradeType.action === "Rent") {
                rentTrades.push(aTrade);
                personalLostTradesDict[containerKey] = aTrade;
                if (storeLostTradesDict[containerKey]) {
                    usedTrades.push(aTrade);
                    delete storeLostTradesDict[containerKey];
                }
            } else if (aTrade.tradeType.action === "Return") {
                returnTrades.push(aTrade);
                if (aTrade.oriUser.storeID === dbStore.roles.clerk.storeID && storeLostTradesDict[containerKey]) {
                    usedTrades.push(aTrade);
                    delete storeLostTradesDict[containerKey];
                }
                if (aTrade.newUser.storeID === dbStore.roles.clerk.storeID) {
                    storeLostTradesDict[containerKey] = aTrade;
                }
                if (personalLostTradesDict[containerKey]) {
                    delete personalLostTradesDict[containerKey];
                }
            } else if (aTrade.tradeType.action === "ReadyToClean") {
                if (aTrade.tradeType.oriState === 1 && aTrade.oriUser.storeID === dbStore.roles.clerk.storeID) {
                    cleanReloadTrades.push(aTrade);
                    if (storeLostTradesDict[containerKey]) {
                        delete storeLostTradesDict[containerKey];
                    }
                } else if (aTrade.tradeType.oriState === 3 && storeLostTradesDict[containerKey]) {
                    usedTrades.push(aTrade);
                    delete storeLostTradesDict[containerKey];
                }
                if (personalLostTradesDict[containerKey]) {
                    delete personalLostTradesDict[containerKey];
                }
            }
        });

        var newTypeArrGenerator = newTypeArrGeneratorFunction(type);

        var resJson = {
            personalLostHistory: [],
            storeLostHistory: [],
            usedHistory: [],
            rentHistory: [],
            returnHistory: [],
            cleanReloadHistory: []
        };
        var personalLostTrades = Object.values(personalLostTradesDict);
        var storeLostTrades = Object.values(storeLostTradesDict);
        usageByDateByTypeGenerator(newTypeArrGenerator, personalLostTrades, resJson.personalLostHistory);
        usageByDateByTypeGenerator(newTypeArrGenerator, storeLostTrades, resJson.storeLostHistory);
        usageByDateByTypeGenerator(newTypeArrGenerator, usedTrades, resJson.usedHistory);
        usageByDateByTypeGenerator(newTypeArrGenerator, cleanReloadTrades, resJson.cleanReloadHistory);
        usageByDateByTypeGenerator(newTypeArrGenerator, rentTrades, resJson.rentHistory);
        usageByDateByTypeGenerator(newTypeArrGenerator, returnTrades, resJson.returnHistory);
        for (let aHistoryType in resJson) {
            let thisHistoryType = resJson[aHistoryType];
            for (let historyArrIndex in thisHistoryType) {
                if (thisHistoryType[historyArrIndex].amount === 0)
                    delete thisHistoryType[historyArrIndex];
            }
        }
        res.json(resJson);
    });
});

function newTypeArrGeneratorFunction(type) {
    return function () {
        var tmpArr = [];
        for (var aType in type) {
            tmpArr.push({
                typeCode: type[aType].typeCode,
                name: type[aType].name,
                // IdList: [],
                amount: 0
            });
        }
        return tmpArr;
    };
}

function usageByDateByTypeGenerator(newTypeArrGenerator, arrToParse, resultArr) {
    if (arrToParse.length > 0) {
        var tmpTypeCode;
        var checkpoint = getDateCheckpoint(arrToParse[0].tradeTime);
        resultArr.push({
            date: fullDateString(checkpoint),
            amount: 0,
            data: newTypeArrGenerator()
        });
        for (var i = 0; i < arrToParse.length; i++) {
            let theTrade = arrToParse[i];
            if (theTrade.tradeTime - checkpoint > 1000 * 60 * 60 * 24) {
                checkpoint = getDateCheckpoint(theTrade.tradeTime);
                resultArr.push({
                    date: fullDateString(checkpoint),
                    amount: 0,
                    data: newTypeArrGenerator()
                });
                i--;
            } else {
                if (theTrade.container) {
                    tmpTypeCode = theTrade.container.typeCode;
                    // resultArr[resultArr.length - 1].data[tmpTypeCode].IdList.push(theTrade.container.id);
                    resultArr[resultArr.length - 1].data[tmpTypeCode].amount++;
                    resultArr[resultArr.length - 1].amount++;
                }
            }
        }
    }
}

/**
 * @apiName Store history by customer //To do (oriUser.storeID)
 * @apiGroup Stores
 *
 * @api {get} /stores/history/byCustomer Get history by customer
 * @apiUse JWT
 * @apiPermission clerk
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            totalDistinctCustomer: Number, 
            customerSummary: Object
        }
 * 
 */
router.get('/history/byCustomer', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    let tradeQuery = {
        "tradeType.action": "Rent",
        'oriUser.storeID': dbStore.roles.clerk.storeID
    };
    if (req.query.days)
        Object.assign(tradeQuery, {
            'tradeTime': {
                '$gte': dateCheckpoint(1 - parseInt(req.query.days)),
                '$lt': dateCheckpoint(1)
            }
        });
    Trade.find(tradeQuery, {}, {
        "sort": {
            "tradeTime": 1
        }
    }, (err, rentTradeList) => {
        if (err) return next(err);
        let customerByDateDict = {};
        let customeList = [];

        rentTradeList.forEach(aTrade => {
            let customerPhone = aTrade.newUser.phone;
            let tradeDate = fullDateString(aTrade.tradeTime);
            if (customeList.indexOf(customerPhone) === -1) customeList.push(customerPhone);
            if (!customerByDateDict[tradeDate]) customerByDateDict[tradeDate] = {};
            if (!customerByDateDict[tradeDate][customerPhone]) customerByDateDict[tradeDate][customerPhone] = [];
            customerByDateDict[tradeDate][customerPhone].push(aTrade.container.id);
        });

        for (let aDate in customerByDateDict) {
            let oriData = customerByDateDict[aDate];
            customerByDateDict[aDate] = {
                distinctCustomerAmount: Object.keys(oriData).length,
                averageContainerUsage: Object.values(oriData).reduce((ctr, thisItem) => ctr + thisItem.length, 0) /
                    Object.keys(oriData).length
            };
        }

        res.json({
            totalDistinctCustomer: customeList.length,
            customerSummary: customerByDateDict
        });
    });
});

/**
 * @apiName Store performance // To do (oriUser storeID)
 * @apiGroup Stores
 *
 * @api {get} /stores/performance Get store performance
 * @apiUse JWT
 * @apiPermission clerk
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 

        }
 * 
 */
router.get('/performance', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    let orderBy = req.query.by;

    Trade.find({
        'tradeType.action': 'Rent',
        'oriUser.storeID': dbStore.roles.clerk.storeID
    }, function (err, rentTrades) {
        if (err) return next(err);
        let clerkDict = {};
        if (orderBy && orderBy === "date") {
            rentTrades.forEach(aTrade => {
                let dateCheckpoint = fullDateString(getDateCheckpoint(aTrade.tradeTime));
                if (!clerkDict[aTrade.oriUser.phone]) clerkDict[aTrade.oriUser.phone] = {};
                let aClerk = clerkDict[aTrade.oriUser.phone];
                if (!aClerk[dateCheckpoint]) aClerk[dateCheckpoint] = 1;
                else aClerk[dateCheckpoint]++;
            });
        } else {
            rentTrades.forEach(aTrade => {
                if (!clerkDict[aTrade.oriUser.phone]) clerkDict[aTrade.oriUser.phone] = 1;
                else clerkDict[aTrade.oriUser.phone]++;
            });
        }
        res.json(clerkDict);
    });
});

/**
 * @apiName Store frequent guest list
 * @apiGroup Stores
 *
 * @api {get} /stores/favorite Get frequent guest list
 * @apiUse JWT
 * @apiPermission clerk
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            userList:
            [
                { phone: '09xxxxxxxx', times: Number },
                ...
            ] 
    }
 * 
 */
router.get('/favorite', regAsStore, validateRequest, function (req, res, next) {
    var dbStore = req._user;
    const thisRedisKey = redisKey(dbStore.roles.clerk.storeID);
    redis.exists(thisRedisKey, (err, keyIsExists) => {
        if (err) return next(err);
        if (keyIsExists) {
            redis.zrevrange(thisRedisKey, 0, 4, "withscores", (err, reply) => {
                if (err) return next(err);
                let favoriteList = [];
                reply.forEach((theValue, index) => {
                    if (index % 2 === 0) {
                        return favoriteList.push({
                            phone: theValue
                        });
                    } else {
                        return Object.assign(favoriteList[favoriteList.length - 1], {
                            times: parseInt(theValue)
                        });
                    }
                });
                res.json({
                    userList: favoriteList
                });
            });
        } else {
            Trade.find({
                'tradeType.action': 'Rent',
                'oriUser.storeID': dbStore.roles.clerk.storeID
            }, function (err, rentTrades) {
                if (err) return next(err);
                if (typeof rentTrades !== 'undefined') {
                    getFavorite(rentTrades, function (userList) {
                        let favoriteList = userList.slice(0, 5);
                        res.json({
                            userList: favoriteList
                        });
                        userList.map(aUser => redis.zadd(thisRedisKey, aUser.times, aUser.phone));
                    });
                }
            });
        }
    });
});

router.get("/bookedContainer", (req, res, next) => { // none json reply
    getBookedAmount((err, result) => {
        if (err) return next(err);
        const storeDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
        let txt = "";
        result.forEach(aResult => {
            txt += `${storeDict[aResult._id].name}：${aResult.amount}、`
        })
        res.send(txt).end();
    });
});

function parseHistory(data, dataType, type, callback) {
    var aHistory;
    var lastHistory;
    var thisPhone;
    var lastPhone;
    var phoneFormatted;
    if (data.length === 0) return callback([]);
    else if (data.length === 1) {
        aHistory = data[0];
        if (dataType === 'Rent')
            lastPhone = aHistory.newUser.phone;
        else if (dataType === 'Return')
            lastPhone = aHistory.oriUser.phone;
    } else {
        data.sort(function (a, b) {
            return b.tradeTime - a.tradeTime;
        });
    }
    var byOrderArr = [];
    var tmpContainerList = [];
    tmpContainerList.push('#' + intReLength(data[0].container.id, 3) + " | " + type[data[0].container.typeCode].name);
    for (var i = 1; i < data.length; i++) {
        aHistory = data[i];
        lastHistory = data[i - 1];
        if (dataType === 'Rent') {
            thisPhone = aHistory.newUser.phone;
            lastPhone = lastHistory.newUser.phone;
        } else if (dataType === 'Return') {
            thisPhone = aHistory.oriUser.phone;
            lastPhone = lastHistory.oriUser.phone;
        }
        if (Math.abs(lastHistory.tradeTime - aHistory.tradeTime) > 100) {
            phoneFormatted = (dataType === 'Return') ? '' : lastPhone;
            byOrderArr.push({
                time: lastHistory.tradeTime,
                phone: phoneFormatted,
                containerAmount: tmpContainerList.length,
                containerList: tmpContainerList
            });
            tmpContainerList = [];
        }
        tmpContainerList.push('#' + intReLength(aHistory.container.id, 3) + " | " + type[aHistory.container.typeCode].name);
    }
    phoneFormatted = (dataType === 'Return') ? '' : (lastPhone.slice(0, 4) + "-***-" + lastPhone.slice(7, 10));
    byOrderArr.push({
        time: aHistory.tradeTime,
        phone: phoneFormatted,
        containerAmount: tmpContainerList.length,
        containerList: tmpContainerList
    });
    var byDateArr = [];
    var tmpOrderList = [];
    var tmpOrderAmount = 0;
    var date = 0;
    for (var i = 0; i < byOrderArr.length; i++) {
        let aOrder = byOrderArr[i];
        let nextOrder = byOrderArr[i + 1];
        if (aOrder.time < dateCheckpoint(date + 1) && aOrder.time >= dateCheckpoint(date)) {
            aOrder.time = timeFormatter(aOrder.time);
            tmpOrderList.push(aOrder);
        } else {
            i--;
        }
        if (!nextOrder || !(nextOrder.time < dateCheckpoint(date + 1) && nextOrder.time >= dateCheckpoint(date))) {
            tmpOrderAmount = 0;
            for (var j = 0; j < tmpOrderList.length; j++) {
                tmpOrderAmount += tmpOrderList[j].containerAmount;
            }
            byDateArr.push({
                date: fullDateString(dateCheckpoint(date)),
                orderAmount: tmpOrderAmount,
                orderList: tmpOrderList
            });
            tmpOrderList = [];
            date--;
        }
    }
    while (date > (-1 * historyDays)) {
        byDateArr.push({
            date: fullDateString(dateCheckpoint(date)),
            orderAmount: 0,
            orderList: []
        });
        date--;
    }
    return callback(byDateArr);
}

function getFavorite(data, callback) {
    if (data.length === 0) return callback([]);
    data.sort(function (a, b) {
        return b.tradeTime - a.tradeTime;
    });
    var byOrderArr = [];
    var aHistory;
    var lastHistory;
    var thisPhone = data[0].newUser.phone;
    var lastPhone;
    for (var i = 1; i < data.length; i++) {
        aHistory = data[i];
        lastHistory = data[i - 1];
        thisPhone = aHistory.newUser.phone;
        lastPhone = lastHistory.newUser.phone;
        if ((lastHistory.tradeTime - aHistory.tradeTime) !== 0 || lastPhone !== thisPhone) {
            byOrderArr.push(thisPhone);
        }
    }
    byOrderArr.push(thisPhone);
    var count = {};
    for (var i = 0; i < byOrderArr.length; i++) {
        if (byOrderArr[i] in count) {
            count[byOrderArr[i]]++;
        } else {
            count[byOrderArr[i]] = 1;
        }
    }
    var sortable = [];
    for (var phone in count) {
        sortable.push({
            phone: phone,
            times: count[phone]
        });
    }
    sortable.sort(function (a, b) {
        return b.times - a.times;
    });
    return callback(sortable);
}

module.exports = router;