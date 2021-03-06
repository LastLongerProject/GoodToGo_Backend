const {
    google
} = require('googleapis');
const sheets = google.sheets('v4');
const debug = require('../debugger')('google_sheet');

const intReLength = require('../toolkit').intReLength;
const dateCheckpoint = require('../toolkit').dateCheckpoint;
const getDateCheckpoint = require('../toolkit').getDateCheckpoint;

const Store = require('../../models/DB/storeDB');
const PlaceID = require('../../models/DB/placeIdDB');
const Station = require('../../models/DB/stationDB');
const Container = require('../../models/DB/containerDB');
const CouponType = require('../../models/DB/couponTypeDB');
const ContainerType = require('../../models/DB/containerTypeDB');

const googleAuth = require("./auth");
const downloadPhotos = require("./placePhotoDownloader").downloadImg;
const configs = require("../../config/config").google;
const placeApiKey = configs.apikeys.place;
const dictionary = configs.translater;

const googleMapsClient = require('@google/maps').createClient({
    key: placeApiKey
});

const isNum = /^\d+$/;
const ignorePlaceTypes = ["point_of_interest", "establishment"];
const defaultPeriods = [];
const allOpenPeriods = [];
for (let i = 0; i < 7; i++) {
    defaultPeriods.push({
        "close": {
            "day": i,
            "time": "21:00"
        },
        "open": {
            "day": i,
            "time": "12:00"
        }
    });
    allOpenPeriods.push({
        "close": {
            "day": i,
            "time": "00:00"
        },
        "open": {
            "day": i,
            "time": "24:00"
        }
    });
}

