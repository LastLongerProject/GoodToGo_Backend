const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const debug = require('../helpers/debugger')('stores');
const redis = require("../models/redis");
const DataCacheFactory = require("../models/dataCacheFactory");

const baseUrl = require('../config/config.js').serverUrl;
const getStoreListInArea = require('../helpers/tools').getStoreListInArea;
const intReLength = require('../helpers/toolkit').intReLength;
const timeFormatter = require('../helpers/toolkit').timeFormatter;
const cleanUndoTrade = require('../helpers/toolkit').cleanUndoTrade;
const dateCheckpoint = require('../helpers/toolkit').dateCheckpoint;
const fullDateString = require('../helpers/toolkit').fullDateString;
const getDateCheckpoint = require('../helpers/toolkit').getDateCheckpoint;

const validateDefault = require('../middlewares/validation/authorization/validateDefault');
const validateRequest = require('../middlewares/validation/authorization/validateRequest').JWT;
const checkRoleIs = require('../middlewares/validation/authorization/validateRequest').checkRoleIs;
const checkRoleIsStore = require('../middlewares/validation/authorization/validateRequest').checkRoleIsStore;
const checkRoleIsCleanStation = require('../middlewares/validation/authorization/validateRequest').checkRoleIsCleanStation;
const Box = require('../models/DB/boxDB');
const User = require('../models/DB/userDB');
const Store = require('../models/DB/storeDB');
const Trade = require('../models/DB/tradeDB');
const Place = require('../models/DB/placeIdDB');
const Container = require('../models/DB/containerDB');
const getGlobalUsedAmount = require('../models/computed/containerStatistic').global_used;
const getBookedAmount = require('../models/computed/containerStatistic').all_stores_booked;
const DEMO_CONTAINER_ID_LIST = require('../config/config').demoContainers;
const RoleType = require('../models/enums/userEnum').RoleType;
const RoleElement = require('../models/enums/userEnum').RoleElement;
const RentalQualification = require('../models/enums/userEnum').RentalQualification;
const ContainerAction = require('../models/enums/containerEnum').Action;
const ContainerState = require('../models/enums/containerEnum').State;
const BoxStatus = require('../models/enums/boxEnum').BoxStatus;

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

/**
 * @apiName Store list JSON
 * @apiGroup Stores
 *
 * @api {get} /stores/forOfficialPage Get store list for Official Page
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            storeList : [{"placeid": "ChIJ_6XE3YR2bjQRRRlO77NBeqE",
                "name": "方糖咖啡",
                "photo": "http://localhost:3030/images/store/12?ver=1",
                "url": "https://maps.google.com/?cid=11635684828334922053",
                "address": "台灣台南市東區府連路437號",
                "opening_hours": {
                    "periods": [
                        {
                            "_id": "5daf3b8c5ce627524c2e9c22",
                            "close": {
                                "time": "17:00",
                                "day": 0
                            },
                            "open": {
                                "time": "06:30",
                                "day": 0
                            }
                        },...
                    ]
                },
                "geometry_location": {
                    "lat": 22.9864553,
                    "lng": 120.2171809
                },
                "borrow": true,
                "return": true,
                "type": "咖啡"},...]
        }
 * 
 */
