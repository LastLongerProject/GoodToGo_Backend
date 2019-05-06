const request = require('request');
const {
    google
} = require('googleapis');
const sheets = google.sheets('v4');
const debug = require('../debugger')('google_sheet');

const intReLength = require('@lastlongerproject/toolkit').intReLength;
const dateCheckpoint = require('@lastlongerproject/toolkit').dateCheckpoint;

const PlaceID = require('../../models/DB/placeIdDB');
const Store = require('../../models/DB/storeDB');
const Activity = require('../../models/DB/activityDB');
const User = require('../../models/DB/userDB');
const UserKeys = require('../../models/DB/userKeysDB');
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
    getStore: function (cb) {
        googleAuth(function getSheet(auth) {
            sheets.spreadsheets.values.get({
                auth: auth,
                spreadsheetId: configs.store_sheet_ID,
                range: 'active!A2:L',
            }, function (err, response) {
                if (err) return debug.error('[Sheet API ERR (getStore)] Error: ' + err);
                const rowsFromSheet = response.data.values;
                const validRows = rowsFromSheet.filter(aRow => (isNum.test(aRow[0]) && aRow[1] !== "" && aRow[2] !== ""));
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
                            'activity': aRow[11]
                        }, {
                            upsert: true,
                            new: true
                        }, (err, afterUpdate) => {
                            if (err) return reject(err);
                            resolve(afterUpdate);
                        });
                    })))
                    .then(placeList => {
                        Store.find((err, oldStoreList) => {
                            if (err) return debug.error(err);
                            Promise
                                .all(placeList.map(aPlace => new Promise((resolve, reject) => {
                                    var bufferArray = [];
                                    request
                                        .get('https://maps.googleapis.com/maps/api/place/details/json?placeid=' + aPlace.placeID +
                                            '&language=zh-TW&region=tw&key=' + placeApiKey +
                                            '&fields=formatted_address,opening_hours,geometry,types')
                                        .on('response', function (response) {
                                            if (response.statusCode !== 200) {
                                                debug.error('[Place API ERR (1)] StatusCode : ' + response.statusCode);
                                                return reject(aPlace.ID);
                                            }
                                        })
                                        .on('error', function (err) {
                                            debug.error('[Place API ERR (2)] Message : ' + err);
                                            return reject(aPlace.ID);
                                        })
                                        .on('data', function (data) {
                                            bufferArray.push(data);
                                        })
                                        .on('end', function () {
                                            const dataBuffer = Buffer.concat(bufferArray);
                                            const dataObject = JSON.parse(dataBuffer.toString());
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
                                                var aOldStore = oldStoreList.find(ele => ele.id == aPlace.ID);
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
                                                        Promise
                                                            .all(aPlace.activity.map(activity => User
                                                                .updateMany({
                                                                    'roles.clerk.storeID': aPlace.ID,
                                                                    'roles.typeList': {
                                                                        $nin: [`clerk_${activity}`]
                                                                    }
                                                                }, {
                                                                    $push: {
                                                                        'roles.typeList': `clerk_${activity}`
                                                                    }
                                                                }, {
                                                                    upsert: true,
                                                                    new: true,
                                                                    setDefaultsOnInsert: true
                                                                })
                                                                .exec()
                                                            ))
                                                            .then(resolve)
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
                                })))
                                .then((data) => {
                                    return cb(data);
                                })
                                .catch(debug.error);
                        });
                    })
                    .catch(debug.error);
            });
        });
    },
    getActivity: function (cb) {
        googleAuth(function getSheet(auth) {
            sheets.spreadsheets.values.get({
                auth: auth,
                spreadsheetId: configs.activity_sheet_ID,
                range: 'active!A2:D',
            }, function (err, response) {
                if (err) {
                    debug.error('[Sheet API ERR (getActivity)] Error: ' + err);
                    return;
                }
                var rows = response.data.values;
                var funcList = [];
                var checkpoint = Date.now();
                for (var i = 0; i < rows.length; i++) {
                    if (rows[1] === "" || rows[2] === "" || rows[3 === ""]) break;
                    var row = rows[i];
                    funcList.push(new Promise((resolve, reject) => {
                        Activity.findOneAndUpdate({
                            'ID': row[0]
                        }, {
                            'name': row[1],
                            'startAt': row[2],
                            'endAt': row[3]
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
                    .then((activityList) => {
                        Activity.updateMany({
                            'checkedAt': {
                                '$lt': checkpoint
                            }
                        }, {
                            'active': false
                        }, (err) => {
                            if (err) return debug.error(err);

                            activityList = activityList.filter(activity => {
                                return dateCheckpoint(0) > activity.endAt;
                            });

                            let deleteExpiredActivityIdAll = Promise.all(activityList.map(activity => deleteExpiredActivityId(activity.name)));
                            let deleteAtivityKeyAll = Promise.all(activityList.map(activity => deleteAtivityKey(activity.name)));

                            Promise
                                .all([deleteExpiredActivityIdAll, deleteAtivityKeyAll])
                                .then(_ => {
                                    cb();
                                });
                        });
                    })
                    .catch((err) => {
                        if (err) return debug.error(err);
                    });
            });
        });
    }
};

function deleteExpiredActivityId(activityName) {
    return User
        .updateMany({}, {
            $pull: {
                'roles.typeList': {
                    $in: [`clerk_${activityName}`]
                }
            }
        }, {
            new: true
        })
        .exec();
}

function deleteAtivityKey(activityName) {
    return UserKeys
        .remove({
            roleType: `clerk_${activityName}`
        })
        .exec();
}