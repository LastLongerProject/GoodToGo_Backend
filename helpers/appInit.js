const debug = require('./debugger')('appInit');
const DataCacheFactory = require("../models/dataCacheFactory");
const DueDays = require('../models/enums/userEnum').DueDays;

const User = require('../models/DB/userDB');
const Store = require('../models/DB/storeDB');
const Coupon = require('../models/DB/couponDB');
const PlaceID = require('../models/DB/placeIdDB');
const Activity = require('../models/DB/activityDB');
const Container = require('../models/DB/containerDB');
const UserOrder = require('../models/DB/userOrderDB');
const CouponType = require('../models/DB/couponTypeDB');
const ContainerType = require('../models/DB/containerTypeDB');

const computeDaysOfUsing = require("../helpers/tools").computeDaysOfUsing;
const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../helpers/notifications/enums/events');

const userTrade = require('../controllers/userTrade');

const sheet = require('./gcp/sheet');
const drive = require('./gcp/drive');

module.exports = {
    store: function (cb) {
        storeListGenerator(err => {
            if (cb) return cb(err);
            if (err) return debug.error(err);
            debug.log('storeList init');
        });
    },
    container: function (cb) {
        containerListGenerator(err => {
            if (cb) return cb(err);
            if (err) return debug.error(err);
            debug.log('containerList init');
        });
    },
    coupon: function (cb) {
        couponListGenerator(err => {
            if (cb) return cb(err);
            if (err) return debug.error(err);
            debug.log('couponTypeList init');
        });
    },
    checkCouponIsExpired: function (cb) {
        const CouponTypeDict = DataCacheFactory.get(DataCacheFactory.keys.COUPON_TYPE);
        Coupon.find((err, couponList) => {
            if (err) return debug.error(err);
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
            if (cb) return cb(null);
            debug.log('Expired Coupon is Check');
        });
    },
    refreshStore: function (cb) {
        sheet.getStore(data => {
            storeListGenerator(err => {
                if (err) return cb(err);
                debug.log('storeList refresh');
                cb(null, data);
            });
        });
    },
    refreshContainer: function (dbUser, cb) {
        sheet.getContainer(dbUser, data => {
            containerListGenerator(err => {
                if (err) return cb(err);
                debug.log('containerList refresh');
                cb(null, data);
            });
        });
    },
    refreshActivity: function (cb) {
        sheet.getActivity(data => {
            activityListGenerator(err => {
                if (err) return cb(err);
                debug.log('activityList refresh');
                cb(null, data);
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
                    .then((returnData) => {
                        cb(succeed, {
                            type: 'refreshStoreImg',
                            message: 'refresh succeed',
                            data: storeIdList
                        });
                    })
                    .catch((err) => {
                        if (err) {
                            debug.error(storeIdList);
                            return cb(false, err);
                        }
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
    refreshUserUsingStatus: function (sendNotice, specificUser, cb) {
        if (!(specificUser instanceof User)) specificUser = null;
        findUsersToCheckStatus(specificUser, reply => {
            const userDict = reply.userDict;
            const userObjectIDList = reply.userObjectIDList;
            UserOrder.find({
                "user": {
                    "$in": userObjectIDList
                },
                "archived": false
            }, (err, userOrderList) => {
                if (err) return cb(err);

                const now = Date.now();
                userOrderList.forEach(aUserOrder => {
                    const userID = aUserOrder.user;
                    const purchaseStatus = userDict[userID].dbUser.getPurchaseStatus();
                    const daysOverDue = computeDaysOfUsing(aUserOrder.orderTime, now) - DueDays[purchaseStatus];
                    if (aUserOrder.containerID === null) {
                        if (daysOverDue > 0) {
                            userDict[userID].idNotRegistered.overdue.push(aUserOrder);
                        } else if (daysOverDue === 0) {
                            userDict[userID].idNotRegistered.almostOverdue.push(aUserOrder);
                        } else {
                            userDict[userID].idNotRegistered.others.push(aUserOrder);
                        }
                    } else {
                        if (daysOverDue > 0) {
                            userDict[userID].idRegistered.overdue.push(aUserOrder);
                        } else if (daysOverDue === 0) {
                            userDict[userID].idRegistered.almostOverdue.push(aUserOrder);
                        } else {
                            userDict[userID].idRegistered.others.push(aUserOrder);
                        }
                    }
                });

                for (let userID in userDict) {
                    const classifiedOrder = userDict[userID];
                    const dbUser = classifiedOrder.dbUser;
                    const overdueAmount = classifiedOrder.idRegistered.overdue.length + classifiedOrder.idNotRegistered.overdue.length;
                    const hasOverdueContainer = overdueAmount > 0;
                    const hasUnregisteredOrder = classifiedOrder.idNotRegistered.overdue.length > 0 ||
                        classifiedOrder.idNotRegistered.almostOverdue.length > 0 ||
                        classifiedOrder.idNotRegistered.others.length > 0;
                    const almostOverdueAmount = classifiedOrder.idRegistered.almostOverdue.length + classifiedOrder.idNotRegistered.almostOverdue.length;
                    const hasAlmostOverdueContainer = almostOverdueAmount > 0;
                    if (hasOverdueContainer) {
                        userTrade.banUser(dbUser, classifiedOrder.idRegistered.overdue.concat(classifiedOrder.idNotRegistered.overdue));
                    } else {
                        if (hasAlmostOverdueContainer && sendNotice) {
                            userTrade.noticeUserWhoIsGoingToBeBanned(dbUser, almostOverdueAmount);
                        }
                        if (dbUser.bannedTimes <= 1) {
                            userTrade.unbanUser(dbUser, false);
                        }
                    }
                    classifiedOrder.overdueAmount = overdueAmount;
                    classifiedOrder.almostOverdueAmount = almostOverdueAmount;
                    NotificationCenter.emit(NotificationEvent.USER_STATUS_UPDATE, dbUser, {
                        userIsBanned: dbUser.hasBanned,
                        hasOverdueContainer,
                        hasUnregisteredOrder,
                        hasAlmostOverdueContainer
                    });
                }
                if (cb) return cb(null, userDict);
                debug.log('User Status is Refresh');
            });
        });
    }
}

function activityListGenerator(cb) {
    Activity.find({}, {}, {
        sort: {
            ID: 1
        }
    }, (err, activities) => {
        if (err) return cb(err);
        var activityDict = {};
        activities.forEach((aActivity) => {
            activityDict[aActivity.ID] = aActivity;
        });
        DataCacheFactory.set(DataCacheFactory.keys.ACTIVITY, activityDict);
        cb();
    });
}

function storeListGenerator(cb) {
    PlaceID.find({}, {}, {
        sort: {
            ID: 1
        }
    }, (err, stores) => {
        if (err) return cb(err);
        var storeDict = {};
        stores.forEach((aStore) => {
            storeDict[aStore.ID] = aStore;
        });
        DataCacheFactory.set(DataCacheFactory.keys.STORE, storeDict);
        cb();
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

function findUsersToCheckStatus(specificUser, cb) {
    if (specificUser) {
        const userID = specificUser._id;
        const userDict = {
            [userID]: {
                dbUser: specificUser,
                idRegistered: {
                    almostOverdue: [],
                    overdue: [],
                    others: []
                },
                idNotRegistered: {
                    almostOverdue: [],
                    overdue: [],
                    others: []
                }
            }
        };
        const userObjectIDList = [userID];
        return cb({
            userDict,
            userObjectIDList
        });
    } else {
        User.find({
            "agreeTerms": true
        }, (err, userList) => {
            if (err) return debug.error(err);
            const userDict = {};
            const userObjectIDList = userList.map(aUser => {
                const userID = aUser._id;
                userDict[userID] = {
                    dbUser: aUser,
                    idRegistered: {
                        almostOverdue: [],
                        overdue: [],
                        others: []
                    },
                    idNotRegistered: {
                        almostOverdue: [],
                        overdue: [],
                        others: []
                    }
                };
                return userID;
            });
            return cb({
                userDict,
                userObjectIDList
            });
        })
    }
}