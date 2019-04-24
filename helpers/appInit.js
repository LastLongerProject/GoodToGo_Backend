const debug = require('./debugger')('appInit');
const DataCacheFactory = require("../models/dataCacheFactory");

const User = require('../models/DB/userDB');
const Store = require('../models/DB/storeDB');
const Coupon = require('../models/DB/couponDB');
const PlaceID = require('../models/DB/placeIdDB');
const Activity = require('../models/DB/activityDB');
const Container = require('../models/DB/containerDB');
const UserOrder = require('../models/DB/userOrderDB');
const CouponType = require('../models/DB/couponTypeDB');
const ContainerType = require('../models/DB/containerTypeDB');

const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../helpers/notifications/enums/events');

const getDateCheckpoint = require('@lastlongerproject/toolkit').getDateCheckpoint;

const sheet = require('./gcp/sheet');
const drive = require('./gcp/drive');

const DueDays = {
    free_user: 2,
    purchased_user: 8
};

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
        const CouponTypeDict = DataCacheFactory.get("couponType");
        Coupon.find({
            "expired": false
        }, (err, couponList) => {
            if (err) return debug.error(err);
            const now = Date.now();
            couponList.forEach(aCoupon => {
                if (CouponTypeDict[aCoupon.couponType].expirationDate < now) {
                    aCoupon.expired = true;
                    aCoupon.save(err => {
                        if (err) return debug.error(err);
                    });
                }
            });
            if (cb) return cb();
            debug.log('Expired Coupon is Check');
        });
    },
    checkUsersShouldBeBanned: function (startupCheck, specificUser, cb) {
        const userCondition = {
            "agreeTerms": true
        };
        if (specificUser)
            Object.assign(userCondition, {
                "user.phone": specificUser.user.phone
            });
        User.find(userCondition, (err, userList) => {
            if (err) return debug.error(err);
            const userDict = {};
            const userObjectIDList = userList.map(aUser => {
                const userID = aUser._id;
                userDict[userID] = {
                    dbUser: aUser,
                    almostOverdue: [],
                    overdue: []
                };
                return userID;
            });
            UserOrder.find({
                "user": {
                    "$in": userObjectIDList
                },
                "archived": false
            }, (err, userOrderList) => {
                if (err) return debug.error(err);

                const now = Date.now();
                userOrderList.forEach(aUserorder => {
                    const userID = aUserorder.user;
                    const purchaseStatus = userDict[userID].dbUser.getPurchaseStatus();
                    const daysOverDue = computeDaysOfUsing(aUserorder.orderTime, now) - DueDays[purchaseStatus];
                    if (daysOverDue > 0) {
                        userDict[userID].overdue.push(aUserorder);
                    } else if (daysOverDue === 0) {
                        userDict[userID].almostOverdue.push(aUserorder);
                    }
                });

                for (let userID in userDict) {
                    const dbUser = userDict[userID].dbUser;
                    if (userDict[userID].overdue.length > 0)
                        banUser(dbUser);
                    else if (userDict[userID].almostOverdue.length > 0 && !startupCheck)
                        noticeUserWhoIsGoingToBeBanned(dbUser);
                    else if (userDict[userID].overdue.length === 0)
                        unbanUser(dbUser);
                }
                if (cb) return cb();
                debug.log('Banned User is Check');
            });
        });
    },
    refreshStore: function (cb) {
        sheet.getStore(data => {
            storeListGenerator(err => {
                if (err) return cb(err);
                debug.log('storeList refresh');
                cb();
            });
        });
    },
    refreshContainer: function (dbUser, cb) {
        sheet.getContainer(dbUser, () => {
            containerListGenerator(err => {
                if (err) return cb(err);
                debug.log('containerList refresh');
                cb();
            });
        });
    },
    refreshActivity: function (cb) {
        sheet.getActivity(data => {
            activityListGenerator(err => {
                if (err) return cb(err);
                debug.log('activityList refresh');
                cb();
            });
        });
    },
    refreshCoupon: function (cb) {
        sheet.getCoupon(data => {
            couponListGenerator(err => {
                if (err) return cb(err);
                debug.log('couponTypeList refresh');
                cb();
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
        DataCacheFactory.set('activity', activityDict);
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
        DataCacheFactory.set('store', storeDict);
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
            DataCacheFactory.set('containerWithDeactive', containerDict);
            DataCacheFactory.set('container', containerDictOnlyActive);
            DataCacheFactory.set('containerType', containerTypeDict);
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
        DataCacheFactory.set('couponType', couponTypeDict);
        cb();
    });
}

function banUser(dbUser) {
    if (!dbUser.hasBanned) {
        dbUser.hasBanned = true;
        dbUser.bannedTimes++;
        dbUser.save(err => {
            if (err) return debug.error(err);
        });
        NotificationCenter.emit(NotificationEvent.USER_BANNED, dbUser, null);
    }
}

function noticeUserWhoIsGoingToBeBanned(dbUser) {
    if (!dbUser.hasBanned) {
        NotificationCenter.emit(NotificationEvent.USER_ALMOST_OVERDUE, dbUser, null);
    }
}

function unbanUser(dbUser) {
    if (dbUser.hasBanned && dbUser.bannedTimes <= 1) {
        dbUser.hasBanned = false;
        dbUser.save(err => {
            if (err) return debug.error(err);
        });
        NotificationCenter.emit(NotificationEvent.USER_UNBANNED, dbUser, null);
    }
}

function computeDaysOfUsing(dateToCompute, now) {
    return Math.ceil((now - getDateCheckpoint(dateToCompute)) / (1000 * 60 * 60 * 24));
}