module.exports = {
    updateSummary: function (dataSets, sheetNames, cb) {
        googleAuth(auth => {
            sheets.spreadsheets.get({
                auth,
                spreadsheetId: configs.summary_sheet_ID
            }, function (err, spreadsheetsDetail) {
                if (err) return cb(err);
                let existsSheets = spreadsheetsDetail.data.sheets.map(aSheet => aSheet.properties.title);
                let sheetsToUpdate = sheetNames.filter(aSheetNames => existsSheets.indexOf(aSheetNames) === -1);

                let updateValue = (err, spreadsheetsRes) => {
                    if (err) return cb(err);
                    sheets.spreadsheets.values.batchUpdate({
                        auth,
                        spreadsheetId: configs.summary_sheet_ID,
                        resource: {
                            valueInputOption: "RAW",
                            data: dataSets
                        }
                    }, (err, valuesRes) => {
                        if (err) return cb(err);
                        cb(null);
                    });
                };

                if (sheetsToUpdate.length > 0) {
                    let requests = sheetsToUpdate.map(aSheetToUpdate => ({
                        "addSheet": {
                            "properties": {
                                "title": aSheetToUpdate
                            }
                        }
                    }));
                    sheets.spreadsheets.batchUpdate({
                        auth,
                        spreadsheetId: configs.summary_sheet_ID,
                        resource: {
                            requests
                        }
                    }, updateValue);
                } else {
                    updateValue(null, null);
                }
            });
        });
    },
    shopOverview: function (dataSets, cb) {
        googleAuth(auth => {
            const sheetNames = Object.keys(dataSets);
            const data = sheetNames.map(aDataKey => ({
                range: aDataKey,
                values: dataSets[aDataKey]
            }));
            sheets.spreadsheets.get({
                auth,
                spreadsheetId: configs.overview_sheet_ID,
            }, (err, existsSheets) => {
                if (err) return cb(err);
                const existsSheetNames = existsSheets.data.sheets.map(aSheet => aSheet.properties.title);
                const sheetsToAdd = sheetNames.filter(newSheet => existsSheetNames.every(existSheet => existSheet !== newSheet));
                const updateData = (err) => {
                    if (err) return cb(err);
                    sheets.spreadsheets.values.batchUpdate({
                        auth,
                        spreadsheetId: configs.overview_sheet_ID,
                        resource: {
                            valueInputOption: "RAW",
                            data
                        }
                    }, (err, valuesRes) => {
                        if (err) return cb(err);
                        cb(null);
                    });
                };
                if (sheetsToAdd.length > 0)
                    sheets.spreadsheets.batchUpdate({
                        auth,
                        spreadsheetId: configs.overview_sheet_ID,
                        resource: {
                            requests: sheetsToAdd.map(aSheetName => ({
                                addSheet: {
                                    properties: {
                                        title: aSheetName,
                                        index: 1
                                    }
                                }
                            })).reverse()
                        }
                    }, updateData);
                else
                    updateData(null);
            });
        });
    },
    getContainer: function (dbAdmin, cb) {
        googleAuth(function getSheet(auth) {
            sheets.spreadsheets.values.batchGet({
                auth: auth,
                spreadsheetId: configs.container_sheet_ID,
                ranges: ['container!A2:F', 'container_type!A2:C'],
            }, function (err, response) {
                if (err) {
                    debug.error('[Sheet API ERR (getContainer)] Error: ' + err);
                    return;
                }
                var sheetContainerList = response.data.valueRanges[0].values;
                var sheetContainerTypeList = response.data.valueRanges[1].values;
                var funcList = [];
                var checkpoint = Date.now();
                for (var i = 0; i < sheetContainerTypeList.length; i++) {
                    funcList.push(new Promise((resolve, reject) => {
                        var row = sheetContainerTypeList[i];
                        ContainerType.update({
                            'typeCode': row[0]
                        }, {
                            'name': row[1],
                        }, {
                            upsert: true,
                            setDefaultsOnInsert: true
                        }, (err, rawRes) => {
                            if (err) return reject(err);
                            resolve(rawRes);
                        });
                    }));
                }
                for (var i = 0; i < sheetContainerList.length; i++) {
                    if (!isNum.test(sheetContainerList[i][0])) continue;
                    if (!isNum.test(sheetContainerList[i][1])) continue;
                    funcList.push(new Promise((resolve, reject) => {
                        var row = sheetContainerList[i];
                        Container.update({
                            'ID': row[0]
                        }, {
                            'active': (row[3] === '1'),
                            'typeCode': row[1],
                            'checkedAt': Date.now(),
                            '$setOnInsert': {
                                'conbineTo': dbAdmin.user.phone
                            }
                        }, {
                            upsert: true,
                            setDefaultsOnInsert: true
                        }, (err, rawRes) => {
                            if (err) return reject(err);
                            resolve(rawRes);
                        });
                    }));
                }
                Promise
                    .all(funcList)
                    .then(() => {
                        Container.updateMany({
                            'checkedAt': {
                                '$lt': checkpoint
                            }
                        }, {
                            'active': false
                        }, cb);
                    })
                    .catch(cb);
            });
        });
    },
    getStore: function (cb) {
        googleAuth(function getSheet(auth) {
            sheets.spreadsheets.values.get({
                auth: auth,
                spreadsheetId: configs.store_sheet_ID,
                range: 'active!A2:M',
            }, function (err, response) {
                if (err) return debug.error('[Sheet API ERR (getStore)] Error: ' + err);
                const rowsFromSheet = response.data.values;
                const validRows = rowsFromSheet.filter(aRow => (isNum.test(aRow[0]) && aRow[1] !== "" && aRow[2] !== "" && aRow.length >= 13));
                Promise
                    .all(validRows.map(aRow => new Promise((resolve, reject) => {
                        PlaceID.findOneAndUpdate({
                            'ID': aRow[0]
                        }, {
                            'name': aRow[1],
                            'placeID': aRow[2],
                            'contract': {
                                'returnable': (aRow[3] === 'V'),
                                'borrowable': (aRow[4] === 'V')
                            },
                            'type': aRow[6],
                            'project': aRow[8],
                            'active': aRow[9] === 'TRUE',
                            'category': aRow[10],
                            'activity': aRow[11],
                            'delivery_area': aRow[12].split(",") || [0]
                        }, {
                            upsert: true,
                            new: true
                        }, (err, afterUpdate) => {
                            if (err) return reject(err);
                            resolve(afterUpdate);
                        });
                    })))
                    .then(placeList => {
                        Store.find((err, oriStoreList) => {
                            if (err) return debug.error(err);
                            let photosList = [];
                            Promise
                                .all(placeList.map(aPlace => new Promise((resolve, reject) => {
                                    let errCtr = 0;
                                    const getResponse = function (cb) {
                                        googleMapsClient.place({
                                            placeid: aPlace.placeID,
                                            language: "zh-TW",
                                            fields: ["formatted_address", "opening_hours", "geometry", "type", "photo", "url"]
                                        }, (err, response) => {
                                            if (err) {
                                                if (err === 'timeout') {
                                                    return reject(`[Place API ERR (timeout)]: ${aPlace.placeID}`);
                                                } else if (err.json) {
                                                    return reject(`[Place API ERR (status_1)]: ${aPlace.placeID} - ${err.status}`);
                                                } else {
                                                    let errDetail = err;
                                                    if (typeof errDetail === "object") errDetail = JSON.stringify(errDetail);
                                                    return reject(`[Place API ERR (unknown)]: ${aPlace.placeID} - ${errDetail}`);
                                                }
                                            }
                                            if (response.json.status !== "OK") {
                                                if (response.json.status === "OVER_QUERY_LIMIT" && errCtr++ < 3) {
                                                    setTimeout(getResponse(cb), 1000);
                                                } else {
                                                    return reject(`[Place API ERR (status_2)]: ${aPlace.placeID} - ${response.json.status}`);
                                                }
                                            }
                                            cb(response);
                                        });
                                    };
                                    getResponse((response) => {
                                        const dataFromApi = response.json.result;
                                        try {
                                            let formattedType = [];
                                            if (aPlace && aPlace.type !== "") {
                                                formattedType = aPlace.type.replace(" ", "").split(",");
                                            } else {
                                                dataFromApi.types.forEach(aType => {
                                                    const translated = dictionary[aType];
                                                    if (translated)
                                                        formattedType.push(translated);
                                                    else if (ignorePlaceTypes.indexOf(aType) === -1)
                                                        debug.error(`[Sheet] New Word To Translate: ${aType}`);
                                                });
                                            }
                                            let opening_hours;
                                            let theOriStore = oriStoreList.find(ele => ele.id == aPlace.ID);
                                            if (theOriStore && theOriStore.opening_default) {
                                                opening_hours = theOriStore.opening_hours;
                                            } else if (dataFromApi.opening_hours && dataFromApi.opening_hours.periods) {
                                                opening_hours = dataFromApi.opening_hours.periods;
                                                for (let j = 0; j < opening_hours.length; j++) {
                                                    if (!(opening_hours[j].close && opening_hours[j].close.time)) {
                                                        if (opening_hours[j].open && opening_hours[j].open.day === 0 && opening_hours[j].open.time === "0000") {
                                                            opening_hours = allOpenPeriods;
                                                            break;
                                                        } else {
                                                            opening_hours = defaultPeriods;
                                                            break;
                                                        }
                                                    } else {
                                                        opening_hours[j].close.time = opening_hours[j].close.time.slice(0, 2) + ":" + opening_hours[j].close.time.slice(2);
                                                        opening_hours[j].open.time = opening_hours[j].open.time.slice(0, 2) + ":" + opening_hours[j].open.time.slice(2);
                                                    }
                                                }
                                            } else {
                                                opening_hours = defaultPeriods;
                                            }
                                            let photos_fromGoogle = null;
                                            if (dataFromApi.photos && dataFromApi.photos.length >= 1 && typeof dataFromApi.photos[0].photo_reference === "string")
                                                photos_fromGoogle = dataFromApi.photos[0].photo_reference;
                                            Store.findOneAndUpdate({
                                                'id': aPlace.ID
                                            }, {
                                                'name': aPlace.name,
                                                'contract': {
                                                    returnable: aPlace.contract.returnable,
                                                    borrowable: aPlace.contract.borrowable,
                                                    status_code: (((aPlace.contract.returnable) ? 1 : 0) + ((aPlace.contract.borrowable) ? 1 : 0))
                                                },
                                                'type': formattedType,
                                                'project': aPlace.project,
                                                'address': dataFromApi.formatted_address
                                                    .replace(/^\d*/, '').replace('区', '區').replace('F', '樓'),
                                                'opening_hours': opening_hours,
                                                'location': dataFromApi.geometry.location,
                                                'active': aPlace.active,
                                                'category': aPlace.category,
                                                'activity': aPlace.activity,
                                                'photos_fromGoogle': photos_fromGoogle,
                                                'url_fromGoogle': dataFromApi.url,
                                                '$setOnInsert': {
                                                    'img_info': {
                                                        img_src: "https://app.goodtogo.tw/images/" + intReLength(aPlace.ID, 2),
                                                        img_version: 0
                                                    }
                                                },
                                                'delivery_area': aPlace.delivery_area
                                            }, {
                                                upsert: true,
                                                setDefaultsOnInsert: true,
                                                new: true
                                            }, (err, res) => {
                                                if (err) return reject(err);
                                                if (photos_fromGoogle !== null)
                                                    photosList.push({
                                                        storeID: aPlace.ID,
                                                        ref: photos_fromGoogle
                                                    });
                                                resolve(res);
                                            });
                                        } catch (error) {
                                            reject(`[Place API ERR (response))] placeID: ${aPlace.placeID} Error:${error.message} ApiResponse: ${JSON.stringify(dataFromApi)}`);
                                        }
                                    });
                                })))
                                .then((data) => {
                                    downloadPhotos(photosList);
                                    return cb(null, data);
                                })
                                .catch(err => {
                                    debug.error(err);
                                    if (typeof err === "string") err = {
                                        status: 500,
                                        message: err
                                    };
                                    return cb(err);
                                });
                        });
                    })
                    .catch(cb);
            });
        });
    },
    getStation: function (cb) {
        googleAuth(function getSheet(auth) {
            sheets.spreadsheets.values.get({
                auth: auth,
                spreadsheetId: configs.store_sheet_ID,
                range: 'StorageStation!A2:C',
            }, function (err, response) {
                if (err) return debug.error('[Sheet API ERR (getStation)] Error: ' + err);
                const rowsFromSheet = response.data.values;
                const validRows = rowsFromSheet.filter(aRow => (isNum.test(aRow[0]) && aRow[1] !== ""));
                Promise
                    .all(validRows.map(aRow => new Promise((resolve, reject) => {
                        Station.findOneAndUpdate({
                            'ID': aRow[0]
                        }, {
                            'name': aRow[1],
                            'boxable': aRow[2] === 'TRUE'
                        }, {
                            upsert: true,
                            new: true
                        }, (err, afterUpdate) => {
                            if (err) return reject(err);
                            resolve(afterUpdate);
                        });
                    })))
                    .then(stationList => cb(null, stationList))
                    .catch(cb);
            });
        });
    },
    getCoupon: function (cb) {
        googleAuth(function getSheet(auth) {
            sheets.spreadsheets.values.get({
                auth: auth,
                spreadsheetId: configs.coupon_sheet_ID,
                range: 'coupon_type_list!A2:Q'
            }, function (err, response) {
                if (err) return cb('[Sheet API ERR (getCoupon)] Error: ' + err);
                const couponTypeList = response.data.values.filter(aRow => (aRow[0] !== "" && aRow[1] !== "" && aRow[2] !== ""));
                CouponType.find((err, oriCouponTypeList) => {
                    if (err) return cb(err);
                    Promise
                        .all(couponTypeList.map(aCouponType => new Promise((resolve, reject) => {
                            const oriCouponType = oriCouponTypeList.find(aOriCouponType => aOriCouponType.couponTypeID === aCouponType[0]);
                            let newImgVersion;
                            if (oriCouponType) {
                                newImgVersion = oriCouponType.img_info.img_src === aCouponType[10] ?
                                    oriCouponType.img_info.img_version : oriCouponType.img_info.img_version + 1;
                            } else {
                                newImgVersion = 0;
                            }
                            const oriPurchaseDeadline = getDateCheckpoint(new Date(aCouponType[4]));
                            const purchaseDeadline = oriPurchaseDeadline.setSeconds(oriPurchaseDeadline.getSeconds() + (60 * 60 * 24 - 1));
                            const oriExpirationDate = getDateCheckpoint(new Date(aCouponType[5]));
                            const expirationDate = oriExpirationDate.setSeconds(oriExpirationDate.getSeconds() + (60 * 60 * 24 - 1));
                            CouponType.generateStrucNotice(aCouponType[12], aCouponType[11], (err, structuredNotice) => {
                                if (err) return reject(err);
                                CouponType.findOneAndUpdate({
                                    "couponTypeID": aCouponType[0]
                                }, {
                                    "provider": aCouponType[1],
                                    "title": aCouponType[2],
                                    "announceDate": getDateCheckpoint(new Date(aCouponType[3])),
                                    "purchaseDeadline": purchaseDeadline,
                                    "expirationDate": expirationDate,
                                    "price": aCouponType[7],
                                    "amount.total": aCouponType[6],
                                    "extraNotice": aCouponType[11],
                                    "extraContent": aCouponType[12],
                                    "structuredNotice": structuredNotice,
                                    "img_info": {
                                        img_src: aCouponType[10],
                                        img_version: newImgVersion
                                    },
                                    "order": aCouponType[8] === "TRUE" ? 10 : 5,
                                    "welcomeGift": aCouponType[9] === "TRUE",
                                    "usingCallback": {
                                        "rentContainer": aCouponType[13] === "TRUE",
                                        "containerAmount": aCouponType[14] === "null" ? null : aCouponType[14],
                                        "storeCode": aCouponType[15] === "null" ? null : aCouponType[15]
                                    },
                                    "availableForFreeUser": aCouponType[16] === "TRUE",
                                    "$setOnInsert": {
                                        "amount.current": aCouponType[6]
                                    }
                                }, {
                                    upsert: true,
                                    setDefaultsOnInsert: true,
                                    new: true
                                }, (err, result) => {
                                    if (err) return reject(err);
                                    resolve(result);
                                });
                            });
                        })))
                        .then(couponTypeList => cb(null, couponTypeList))
                        .catch(cb);
                });
            });
        });
    }
};


function arr_diff(a1, a2) {

    var a = [],
        diff = [];

    for (var i = 0; i < a1.length; i++) {
        a[a1[i]] = true;
    }

    for (var i = 0; i < a2.length; i++) {
        if (a[a2[i]]) {
            delete a[a2[i]];
        } else {
            a[a2[i]] = true;
        }
    }

    for (var k in a) {
        diff.push(k);
    }

    return diff;
}