const request = require('request');
const {
    google
} = require('googleapis');
const sheets = google.sheets('v4');
const debug = require('../debugger')('google_sheet');

const intReLength = require('@lastlongerproject/toolkit').intReLength;
const PlaceID = require('../../models/DB/placeIdDB');
const Store = require('../../models/DB/storeDB');
const Activity = require('../../models/DB/activityDB');
const User = require('../../models/DB/userDB');
const ContainerType = require('../../models/DB/containerTypeDB');
const Container = require('../../models/DB/containerDB');

const googleAuth = require("./auth");
const configs = require("../../config/config").google;
const placeApiKey = configs.apikeys.place;
const dictionary = configs.translater;

const isNum = /^\d+$/;
const defaultPeriods = [];
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
}

module.exports = {
    updateSummary: function(dataSets, sheetNames, cb) {
        googleAuth(auth => {
            sheets.spreadsheets.get({
                auth,
                spreadsheetId: configs.summary_sheet_ID
            }, function(err, spreadsheetsDetail) {
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
    getContainer: function(dbAdmin, cb) {
        googleAuth(function getSheet(auth) {
            sheets.spreadsheets.values.batchGet({
                auth: auth,
                spreadsheetId: configs.container_sheet_ID,
                ranges: ['container!A2:F', 'container_type!A2:C'],
            }, function(err, response) {
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
                    .then((dataList) => {
                        Container.updateMany({
                            'checkedAt': {
                                '$lt': checkpoint
                            }
                        }, {
                            'active': false
                        }, (err) => {
                            if (err) return debug.error(err);
                            cb();
                        });
                    })
                    .catch((err) => {
                        if (err) return debug.error(err);
                    });
            });
        });
    },
    getStore: function(cb) {
        googleAuth(function getSheet(auth) {
            sheets.spreadsheets.values.get({
                auth: auth,
                spreadsheetId: configs.store_sheet_ID,
                range: 'active!A2:L',
            }, function(err, response) {
                if (err) {
                    debug.error('[Sheet API ERR (getStore)] Error: ' + err);
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
                            'active': row[9] === 'TRUE',
                            'category': row[10],
                            'activity': row[11]
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
                            if (err) return debug.error(err);
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
                                        .on('response', function(response) {
                                            if (response.statusCode !== 200) {
                                                debug.error('[Place API ERR (1)] StatusCode : ' + response.statusCode);
                                                return reject(localCtr);
                                            }
                                        })
                                        .on('error', function(err) {
                                            debug.error('[Place API ERR (2)] Message : ' + err);
                                            return reject(localCtr);
                                        })
                                        .on('data', function(data) {
                                            dataArray.push(data);
                                        })
                                        .on('end', function() {
                                            var dataBuffer = Buffer.concat(dataArray);
                                            var dataObject = JSON.parse(dataBuffer.toString());
                                            try {
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
                                                    'category': aPlace.category,
                                                    'activity': aPlace.activity,
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
                                                    if (aPlace.activity) {
                                                        Promise.all(aPlace.activity.map(activity => User
                                                            .updateMany({
                                                                'roles.clerk.storeID': aPlace.ID
                                                            },{
                                                                $push: {
                                                                    'roles.typeList': `clerk_${activity}`
                                                                }
                                                            },{
                                                                upsert: true,
                                                                new: true,
                                                                setDefaultsOnInsert: true
                                                            })
                                                            .exec()
                                                        )).then(_ => resolve(_))
                                                        .catch(err => {
                                                            debug.error(err);
                                                            reject(err);
                                                        });
                                                    }
                                                    resolve(res);   
                                                });
                                            } catch (error) {
                                                debug.error(`[Place API ERR (3)] DataBuffer : ${dataBuffer.toString()}`)
                                                reject(error);
                                            }
                                        });
                                }));
                            }
                            Promise
                                .all(placeApiFuncList)
                                .then((data) => {
                                    return cb(data);
                                })
                                .catch((err) => {
                                    if (err) return debug.error(err);
                                });
                        });
                    })
                    .catch((err) => {
                        if (err) return debug.error(err);
                    });
            });
        });
    },
    getActivity: function(dbAdmin, cb) {
        googleAuth(function getSheet(auth) {
            sheets.spreadsheets.values.get({
                auth: auth,
                spreadsheetId: configs.activity_sheet_ID,
                range: 'active!A2:C',
            }, function(err, response) {
                if (err) {
                    debug.error('[Sheet API ERR (getActivity)] Error: ' + err);
                    return;
                }
                var rows = response.data.values;
                var funcList = [];
                var checkpoint = Date.now();
                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    if (row[1] === "" || row[2] === "" || row[3 === ""]) break;
                    funcList.push(new Promise((resolve, reject) => {
                        Activity.findOneAndUpdate({
                            'ID': row[0]
                        }, {
                            'name': row[1],
                            'startAt': row[2],
                            'endAt': row[2]
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
                    .all(funcList)
                    .then((dataList) => {
                        Activity.updateMany({
                            'checkedAt': {
                                '$lt': checkpoint
                            }
                        }, {
                            'active': false
                        }, (err) => {
                            if (err) return debug.error(err);
                            cb();
                        });
                    })
                    .catch((err) => {
                        if (err) return debug.error(err);
                    });
            });
        });
    }
};