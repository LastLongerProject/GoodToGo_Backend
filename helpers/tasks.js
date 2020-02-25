const debug = require('./debugger')('tasks');
const DataCacheFactory = require("../models/dataCacheFactory");

const User = require('../models/DB/userDB');
const Trade = require('../models/DB/tradeDB');
const Store = require('../models/DB/storeDB');
const Coupon = require('../models/DB/couponDB');
const Station = require('../models/DB/stationDB');
const PlaceID = require('../models/DB/placeIdDB');
const PointLog = require("../models/DB/pointLogDB");
const Container = require('../models/DB/containerDB');
const UserOrder = require('../models/DB/userOrderDB');
const CouponType = require('../models/DB/couponTypeDB');
const ContainerType = require('../models/DB/containerTypeDB');

const RoleType = require('../models/enums/userEnum').RoleType;
const ContainerAction = require('../models/enums/containerEnum').Action;
const ORI_ROLE_TYPE = [RoleType.CLERK, RoleType.ADMIN, RoleType.BOT, RoleType.CUSTOMER];

const reloadSuspendedNotifications = require("../helpers/notifications/push").reloadSuspendedNotifications;

const tradeCallback = require("../controllers/tradeCallback");
const userTrade = require("../controllers/userTrade");

const sheet = require('./gcp/sheet');
const drive = require('./gcp/drive');

