var request = require('request');
var {
    google
} = require('googleapis');
var sheets = google.sheets('v4');
var debug = require('debug')('goodtogo_backend:google_sheet');

var intReLength = require('@lastlongerproject/toolkit').intReLength;
var PlaceID = require('../../models/DB/placeIdDB');
var Store = require('../../models/DB/storeDB');
var ContainerType = require('../../models/DB/containerTypeDB');
var Container = require('../../models/DB/containerDB');

const googleAuth = require("./auth");
const configs = require("../../config/config").google;
const placeApiKey = configs.apikeys.place;
const dictionary = configs.translater;

const isNum = /^\d+$/;
var defaultPeriods = [];
for (var i = 0; i < 7; i++) {
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
    getContainer: function (dbAdmin, cb) {
        googleAuth(function getSheet(auth) {
            sheets.spreadsheets.values.batchGet({
                auth: auth,
                spreadsheetId: configs.container_sheet_ID,
                ranges: ['container!A2:F', 'container_type!A2:C'],
            }, function (err, response) {
                if (err) {
                    debug('[Sheet API ERR (getContainer)] Error: ' + err);
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
                    .then((dataList) => {
                        Container.remove({
                            'checkedAt': {
                                '$lt': checkpoint
                            }
                        }, (err) => {
                            if (err) return debug(err);
                            cb();
                        });
                    })
                    .catch((err) => {
                        if (err) return debug(err);
                    });
            });
        });
    },
    getStore: function (cb) {
        googleAuth(function getSheet(auth) {
            sheets.spreadsheets.values.get({
                auth: auth,
                spreadsheetId: configs.store_sheet_ID,
                range: 'active!A2:J',
            }, function (err, response) {
                if (err) {
                    debug('[Sheet API ERR (getStore)] Error: ' + err);
                    return;
                }
                var rows = response.data.values;
                var PlaceIDFuncList = [];
                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    if (row[1] == "" || row[2] == "") break;
                    PlaceIDFuncList.push(new Promise((resolve, reject) => {
                        PlaceID.findOneAndUpdate({
                            'ID': row[0]
                        }, {
                            'name': row[1],
                            'placeID': row[2],
                            'contract': {
                                'returnable': (row[3] === 'V'),
                                'borrowable': (row[4] === 'V')
                            },
                            'type': row[6],
                            'project': row[8],
                            'active': row[9] === 'TRUE'
                        }, {
                            upsert: true,
                            new: true
                        }, (err, afterUpdate) => {
                            if (err) return reject(err);
                            resolve(afterUpdate);
                        });
                    }));
                }
                Promise
                    .all(PlaceIDFuncList)
                    .then((fulfillPlace) => {
                        Store.find({}, (err, oldList) => {
                            if (err) return debug(err);
                            var placeApiFuncList = [];
                            for (var i = 0; i < fulfillPlace.length; i++) {
                                if (!isNum.test(fulfillPlace[i].ID)) continue;
                                placeApiFuncList.push(new Promise((resolve, reject) => {
                                    var localCtr = i;
                                    var aPlace = fulfillPlace[localCtr];
                                    var dataArray = [];
                                    request
                                        .get('https://maps.googleapis.com/maps/api/place/details/json?placeid=' + aPlace.placeID +
                                            '&language=zh-TW&region=tw&key=' + placeApiKey +
                                            '&fields=formatted_address,opening_hours,geometry,types')
                                        .on('response', function (response) {
                                            if (response.statusCode !== 200) {
                                                debug('[Place API ERR (1)] StatusCode : ' + response.statusCode);
                                                return reject(localCtr);
                                            }
                                        })
                                        .on('error', function (err) {
                                            debug('[Place API ERR (2)] Message : ' + err);
                                            return reject(localCtr);
                                        })
                                        .on('data', function (data) {
                                            dataArray.push(data);
                                        })
                                        .on('end', function () {
                                            var dataBuffer = Buffer.concat(dataArray);
                                            var dataObject = JSON.parse(dataBuffer.toString());
                                            var type = [];
                                            if (aPlace && aPlace.type !== "") {
                                                type = aPlace.type.replace(" ", "").split(",");
                                            } else {
                                                dataObject.result.types.forEach(aType => {
                                                    var translated = dictionary[aType];
                                                    if (translated) type.push(translated);
                                                });
                                            }
                                            var opening_hours;
                                            var aOldStore = oldList.find(ele => ele.id == aPlace.ID);
                                            if (aOldStore && aOldStore.opening_default) {
                                                opening_hours = aOldStore.opening_hours;
                                            } else if (dataObject.result.opening_hours && dataObject.result.opening_hours.periods) {
                                                opening_hours = dataObject.result.opening_hours.periods;
                                                for (var j = 0; j < opening_hours.length; j++) {
                                                    if (!(opening_hours[j].close && opening_hours[j].close.time && opening_hours[j].open && opening_hours[j].open.time)) {
                                                        opening_hours = defaultPeriods;
                                                        break;
                                                    } else {
                                                        opening_hours[j].close.time = opening_hours[j].close.time.slice(0, 2) + ":" + opening_hours[j].close.time.slice(2);
                                                        opening_hours[j].open.time = opening_hours[j].open.time.slice(0, 2) + ":" + opening_hours[j].open.time.slice(2);
                                                    }
                                                }
                                            } else {
                                                opening_hours = defaultPeriods;
                                            }
                                            Store.findOneAndUpdate({
                                                'id': aPlace.ID
                                            }, {
                                                'name': aPlace.name,
                                                'contract': {
                                                    returnable: aPlace.contract.returnable,
                                                    borrowable: aPlace.contract.returnable,
                                                    status_code: (((aPlace.contract.returnable) ? 1 : 0) + ((aPlace.contract.borrowable) ? 1 : 0))
                                                },
                                                'type': type,
                                                'project': aPlace.project,
                                                'address': dataObject.result.formatted_address
                                                    .replace(/^\d*/, '').replace('区', '區').replace('F', '樓'),
                                                'opening_hours': opening_hours,
                                                'location': dataObject.result.geometry.location,
                                                'active': aPlace.active,
                                                '$setOnInsert': {
                                                    'img_info': {
                                                        img_src: "https://app.goodtogo.tw/images/" + intReLength(aPlace.ID, 2),
                                                        img_version: 0
                                                    }
                                                }
                                            }, {
                                                upsert: true,
                                                setDefaultsOnInsert: true,
                                                new: true
                                            }, (err, res) => {
                                                if (err) return reject(err);
                                                resolve(res);
                                            });
                                        });
                                }));
                            }
                            Promise
                                .all(placeApiFuncList)
                                .then((data) => {
                                    return cb(data);
                                })
                                .catch((err) => {
                                    if (err) return debug(err);
                                });
                        });
                    })
                    .catch((err) => {
                        if (err) return debug(err);
                    });
            });
        });
    }
};