router.get('/list/forOfficialPage', function (req, res, next) {
    Place.find({
        "project": {
            "$in": ["正興杯杯", "咖啡店連線", "器喝茶", "慧群", "磐飛", "foodpanda"]
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
 * @apiName Store list JSON
 * @apiGroup Stores
 *
 * @api {get} /stores/forLineMap Get store list for Line Map
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            storeList : [{"placeid": "ChIJ_6XE3YR2bjQRRRlO77NBeqE",
                "name": "方糖咖啡",
                "photo": "http://localhost:3030/images/store/12?ver=1",
                "url": "https://maps.google.com/?cid=11635684828334922053",
                "address": "台灣台南市東區府連路437號",
                "id": 1,
                "opening_hours": {
                    "periods": [
                        {
                            "_id": "5daf3b8c5ce627524c2e9c22",
                            "close": {
                                "time": "17:00",
                                "day": 0
                            },
                            "open": {
                                "time": "06:30",
                                "day": 0
                            }
                        },...
                    ]
                },
                "geometry_location": {
                    "lat": 22.9864553,
                    "lng": 120.2171809
                },
                "borrow": true,
                "return": true,
                "type": "咖啡"},...]
        }
 * 
 */
router.get('/list/forLineMap', function (req, res, next) {
    Place.find({
        "project": {
            "$in": ["正興杯杯", "咖啡店連線", "器喝茶", "慧群", "磐飛", "foodpanda"]
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
                    id: aStore.ID,
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
                    type: aStore.type,
                    project: aStore.project,
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
 * @apiName Store dict
 * @apiGroup Stores
 *
 * @api {get} /stores/dict Get store dict
 * @apiUse JWT
 * @apiPermission station
 * @apiPermission clerk
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

router.get('/dict', checkRoleIsStore(), checkRoleIsCleanStation(), validateRequest, function (req, res, next) {
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

/**
 * @apiName Store inZone
 * @apiGroup Stores
 *
 * @api {get} /stores/inZone Get store list in Station's Zone
 * @apiUse JWT
 * @apiPermission station
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        { 
            'storeIdList': [0, 1, 2,...] // Number, storeID
        }
 * 
 */

router.get('/inZone', checkRoleIsCleanStation(), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStationID;
    let thisRoleType = dbRole.roleType;
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
    res.json({
        storeIdList: getStoreListInArea(thisStationID)
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
router.get('/clerkList', checkRoleIs([{
    roleType: RoleType.STORE,
    condition: {
        manager: true
    }
}, {
    roleType: RoleType.CLEAN_STATION,
    condition: {
        manager: true
    }
}]), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    const thisRoleType = dbRole.roleType;
    let condition;
    let stationID, storeID;
    try {
        switch (thisRoleType) {
            case RoleType.CLEAN_STATION:
                stationID = dbRole.getElement(RoleElement.STATION_ID, false);
                condition = {
                    roleList: {
                        $elemMatch: {
                            stationID
                        }
                    }
                };
                break;
            case RoleType.STORE:
                storeID = dbRole.getElement(RoleElement.STORE_ID, false);
                condition = {
                    roleList: {
                        $elemMatch: {
                            storeID
                        }
                    }
                };
                break;
            default:
                return next();
        }
    } catch (error) {
        return next(error);
    }
    User.find(condition, function (err, dbClerks) {
        if (err) return next(err);
        try {
            res.json({
                clerkList: dbClerks
                    .filter(aClerk => aClerk.user.phone !== undefined)
                    .map(aClerk => {
                        const theRole = aClerk.findRole({
                            roleType: thisRoleType,
                            storeID,
                            stationID
                        });
                        return {
                            phone: aClerk.user.phone,
                            name: aClerk.user.name,
                            isManager: theRole.getElement(RoleElement.MANAGER, false)
                        };
                    })
                    .sort((a, b) => (a.isManager === b.isManager) ? 0 : a.isManager ? -1 : 1)
            });
        } catch (error) {
            return next(error);
        }
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

router.post('/layoff/:id', checkRoleIs([{
    roleType: RoleType.STORE,
    condition: {
        manager: true
    }
}, {
    roleType: RoleType.CLEAN_STATION,
    condition: {
        manager: true
    }
}]), validateRequest, function (req, res, next) {
    const dbStore = req._user;
    const dbRole = req._thisRole;
    const thisRoleType = dbRole.roleType;
    const toLayoff = req.params.id;
    let storeID = null;
    let stationID = null;
    try {
        switch (thisRoleType) {
            case RoleType.CLEAN_STATION:
                stationID = dbRole.getElement(RoleElement.STATION_ID, false);
                break;
            case RoleType.STORE:
                storeID = dbRole.getElement(RoleElement.STORE_ID, false);
                break;
            default:
                return next();
        }
    } catch (error) {
        return next(error);
    }
    User.findOne({
        'user.phone': toLayoff
    }, function (err, theUser) {
        if (err) return next(err);
        if (!theUser)
            return res.status(403).json({
                code: 'E001',
                type: "userSearchingError",
                message: "No User: [" + toLayoff + "] Found",
                data: toLayoff
            });
        else if (theUser.user.phone === dbStore.user.phone)
            return res.status(403).json({
                code: 'E002',
                type: "layoffError",
                message: "Don't lay off yourself"
            });
        const doneRemoveRole = (err, roleDelete, detail) => {
            if (err) return next(err);
            if (!roleDelete) return next(detail);
            theUser.save(function (err) {
                if (err) return next(err);
                res.json({
                    type: 'LayoffMessage',
                    message: 'Layoff succeed'
                });
            });
        };
        if (storeID !== null) {
            theUser.removeRole(RoleType.STORE, {
                storeID
            }, doneRemoveRole);
        } else if (stationID !== null) {
            theUser.removeRole(RoleType.CLEAN_STATION, {
                stationID
            }, doneRemoveRole);
        }
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
router.get('/status', checkRoleIsStore(), validateRequest, function (req, res, next) {
    const dbStore = req._user;
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
    var tmpToUseArr = [];
    var tmpToReloadArr = [];
    let lastUsed = [];
    var type = Object.values(DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE));
    var forLoopLength = (dbStore.project !== "正興杯杯" && dbStore.project !== "咖啡店連線") ? type.length : ((type.length < 2) ? type.length : 2);
    for (let i = 0; i < forLoopLength; i++) {
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
    var containerQuery;
    if (thisStoreID === 17) {
        containerQuery = {
            "$or": [{
                    'storeID': thisStoreID,
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
            'storeID': thisStoreID,
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
                    'tradeType.action': ContainerAction.RENT,
                    'oriUser.storeID': thisStoreID
                },
                {
                    'tradeType.action': ContainerAction.UNDO_RENT,
                    'newUser.storeID': thisStoreID
                },
                {
                    'tradeType.action': ContainerAction.RETURN,
                    'newUser.storeID': thisStoreID
                },
                {
                    'tradeType.action': ContainerAction.UNDO_RETURN,
                    'oriUser.storeID': thisStoreID
                }
            ]
        }, {}, {
            sort: {
                tradeTime: 1
            }
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
            cleanUndoTrade([ContainerAction.RENT, ContainerAction.RETURN], trades);
            if (typeof trades !== 'undefined') {
                for (let i in trades) {
                    if (trades[i].tradeType.action === ContainerAction.RENT)
                        resJson.todayData.rent++;
                    else if (trades[i].tradeType.action === ContainerAction.RETURN)
                        resJson.todayData.return++;
                }
            }
            res.json(resJson);
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
router.get('/openingTime', checkRoleIsStore(), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
    Store.findOne({
        'id': thisStoreID,
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
router.post('/unsetDefaultOpeningTime', checkRoleIsStore(), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
    Store.findOne({
        'id': thisStoreID,
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
router.get('/getUser/:phone', checkRoleIs([{
    roleType: RoleType.STORE
}, {
    roleType: RoleType.BOT
}]), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    const thisRoleType = dbRole.roleType;
    let thisStoreCategory;
    let thisStoreID;
    try {
        thisStoreCategory = dbRole.getElement(RoleElement.STORE_CATEGORY, false);

        switch (thisRoleType) {
            case RoleType.BOT:
                thisStoreID = dbRole.getElement(RoleElement.RENT_FROM_STORE_ID, true);
                break;
            case RoleType.STORE:
                thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
                break;
            default:
                return next();
        }
    } catch (error) {
        return next(error);
    }
    const phone = req.params.phone.replace(/tel:|-/g, "");
    const thisRedisKey = thisStoreID === null ? null : redisKey(thisStoreID);
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
                data: {
                    phone
                } // FIXME: unify the data type of 'data' field
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

            if (thisStoreCategory === 0 && dbUser.hasVerified === false) {
                return res.status(403).json({
                    code: 'F017',
                    type: 'userSearchingError',
                    message: 'The user is not verified'
                });
            }

            var token = crypto.randomBytes(48).toString('hex').substr(0, 10);
            redis.setex('user_token:' + token, 60 * 30, dbUser.user.phone, (err, reply) => {
                if (err) return next(err);
                if (reply !== 'OK') return next(reply);
                res.status(200).json({
                    phone: dbUser.user.phone,
                    apiKey: token,
                    availableAmount: detail.data.availableAmount
                });
                if (thisRedisKey !== null)
                    redis.zincrby(thisRedisKey, 1, dbUser.user.phone);
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
            data: [{
                id: Number,
                phone: String,
                by: String,
                rentedTime: Number // Millisecond
            },...] 
        }
 * 
 */
router.get('/checkUnReturned', checkRoleIsStore(), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
    Trade.find({
        '$or': [{
                'tradeType.action': ContainerAction.RENT,
                'oriUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.UNDO_RENT,
                'newUser.storeID': thisStoreID
            }
        ],
    }, ["container.id", "container.cycleCtr", "newUser.phone", "oriUser.phone", "tradeTime", "tradeType.action"], {
        $sort: {
            tradeTime: 1
        }
    }, function (err, rentedList) {
        if (err) return next(err);
        cleanUndoTrade(ContainerAction.RENT, rentedList);
        let rentedIdList = rentedList.map(aRecord => aRecord.container.id);
        Trade.find({
            'tradeType.action': {
                "$in": [ContainerAction.RETURN, ContainerAction.UNDO_RETURN]
            },
            'container.id': {
                '$in': rentedIdList
            }
        }, ["container.id", "container.cycleCtr", "tradeType.action"], {
            $sort: {
                tradeTime: 1
            }
        }, function (err, returnedList) {
            if (err) return next(err);
            cleanUndoTrade(ContainerAction.RETURN, returnedList);
            let rentHistory = {};
            rentedList.forEach(aTrade => {
                const tradeKey = `${aTrade.container.id}-${aTrade.container.cycleCtr}`;
                rentHistory[tradeKey] = {
                    id: aTrade.container.id,
                    phone: aTrade.newUser.phone,
                    by: aTrade.oriUser.phone,
                    rentedTime: aTrade.tradeTime.valueOf()
                };
            });
            returnedList.forEach(aTrade => {
                const tradeKey = `${aTrade.container.id}-${aTrade.container.cycleCtr}`;
                if (!rentHistory[tradeKey]) return;
                delete rentHistory[tradeKey];
            });
            res.json({
                data: Object.values(rentHistory).sort((a, b) => b.rentedTime - a.rentedTime)
            });
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
router.post('/changeOpeningTime', checkRoleIsStore({
    "manager": true
}), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
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
            'id': thisStoreID
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
router.get('/boxToSign', checkRoleIsStore(), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
    const containerDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_WITH_DEACTIVE);
    const type = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
    Box.find({
        'storeID': thisStoreID,
        'status': BoxStatus.Delivering
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
            for (let i = 0; i < boxArr.length; i++) {
                boxArr[i].containerOverview = [];
                for (let j = 0; j < boxArr[i].typeList.length; j++) {
                    boxArr[i].containerOverview.push({
                        containerType: boxArr[i].typeList[j],
                        amount: boxArr[i].containerList[boxArr[i].typeList[j]].length
                    });
                }
            }
        }
        Trade.find({
            'tradeType.action': ContainerAction.SIGN,
            'newUser.storeID': thisStoreID,
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
                for (let i = 0; i < boxHistoryArr.length; i++) {
                    boxHistoryArr[i].containerOverview = [];
                    for (let j = 0; j < boxHistoryArr[i].typeList.length; j++) {
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
router.get('/usedAmount', checkRoleIsStore(), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
    const type = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
    Promise
        .all([new Promise((resolve, reject) => {
                Trade.find({
                    '$or': [{
                            'tradeType.action': ContainerAction.RENT,
                            'oriUser.storeID': thisStoreID
                        },
                        {
                            'tradeType.action': ContainerAction.UNDO_RENT,
                            'newUser.storeID': thisStoreID
                        }
                    ]
                }, {}, {
                    sort: {
                        tradeTime: 1
                    }
                }, (err, tradeList) => {
                    if (err) return reject(err);
                    cleanUndoTrade(ContainerAction.RENT, tradeList);
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
router.get('/history', checkRoleIsStore(), validateRequest, function (req, res, next) { //CLEAN_UNDO
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
    const type = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
    Trade.find({
        'tradeTime': {
            '$gte': dateCheckpoint(1 - historyDays),
            '$lt': dateCheckpoint(1)
        },
        '$or': [{
                'tradeType.action': ContainerAction.RENT,
                'oriUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.UNDO_RENT,
                'newUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.RETURN,
                'newUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.UNDO_RETURN,
                'oriUser.storeID': thisStoreID
            }
        ]
    }, function (err, tradeList) {
        if (err) return next(err);
        cleanUndoTrade([ContainerAction.RENT, ContainerAction.RETURN], tradeList);
        const rentTrades = tradeList.filter(aTrade => aTrade.tradeType.action === ContainerAction.RENT);
        const returnTrades = tradeList.filter(aTrade => aTrade.tradeType.action === ContainerAction.RETURN);
        parseHistory(rentTrades, ContainerAction.RENT, type, function (parsedRent) {
            let resJson = {
                rentHistory: {
                    amount: parsedRent.length,
                    dataList: parsedRent
                }
            };
            parseHistory(returnTrades, ContainerAction.RETURN, type, function (parsedReturn) {
                resJson.returnHistory = {
                    amount: parsedReturn.length,
                    dataList: parsedReturn
                };
                res.json(resJson);
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
router.get('/history/byContainerType', checkRoleIsStore(), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
    const type = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
    req.clearTimeout();
    var tradeQuery = {
        '$or': [{
                'tradeType.action': ContainerAction.SIGN,
                'newUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.RENT,
                'oriUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.UNDO_RENT,
                'newUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.RETURN,
                'newUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.RETURN,
                'oriUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.UNDO_RETURN,
                'oriUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.RELOAD,
            },
            {
                'tradeType.action': ContainerAction.UNDO_RELOAD
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

        cleanUndoTrade([ContainerAction.RENT, ContainerAction.RETURN, ContainerAction.RELOAD], tradeList);

        var storeLostTradesDict = {};
        var personalLostTradesDict = {};
        var usedTrades = [];
        var rentTrades = [];
        var returnTrades = [];
        var cleanReloadTrades = [];
        tradeList.forEach(aTrade => {
            let containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
            if (aTrade.tradeType.action === ContainerAction.SIGN) {
                storeLostTradesDict[containerKey] = aTrade;
            } else if (aTrade.tradeType.action === ContainerAction.RENT) {
                rentTrades.push(aTrade);
                personalLostTradesDict[containerKey] = aTrade;
                if (storeLostTradesDict[containerKey]) {
                    usedTrades.push(aTrade);
                    delete storeLostTradesDict[containerKey];
                }
            } else if (aTrade.tradeType.action === ContainerAction.RETURN) {
                returnTrades.push(aTrade);
                if (aTrade.oriUser.storeID === thisStoreID && storeLostTradesDict[containerKey]) {
                    usedTrades.push(aTrade);
                    delete storeLostTradesDict[containerKey];
                }
                if (aTrade.newUser.storeID === thisStoreID) {
                    storeLostTradesDict[containerKey] = aTrade;
                }
                if (personalLostTradesDict[containerKey]) {
                    delete personalLostTradesDict[containerKey];
                }
            } else if (aTrade.tradeType.action === ContainerAction.RELOAD) {
                if (aTrade.tradeType.oriState === ContainerState.READY_TO_USE && aTrade.oriUser.storeID === thisStoreID) {
                    cleanReloadTrades.push(aTrade);
                    if (storeLostTradesDict[containerKey]) {
                        delete storeLostTradesDict[containerKey];
                    }
                } else if (aTrade.tradeType.oriState === ContainerState.RETURNED && storeLostTradesDict[containerKey]) {
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

function newTypeArrGeneratorFunction(ContainerType) {
    return function () {
        var tmpArr = [];
        for (var aType in ContainerType) {
            tmpArr.push({
                typeCode: ContainerType[aType].typeCode,
                name: ContainerType[aType].name,
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
 * @apiName Store history by container type
 * @apiGroup Stores
 *
 * @api {get} /stores/history/byContainerType/csv Get history by container type
 * @apiUse JWT
 * @apiPermission clerk
 * 
 * @apiSuccessExample {csv}Success-Response:
    HTTP/1.1 200 
 * 
 */
router.get('/history/byContainerType/csv', checkRoleIsStore(), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
    const ContainerType = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
    req.clearTimeout();
    var tradeQuery = {
        '$or': [{
                'tradeType.action': ContainerAction.SIGN,
                'newUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.RENT,
                'oriUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.UNDO_RENT,
                'newUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.RETURN,
                'newUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.RETURN,
                'oriUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.UNDO_RETURN,
                'oriUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.RELOAD,
            },
            {
                'tradeType.action': ContainerAction.UNDO_RELOAD
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

        cleanUndoTrade([ContainerAction.RENT, ContainerAction.RETURN, ContainerAction.RELOAD], tradeList);

        var storeLostTradesDict = {};
        var usedTrades = [];
        tradeList.forEach(aTrade => {
            let containerKey = aTrade.container.id + "-" + aTrade.container.cycleCtr;
            if (aTrade.tradeType.action === ContainerAction.SIGN) {
                storeLostTradesDict[containerKey] = aTrade;
            } else if (aTrade.tradeType.action === ContainerAction.RENT) {
                if (storeLostTradesDict[containerKey]) {
                    usedTrades.push(aTrade);
                    delete storeLostTradesDict[containerKey];
                }
            } else if (aTrade.tradeType.action === ContainerAction.RETURN) {
                if (aTrade.oriUser.storeID === thisStoreID && storeLostTradesDict[containerKey]) {
                    usedTrades.push(aTrade);
                    delete storeLostTradesDict[containerKey];
                }
                if (aTrade.newUser.storeID === thisStoreID) {
                    storeLostTradesDict[containerKey] = aTrade;
                }
            } else if (aTrade.tradeType.action === ContainerAction.RELOAD) {
                if (aTrade.tradeType.oriState === ContainerState.READY_TO_USE && aTrade.oriUser.storeID === thisStoreID) {
                    if (storeLostTradesDict[containerKey]) {
                        delete storeLostTradesDict[containerKey];
                    }
                } else if (aTrade.tradeType.oriState === ContainerState.RETURNED && storeLostTradesDict[containerKey]) {
                    delete storeLostTradesDict[containerKey];
                }
            }
        });

        const usedHistory = [];
        const order = ["_rowName"];
        usedHistory.push({
            _rowName: "容器種類"
        });
        for (var aType in ContainerType) {
            usedHistory[0][ContainerType[aType].typeCode] = ContainerType[aType].name;
            order.push(ContainerType[aType].typeCode);
        }

        const newTypeArrGenerator = newTypeArrGeneratorFunction_forCSV(ContainerType);
        usageByDateByTypeGenerator_forCSV(newTypeArrGenerator, usedTrades, usedHistory);
        usedHistory.push({
            _rowName: "加總"
        });
        const last = usedHistory.length - 1;
        const emptyColIndex = [];
        for (let i = 0; i < Object.keys(ContainerType).length; i++) {
            let colSum = 0;
            for (let j = 1; j < usedHistory.length - 1; j++) {
                colSum += usedHistory[j][i];
            }
            if (colSum === 0) {
                emptyColIndex.push(i);
                for (let j = 0; j < usedHistory.length - 1; j++) {
                    delete usedHistory[j][i];
                }
            } else {
                usedHistory[last][i] = colSum;
            }
        }
        for (let i = emptyColIndex.length - 1; i >= 0; i--) {
            order.splice(emptyColIndex[i] + 1, 1);
        }
        const formattedCSV = usedHistory.map(aRow => objectToArrayByOrder(aRow, order).join(",")).join("\n");

        const dateString = new Date().toLocaleDateString("zh-TW", {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Taipei'
        }).replace("/", "-");
        res.attachment(`Store_${thisStoreID}_${dateString}.csv`);
        res.send("\uFEFF" + formattedCSV);
    });
});

function objectToArrayByOrder(object, order) {
    const result = [];
    for (let i in order) {
        result.push(object[order[i]]);
    }
    return result;
}

function newTypeArrGeneratorFunction_forCSV(ContainerType) {
    return function (_rowName) {
        var tmp = {
            _rowName
        };
        for (var aType in ContainerType) {
            tmp[ContainerType[aType].typeCode] = 0;
        }
        return tmp;
    };
}

function usageByDateByTypeGenerator_forCSV(newTypeArrGenerator, arrToParse, resultArr) {
    if (arrToParse.length > 0) {
        var tmpTypeCode;
        var checkpoint = getDateCheckpoint(arrToParse[0].tradeTime);
        resultArr.push(newTypeArrGenerator(fullDateString(checkpoint)));
        for (var i = 0; i < arrToParse.length; i++) {
            let theTrade = arrToParse[i];
            if (theTrade.tradeTime - checkpoint > 1000 * 60 * 60 * 24) {
                checkpoint = getDateCheckpoint(theTrade.tradeTime);
                resultArr.push(newTypeArrGenerator(fullDateString(checkpoint)));
                i--;
            } else {
                if (theTrade.container) {
                    tmpTypeCode = theTrade.container.typeCode;
                    resultArr[resultArr.length - 1][tmpTypeCode]++;
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
router.get('/history/byCustomer', checkRoleIsStore(), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
    let tradeQuery = {
        '$or': [{
                'tradeType.action': ContainerAction.RENT,
                'oriUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.UNDO_RENT,
                'newUser.storeID': thisStoreID
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
        "sort": {
            "tradeTime": 1
        }
    }, (err, rentTradeList) => {
        if (err) return next(err);
        cleanUndoTrade(ContainerAction.RENT, rentTradeList);

        let customerByDateDict = {};
        let customerList = [];
        rentTradeList.forEach(aTrade => {
            let customerPhone = aTrade.newUser.phone;
            let tradeDate = fullDateString(aTrade.tradeTime);
            if (customerList.indexOf(customerPhone) === -1) customerList.push(customerPhone);
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
            totalDistinctCustomer: customerList.length,
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
router.get('/performance', checkRoleIsStore(), validateRequest, function (req, res, next) {
    let orderBy = req.query.by;
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
    Trade.find({
        '$or': [{
                'tradeType.action': ContainerAction.RENT,
                'oriUser.storeID': thisStoreID
            },
            {
                'tradeType.action': ContainerAction.UNDO_RENT,
                'newUser.storeID': thisStoreID
            }
        ]
    }, function (err, rentTrades) {
        if (err) return next(err);
        cleanUndoTrade(ContainerAction.RENT, rentTrades);
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
router.get('/favorite', checkRoleIsStore(), validateRequest, function (req, res, next) {
    const dbRole = req._thisRole;
    let thisStoreID;
    try {
        thisStoreID = dbRole.getElement(RoleElement.STORE_ID, false);
    } catch (error) {
        return next(error);
    }
    const thisRedisKey = redisKey(thisStoreID);
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
                'tradeType.action': ContainerAction.RENT,
                'oriUser.storeID': thisStoreID
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

function parseHistory(trade, tradeType, type, callback) {
    var aHistory;
    var lastHistory;
    var lastPhone;
    var phoneFormatted;
    if (trade.length === 0) return callback([]);
    else if (trade.length === 1) {
        aHistory = trade[0];
        if (tradeType === ContainerAction.RENT)
            lastPhone = aHistory.newUser.phone;
        else if (tradeType === ContainerAction.RETURN)
            lastPhone = aHistory.oriUser.phone;
    } else {
        trade.sort(function (a, b) {
            return b.tradeTime - a.tradeTime;
        });
    }
    var byOrderArr = [];
    var tmpContainerList = [];
    tmpContainerList.push('#' + intReLength(trade[0].container.id, 3) + " | " + type[trade[0].container.typeCode].name);
    for (var i = 1; i < trade.length; i++) {
        aHistory = trade[i];
        lastHistory = trade[i - 1];
        if (tradeType === ContainerAction.RENT) {
            lastPhone = lastHistory.newUser.phone;
        } else if (tradeType === ContainerAction.RETURN) {
            lastPhone = lastHistory.oriUser.phone;
        }
        if (Math.abs(lastHistory.tradeTime - aHistory.tradeTime) > 100) {
            phoneFormatted = (tradeType === ContainerAction.RETURN) ? '' : lastPhone;
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
    phoneFormatted = (tradeType === ContainerAction.RETURN) ? '' : (lastPhone.slice(0, 4) + "-***-" + lastPhone.slice(7, 10));
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

function getFavorite(trade, callback) {
    if (trade.length === 0) return callback([]);
    trade.sort(function (a, b) {
        return b.tradeTime - a.tradeTime;
    });
    var byOrderArr = [];
    var aHistory;
    var lastHistory;
    var thisPhone = trade[0].newUser.phone;
    var lastPhone;
    for (var i = 1; i < trade.length; i++) {
        aHistory = trade[i];
        lastHistory = trade[i - 1];
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