module.exports = {
    storeListCaching: function (cb) {
        storeListGenerator(err => {
            if (cb) return cb(err);
            if (err) return debug.error(err);
            debug.log('storeList init');
        });
    },
    containerListCaching: function (cb) {
        containerListGenerator(err => {
            if (cb) return cb(err);
            if (err) return debug.error(err);
            debug.log('containerList init');
        });
    },
    couponListCaching: function (cb) {
        couponListGenerator(err => {
            if (cb) return cb(err);
            if (err) return debug.error(err);
            debug.log('couponTypeList init');
        });
    },
    checkCouponIsExpired: function (cb) {
        const CouponTypeDict = DataCacheFactory.get(DataCacheFactory.keys.COUPON_TYPE);
        Coupon.find((err, couponList) => {
            if (err) return cb(err);
            const now = Date.now();
            couponList.forEach(aCoupon => {
                if (!CouponTypeDict[aCoupon.couponType]) return;
                if (!aCoupon.expired && CouponTypeDict[aCoupon.couponType].expirationDate <= now) {
                    aCoupon.expired = true;
                    aCoupon.save(err => {
                        if (err) return debug.error(err);
                    });
                } else if (aCoupon.expired && CouponTypeDict[aCoupon.couponType].expirationDate > now) {
                    aCoupon.expired = false;
                    aCoupon.save(err => {
                        if (err) return debug.error(err);
                    });
                }
            });
            cb(null, 'Expired Coupon is Check');
        });
    },
    refreshStore: function (cb) {
        sheet.getStore((err, data) => {
            if (err) return cb(err);
            storeListGenerator(err => {
                if (err) return cb(err);
                debug.log('storeList refresh');
                cb(null, data);
            });
        });
    },
    refreshStation: function (cb) {
        sheet.getStation((err, data) => {
            if (err) return cb(err);
            storeListGenerator(err => {
                if (err) return cb(err);
                debug.log('stationList refresh');
                cb(null, data);
            });
        });
    },
    refreshContainer: function (dbUser, cb) {
        sheet.getContainer(dbUser, err => {
            if (err) return cb(err);
            containerListGenerator(err => {
                if (err) return cb(err);
                debug.log('containerList refresh');
                cb(null);
            });
        });
    },
    refreshCoupon: function (cb) {
        sheet.getCoupon((err, data) => {
            if (err) return cb(err);
            couponListGenerator(err => {
                if (err) return cb(err);
                debug.log('couponTypeList refresh');
                cb(null, data);
            });
        });
    },
    refreshStoreImg: function (forceRenew, cb) {
        drive.getStore(forceRenew, (succeed, storeIdList) => {
            if (succeed) {
                Promise
                    .all(storeIdList.map(aStoreImgFileName => new Promise((resolve, reject) => {
                        const aStoreID = parseInt(aStoreImgFileName.match(/(\d*)\.jpg/)[1]);
                        if (isNaN(aStoreID)) {
                            debug.error(`aStoreImgFileName Parse To aStoreID ERR. aStoreImgFileName: ${aStoreImgFileName}, aStoreID: ${aStoreID}`);
                            resolve();
                        }
                        Store.findOne({
                            'id': aStoreID
                        }, (err, aStore) => {
                            if (err) return debug.error(err);
                            if (!aStore) return resolve();
                            aStore.img_info.img_version++;
                            aStore.save((err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        });
                    })))
                    .then(() => {
                        storeListGenerator(err => {
                            if (err) debug.error(err);
                            cb(succeed, {
                                type: 'refreshStoreImg',
                                message: 'refresh succeed',
                                data: storeIdList
                            });
                        });
                    })
                    .catch(err => {
                        debug.error(storeIdList);
                        return cb(false, err);
                    });
            } else {
                debug.error(storeIdList);
                cb(succeed, {
                    type: 'refreshStoreImg',
                    message: 'refresh fail',
                    data: storeIdList
                });
            }
        });
    },
    refreshContainerIcon: function (forceRenew, cb) {
        drive.getContainer(forceRenew, (succeed, data) => {
            if (succeed) {
                var typeCodeList = [];
                for (var i = 0; i < data.length; i++) {
                    var tmpTypeCode = data[i].slice(0, 2);
                    if (typeCodeList.indexOf(tmpTypeCode) < 0)
                        typeCodeList.push(tmpTypeCode);
                }
                Promise
                    .all(typeCodeList.map(aTypeCode => new Promise((resolve, reject) => {
                        ContainerType.findOne({
                            'typeCode': aTypeCode
                        }, (err, aType) => {
                            if (err) return debug.error(err);
                            if (!aType) return resolve();
                            aType.version++;
                            aType.save((err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        });
                    })))
                    .then(() => {
                        cb(succeed, {
                            type: 'refreshContainerIcon',
                            message: 'refresh succeed',
                            data: data
                        });
                    })
                    .catch((err) => {
                        if (err) {
                            debug.error(data);
                            return cb(false, err);
                        }
                    });
            } else {
                debug.error(data);
                cb(succeed, {
                    type: 'refreshContainerIcon',
                    message: 'refresh fail',
                    data: data
                });
            }
        });
    },
    refreshCouponImage: function (forceRenew, cb) {
        drive.getCoupon(forceRenew, (succeed, data) => {
            if (succeed) {
                Promise
                    .all(data.map(aCouponImgFileName => new Promise((resolve, reject) => {
                        CouponType.updateMany({
                            'img_info.img_src': aCouponImgFileName
                        }, {
                            "$inc": {
                                "img_info.img_version": 1
                            }
                        }, (err, reply) => {
                            if (err) return debug.error(err);
                            resolve();
                        });
                    })))
                    .then(() => {
                        cb(succeed, {
                            type: 'refreshCouponImage',
                            message: 'refresh succeed',
                            data: data
                        });
                    })
                    .catch((err) => {
                        if (err) {
                            debug.error(data);
                            return cb(false, err);
                        }
                    });
            } else {
                debug.error(data);
                cb(succeed, {
                    type: 'refreshCouponImage',
                    message: 'refresh fail',
                    data: data
                });
            }
        });
    },
    refreshAllUserUsingStatus: function (sendNotice, cb) {
        userTrade.refreshUserUsingStatus(null, {
            sendNotice,
            banOrUnbanUser: true
        }, (err, data) => {
            if (cb) return cb(err, data);
            if (err) return debug.error(err);
            debug.log('Users\' Status refresh');
        });
    },
    solveUnusualUserOrder: function (cb) {
        UserOrder.find({
            "archived": false,
            "containerID": {
                "$ne": null
            }
        }, (err, userOrderList) => {
            if (err) return cb(err);
            Promise
                .all(userOrderList.map(aUserOrder => new Promise((resolve, reject) => {
                    User.findById(aUserOrder.user, (err, oriUser) => {
                        if (err) return reject(err);
                        if (!oriUser) return resolve({
                            success: false,
                            orderID: aUserOrder.orderID,
                            msg: `[FixUserOrder] Can't find oriUser, OrderID: ${aUserOrder.orderID}`
                        });

                        Trade.findOne({
                            "container.id": aUserOrder.containerID,
                            "oriUser.phone": oriUser.user.phone,
                            "tradeType.action": ContainerAction.RETURN,
                            "tradeTime": {
                                '$gt': aUserOrder.orderTime
                            }
                        }, {}, {
                            sort: {
                                tradeTime: -1
                            }
                        }, function (err, theTrade) {
                            if (err) return reject(err);
                            if (!theTrade) return resolve({
                                success: true,
                                orderID: null,
                                msg: `[FixUserOrder] Normal User Order, OrderID: ${aUserOrder.orderID}`
                            });

                            User.findOne({
                                "user.phone": theTrade.newUser.phone
                            }, (err, newUser) => {
                                if (err) return reject(err);
                                if (!newUser) return resolve({
                                    success: false,
                                    orderID: aUserOrder.orderID,
                                    msg: `[FixUserOrder] Can't find newUser, OrderID: ${aUserOrder.orderID}`
                                });

                                Container.findOne({
                                    "ID": theTrade.container.id
                                }, (err, theContainer) => {
                                    if (err) return reject(err);
                                    if (!theContainer) return resolve({
                                        success: false,
                                        orderID: aUserOrder.orderID,
                                        msg: `[FixUserOrder] Can't find theContainer, OrderID: ${aUserOrder.orderID}`
                                    });

                                    const tradeDetail = {
                                        oriUser,
                                        newUser,
                                        container: theContainer
                                    };
                                    tradeCallback.return([tradeDetail], {
                                        storeID: theTrade.newUser.storeID
                                    });
                                    resolve({
                                        success: true,
                                        orderID: aUserOrder.orderID,
                                        msg: `[FixUserOrder] Try to fix UserOrder, OrderID: ${aUserOrder.orderID}`
                                    });
                                });
                            });
                        });
                    });
                })))
                .then(results => {
                    const successUserOrder = [];
                    const failUserOrder = [];
                    const successMsg = [];
                    const failMsg = [];
                    results.forEach(aResult => {
                        if (aResult.success && aResult.orderID !== null) {
                            successUserOrder.push(aResult.orderID);
                            successMsg.push(aResult.msg);
                        } else if (!aResult.success) {
                            failUserOrder.push(aResult.orderID);
                            failMsg.push(aResult.msg);
                        }
                    });
                    cb(null, {
                        successUserOrder,
                        successMsg,
                        failUserOrder,
                        failMsg
                    });
                })
                .catch(cb);
        });
    },
    checkUserPoint: function (cb) {
        User.find((err, lineUsers) => {
            if (err) return cb(err);
            const userDict = {};
            lineUsers.forEach(aUser => {
                userDict[aUser._id] = {};
                userDict[aUser._id].dbUser = aUser;
                userDict[aUser._id].computedPoint = 0;
            });
            PointLog.find((err, logList) => {
                if (err) return cb(err);
                logList.forEach(aLog => {
                    if (userDict[aLog.user]) {
                        userDict[aLog.user].computedPoint += aLog.quantityChange;
                    } else {
                        debug.error(`[CheckUserPoint] Ghost PointLog: ${aLog}`);
                    }
                });
                for (let userID in userDict) {
                    if (userDict[userID].dbUser.point !== userDict[userID].computedPoint)
                        userTrade.fixPoint(userDict[userID].dbUser, userDict[userID].computedPoint);
                }
            });
        });
    },
    migrateUserRoleStructure: function (cb) {
        User.find({
            "user.phone": {
                $ne: undefined
            }
        }, (err, userList) => {
            if (err) return cb(err);
            Promise
                .all(userList.map(aUser => new Promise((resolve, reject) => {
                    const newRoleList = [];
                    for (let aRoleKey in aUser.roles) {
                        if (ORI_ROLE_TYPE.indexOf(aRoleKey) === -1 || !aUser.roles[aRoleKey]) continue;
                        let theRoleKey = aRoleKey;
                        let theRole = aUser.roles[theRoleKey];
                        switch (theRoleKey) {
                            case RoleType.CLERK:
                                newRoleList.push({
                                    roleType: RoleType.STORE,
                                    storeID: theRole.storeID,
                                    manager: theRole.manager
                                });
                                break;
                            case RoleType.ADMIN:
                                newRoleList.push({
                                    roleType: RoleType.ADMIN,
                                    asStoreID: aUser.roles.clerk ? aUser.roles.clerk.storeID : null,
                                    asStationID: 0,
                                    manager: theRole.manager
                                });
                                newRoleList.push({
                                    roleType: RoleType.CLEAN_STATION,
                                    stationID: 0,
                                    manager: theRole.manager
                                });
                                break;
                            case RoleType.BOT:
                                newRoleList.push({
                                    roleType: RoleType.ADMIN,
                                    scopeID: theRole.scopeID,
                                    rentFromStoreID: aUser.roles.clerk ? aUser.roles.clerk.storeID : null,
                                    returnToStoreID: aUser.roles.clerk ? aUser.roles.clerk.storeID : null,
                                    reloadToStationID: aUser.roles.admin ? aUser.roles.admin.stationID : null
                                });
                                break;
                            case RoleType.CUSTOMER:
                                Object.assign(theRole, {
                                    roleType: RoleType.CUSTOMER
                                });
                                newRoleList.push(theRole);
                                break;
                            default:
                                reject(`Unknown Origin Role Type:[${theRoleKey}] - [${JSON.stringify(theRole)}]`);
                        }
                    }
                    Promise
                        .all(newRoleList.map(aNewRole => new Promise((innerResolve, innerReject) => {
                            aUser.addRole(aNewRole.roleType, aNewRole, err => {
                                if (err) return innerReject(err);
                                innerResolve();
                            });
                        })))
                        .then(() => {
                            aUser.role = undefined;
                            aUser.save(err => {
                                if (err) return reject(err);
                                resolve();
                            });
                        })
                        .catch(reject);
                })))
                .then(() => {
                    cb(null, "Done User Role Migration");
                })
                .catch(cb);
        });
    },
    reloadSuspendedNotifications
}

function storeListGenerator(cb) {
    PlaceID.find({}, {}, {
        sort: {
            ID: 1
        }
    }, (err, places) => {
        if (err) return cb(err);
        Store.find({}, {}, {
            sort: {
                id: 1
            }
        }, (err, stores) => {
            if (err) return cb(err);
            Station.find({}, {}, {
                sort: {
                    ID: 1
                }
            }, (err, stations) => {
                const storeDict = {};
                const stationDict = {};
                places.forEach(aPlace => storeDict[aPlace.ID] = aPlace);
                stations.forEach(aStation => {
                    stationDict[aStation.ID] = aStation;
                    Object.assign(stationDict[aStation.ID], {
                        storeList: []
                    });
                });
                stores.forEach(aStore => {
                    if (storeDict[aStore.id])
                        Object.assign(storeDict[aStore.id], {
                            img_info: aStore.img_info,
                            photos_fromGoogle: aStore.photos_fromGoogle,
                            url_fromGoogle: aStore.url_fromGoogle,
                            address: aStore.address,
                            opening_hours: aStore.opening_hours,
                            location: aStore.location
                        });
                    const deliveryAreaList = aStore.delivery_area;
                    deliveryAreaList.forEach(aArea => {
                        if (stationDict[aArea])
                            stationDict[aArea].storeList.push(aStore.id);
                    });
                });
                DataCacheFactory.set(DataCacheFactory.keys.STORE, storeDict);
                DataCacheFactory.set(DataCacheFactory.keys.STATION, stationDict);
                cb();
            });
        });
    });
}

function containerListGenerator(cb) {
    ContainerType.find({}, {}, {
        sort: {
            typeCode: 1
        }
    }, function (err, containerTypeList) {
        if (err) return cb(err);
        var containerTypeDict = {};
        for (var aType in containerTypeList) {
            containerTypeDict[containerTypeList[aType].typeCode] = containerTypeList[aType];
        }
        Container.find({}, {}, {
            sort: {
                ID: 1
            }
        }, function (err, containerList) {
            var containerDict = {};
            var containerDictOnlyActive = {};
            if (err) return cb(err);
            for (var i = 0; i < containerList.length; i++) {
                containerDict[containerList[i].ID] = containerTypeList[containerList[i].typeCode].name;
                if (containerList[i].active) containerDictOnlyActive[containerList[i].ID] = containerTypeList[containerList[i].typeCode].name;
            }
            DataCacheFactory.set(DataCacheFactory.keys.CONTAINER_WITH_DEACTIVE, containerDict);
            DataCacheFactory.set(DataCacheFactory.keys.CONTAINER_ONLY_ACTIVE, containerDictOnlyActive);
            DataCacheFactory.set(DataCacheFactory.keys.CONTAINER_TYPE, containerTypeDict);
            cb();
        });
    });
}

function couponListGenerator(cb) {
    CouponType.find((err, couponTypeList) => {
        if (err) return cb(err);
        let couponTypeDict = {};
        couponTypeList.forEach((aCouponType) => {
            couponTypeDict[aCouponType._id] = aCouponType;
        });
        DataCacheFactory.set(DataCacheFactory.keys.COUPON_TYPE, couponTypeDict);
        cb();
    });
}