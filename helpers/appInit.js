var Store = require('../models/DB/storeDB');
var PlaceID = require('../models/DB/placeIdDB');
var Container = require('../models/DB/containerDB');
var ContainerType = require('../models/DB/containerTypeDB');
var sheet = require('./gcp/sheet');
var drive = require('./gcp/drive');
var debug = require('debug')('goodtogo_backend:appInit');
debug.log = console.log.bind(console);
var debugError = require('debug')('goodtogo_backend:appINIT_ERR');

const DataCacheFactory = require("../models/DataCacheFactory");

module.exports = {
    store: function (cb) {
        storeListGenerator(err => {
            if (cb) return cb(err);
            if (err) return debugError(err);
            debug('storeList init');
        });
    },
    container: function (cb) {
        containerListGenerator(err => {
            if (cb) return cb(err);
            if (err) return debugError(err);
            debug('containerList init');
        });
    },
    refreshStore: function (cb) {
        sheet.getStore(data => {
            storeListGenerator(err => {
                if (err) return cb(err);
                debug('storeList refresh');
                cb();
            });
        });
    },
    refreshContainer: function (dbUser, cb) {
        sheet.getContainer(dbUser, () => {
            containerListGenerator(err => {
                if (err) return cb(err);
                debug('containerList refresh');
                cb();
            });
        });
    },
    refreshStoreImg: function (forceRenew, cb) {
        drive.getStore(forceRenew, (succeed, data) => {
            if (succeed) {
                var funcList = [];
                for (var i = 0; i < data.length; i++) {
                    funcList.push(new Promise((resolve, reject) => {
                        Store.findOne({
                            'id': data[i].slice(0, 2)
                        }, (err, aStore) => {
                            if (err) return debugError(err);
                            if (!aStore) return resolve();
                            aStore.img_info.img_version++;
                            aStore.save((err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        });
                    }));
                }
                Promise
                    .all(funcList)
                    .then((returnData) => {
                        cb(succeed, {
                            type: 'refreshStoreImg',
                            message: 'refresh succeed',
                            data: data
                        });
                    })
                    .catch((err) => {
                        if (err) {
                            debugError(data);
                            return cb(false, err);
                        }
                    });
            } else {
                debugError(data);
                cb(succeed, {
                    type: 'refreshStoreImg',
                    message: 'refresh fail',
                    data: data
                });
            }
        });
    },
    refreshContainerIcon: function (forceRenew, cb) {
        drive.getContainer(forceRenew, (succeed, data) => {
            if (succeed) {
                var funcList = [];
                var typeCodeList = [];
                for (var i = 0; i < data.length; i++) {
                    var tmpTypeCode = data[i].slice(0, 2);
                    if (typeCodeList.indexOf(tmpTypeCode) < 0)
                        typeCodeList.push(tmpTypeCode);
                }
                for (var i = 0; i < typeCodeList.length; i++) {
                    funcList.push(new Promise((resolve, reject) => {
                        ContainerType.findOne({
                            'typeCode': typeCodeList[i]
                        }, (err, aType) => {
                            if (err) return debugError(err);
                            if (!aType) return resolve();
                            aType.version++;
                            aType.save((err) => {
                                if (err) return reject(err);
                                resolve();
                            });
                        });
                    }));
                }
                Promise
                    .all(funcList)
                    .then((returnData) => {
                        cb(succeed, {
                            type: 'refreshContainerIcon',
                            message: 'refresh succeed',
                            data: data
                        });
                    })
                    .catch((err) => {
                        if (err) {
                            debugError(data);
                            return cb(false, err);
                        }
                    });
            } else {
                debugError(data);
                cb(succeed, {
                    type: 'refreshContainerIcon',
                    message: 'refresh fail',
                    data: data
                });
            }
        });
    }
};

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