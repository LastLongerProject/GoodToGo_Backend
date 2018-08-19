var fs = require('fs');
var request = require('request');
var {
    google
} = require('googleapis');
var sheets = google.sheets('v4');
var debug = require('debug')('goodtogo_backend:google_sheet');

var intReLength = require('../toolKit').intReLength;
var PlaceID = require('../DB/placeIdDB');
var Store = require('../DB/storeDB');
var ContainerType = require('../DB/containerTypeDB');
var Container = require('../DB/containerDB');

var googleAuth = require("./auth");

var isNum = /^\d+$/;
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
    getContainer: function (dbAdmin, cb) {
        fs.readFile("./assets/json/googleContent.json", 'utf8', function (err, data) {
            if (err) throw err;
            var spreadsheetId = JSON.parse(data).container_sheet_ID;
            googleAuth(function getSheet(auth) {
                sheets.spreadsheets.values.batchGet({
                    auth: auth,
                    spreadsheetId: spreadsheetId,
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
                            var localPtr = i;
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
        });
    },
    getStore: function (cb) {
        fs.readFile("./config/config.json", 'utf8', function (err, data) {
            if (err) throw err;
            var placeApiKey = JSON.parse(data).google_place;
            fs.readFile("./assets/json/googleContent.json", 'utf8', function (err, data) {
                if (err) throw err;
                var dataToObject = JSON.parse(data);
                var spreadsheetId = dataToObject.store_sheet_ID;
                var dictionary = dataToObject.translater;
                googleAuth(function getSheet(auth) {
                    sheets.spreadsheets.values.get({
                        auth: auth,
                        spreadsheetId: spreadsheetId,
                        range: 'active!A2:J',
                    }, function (err, response) {
                        if (err) {
                            debug('[Sheet API ERR (getStore)] Error: ' + err);
                            return;
                        }
                        var rows = response.data.values;
                        var placeArr = [];
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
                                            var dataArray = [];
                                            request
                                                .get('https://maps.googleapis.com/maps/api/place/details/json?placeid=' + fulfillPlace[localCtr].placeID + '&key=' + placeApiKey + '&language=zh-TW')
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
                                                    for (var j = 0; j < (dataObject.result.types.length - 2); j++) {
                                                        type.push(dictionary[dataObject.result.types[j]] || dataObject.result.types[j]);
                                                    }
                                                    var aStore = oldList.find(ele => ele.id == fulfillPlace[localCtr].ID);
                                                    var opening_hours;
                                                    if (aStore && aStore.opening_default) {
                                                        opening_hours = aStore.opening_hours;
                                                    } else {
                                                        opening_hours = (dataObject.result.opening_hours) ? dataObject.result.opening_hours.periods : defaultPeriods;
                                                        for (var j = 0; j < opening_hours.length; j++) {
                                                            if (!opening_hours[j].close || opening_hours[j].close.time || opening_hours[j].open || opening_hours[j].open.time) {
                                                                opening_hours = defaultPeriods;
                                                                break;
                                                            }
                                                            opening_hours[j].close.time = opening_hours[j].close.time.slice(0, 2) + ":" + opening_hours[j].close.time.slice(2);
                                                            opening_hours[j].open.time = opening_hours[j].open.time.slice(0, 2) + ":" + opening_hours[j].open.time.slice(2);
                                                        }
                                                    }
                                                    Store.findOneAndUpdate({
                                                        'id': fulfillPlace[localCtr].ID
                                                    }, {
                                                        'name': fulfillPlace[localCtr].name,
                                                        'contract': {
                                                            returnable: fulfillPlace[localCtr].contract.returnable,
                                                            borrowable: fulfillPlace[localCtr].contract.returnable,
                                                            status_code: (((fulfillPlace[localCtr].contract.returnable) ? 1 : 0) + ((fulfillPlace[localCtr].contract.borrowable) ? 1 : 0))
                                                        },
                                                        'type': type,
                                                        'project': fulfillPlace[localCtr].project,
                                                        'address': dataObject.result.formatted_address
                                                            .slice(dataObject.result.formatted_address.indexOf('台灣') + 2, (dataObject.result.formatted_address.indexOf('\(') < 0) ? dataObject.result.formatted_address.length : dataObject.result.formatted_address.indexOf('\('))
                                                            .replace('区', '區'),
                                                        'opening_hours': opening_hours,
                                                        'location': dataObject.result.geometry.location,
                                                        'active': fulfillPlace[localCtr].active,
                                                        '$setOnInsert': {
                                                            'img_info': {
                                                                img_src: "https://app.goodtogo.tw/images/" + intReLength(fulfillPlace[localCtr].ID, 2),
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
                                    var returnObject = [];
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
            });
        });
    }
};