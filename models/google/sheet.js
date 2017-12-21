var fs = require('fs');
var request = require('request');
var google = require('googleapis');
var GoogleAuth = require('google-auth-library');
var debug = require('debug')('goodtogo_backend:google_sheet');

var intReLength = require('../toolKit').intReLength;
var PlaceID = require('../DB/placeIdDB');
var Store = require('../DB/storeDB');
var ContainerType = require('../DB/containerTypeDB');
var Container = require('../DB/containerDB');

var authFactory = new GoogleAuth();
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

var defaultPeriods = [];
for (var i = 0; i < 7; i++) {
    defaultPeriods.push({
        "close": {
            "day": i,
            "time": "2100"
        },
        "open": {
            "day": i,
            "time": "1200"
        }
    });
}

function googleAuth(callback) {
    authFactory.getApplicationDefault(function(err, authClient) {
        if (err) {
            debug('Authentication failed because of ', err);
            return;
        }
        if (authClient.createScopedRequired && authClient.createScopedRequired()) {
            authClient = authClient.createScoped(SCOPES);
        }

        callback(authClient);
    });
}

module.exports = {
    getContainer: function(dbAdmin, cb) {
        googleAuth(function getSheet(auth) {
            var sheets = google.sheets('v4');
            sheets.spreadsheets.values.batchGet({
                auth: auth,
                spreadsheetId: '1wgd6RgTs5TXfFhX6g8DBNFqr_V7tSTyWC9BqAeFVOyQ',
                ranges: ['container!A2:F', 'container_type!A2:C'],
            }, function(err, response) {
                if (err) {
                    debug('The API returned an error: ' + err);
                    return;
                }
                var sheetContainerList = response.valueRanges[0].values;
                var sheetContainerTypeList = response.valueRanges[1].values;
                var funcList = [];
                for (var i = 0; i < sheetContainerTypeList.length; i++) {
                    funcList.push(new Promise((resolve, reject) => {
                        var row = sheetContainerTypeList[i];
                        var localPtr = i;
                        ContainerType.update({ 'typeCode': row[0] }, {
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
                    funcList.push(new Promise((resolve, reject) => {
                        var row = sheetContainerList[i];
                        Container.update({ 'ID': row[0] }, {
                            'active': (row[3] === '1'),
                            'typeCode': row[1],
                            '$setOnInsert': { 'conbineTo': dbAdmin.user.phone }
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
                        cb();
                    })
                    .catch((err) => {
                        if (err) return debug(err);
                    });
            });
        });
    },
    getStore: function(cb) {
        var placeApiKey;
        fs.readFile("./config/config.json", 'utf8', function(err, data) {
            if (err) throw err;
            placeApiKey = JSON.parse(data).google_place;
        });
        var dictionary;
        fs.readFile("./assets/json/translater.json", 'utf8', function(err, data) {
            if (err) throw err;
            dictionary = JSON.parse(data);
        });
        googleAuth(function getSheet(auth) {
            var sheets = google.sheets('v4');
            sheets.spreadsheets.values.get({
                auth: auth,
                spreadsheetId: '1FEHPNjY2jITITTxvYkKiicVXddYTqQYvuLRGuC99jFg',
                range: 'active!A2:I',
            }, function(err, response) {
                if (err) {
                    debug('[Sheet API ERR (getStore)] Error: ' + err);
                    return;
                }
                var rows = response.values;
                var placeArr = [];
                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    var newPlace = new PlaceID();
                    newPlace.ID = row[0];
                    newPlace.name = row[1];
                    newPlace.placeID = row[2];
                    newPlace.contract = {
                        returnable: (row[3] === 'V'),
                        borrowable: (row[4] === 'V')
                    };
                    newPlace.project = row[8];
                    // console.log(newPlace);
                    placeArr.push(newPlace);
                }
                var funcArr = [];
                for (var i = 0; i < placeArr.length; i++) {
                    funcArr.push(new Promise((resolve, reject) => {
                        var localCtr = i;
                        var dataArray = [];
                        request
                            .get('https://maps.googleapis.com/maps/api/place/details/json?placeid=' + placeArr[localCtr].placeID + '&key=' + placeApiKey + '&language=zh-TW')
                            .on('response', function(response) {
                                if (response.statusCode !== 200) {
                                    debug('[Place API ERR (1)] StatusCode : ' + response.statusCode);
                                    return reject(localCtr);
                                }
                            })
                            .on('error', function(err) {
                                debug('[Place API ERR (2)] Message : ' + err);
                                return reject(localCtr);
                            })
                            .on('data', function(data) {
                                dataArray.push(data);
                            })
                            .on('end', function() {
                                var dataBuffer = Buffer.concat(dataArray);
                                var dataObject = JSON.parse(dataBuffer.toString());
                                // console.log(dataObject);
                                var newStore = new Store();
                                newStore.id = placeArr[localCtr].ID;
                                newStore.name = placeArr[localCtr].name;
                                newStore.contract = placeArr[localCtr].contract;
                                newStore.contract.status_code = (((newStore.contract.returnable) ? 1 : 0) + ((newStore.contract.borrowable) ? 1 : 0));
                                newStore.project = placeArr[localCtr].project;
                                newStore.address = dataObject.result.formatted_address.slice(dataObject.result.formatted_address.indexOf('台灣') + 2);
                                newStore.opening_hours = (dataObject.result.opening_hours) ? dataObject.result.opening_hours.periods : defaultPeriods;
                                for (var j = 0; j < newStore.opening_hours.length; j++) {
                                    newStore.opening_hours[j].close.time = newStore.opening_hours[j].close.time.slice(0, 2) + ":" + newStore.opening_hours[j].close.time.slice(2);
                                    newStore.opening_hours[j].open.time = newStore.opening_hours[j].open.time.slice(0, 2) + ":" + newStore.opening_hours[j].open.time.slice(2);
                                }
                                newStore.location = dataObject.result.geometry.location;
                                newStore.img_info = {
                                    img_src: "https://app.goodtogo.tw/images/" + intReLength(newStore.id, 2),
                                    img_version: 0
                                };
                                newStore.type = [];
                                for (var j = 0; j < (dataObject.result.types.length - 2); j++) {
                                    newStore.type.push(dictionary[dataObject.result.types[j]] || dataObject.result.types[j]);
                                }
                                return resolve([placeArr[localCtr], newStore]);
                            });
                    }));
                }
                var returnObject = [];
                Promise
                    .all(funcArr)
                    .then((data) => {
                        PlaceID.remove({}, (err) => {
                            if (err) return debug(err);
                            for (var i = 0; i < data.length; i++) {
                                data[i][0].save();
                            }
                            Store.find({}, (err, oldList) => {
                                if (err) return debug(err);
                                oldList.sort(function(a, b) { return a.id - b.id; });
                                data.sort(function(a, b) { return a[1].id - b[1].id; });
                                Store.remove({}, (err) => {
                                    if (err) return debug(err);
                                    for (var i = 0; i < data.length; i++) {
                                        if (typeof oldList[i] !== 'undefined') {
                                            data[i][1].img_info.img_version = oldList[i].img_info.img_version;
                                            if (oldList[i].opening_default) {
                                                data[i][1].opening_default = oldList[i].opening_default;
                                                data[i][1].opening_hours = oldList[i].opening_hours;
                                            }
                                        }
                                        returnObject.push(data[i][1]);
                                        data[i][1].save();
                                    }
                                    return cb(returnObject);
                                });
                            });
                        });
                    })
                    .catch((err) => {
                        if (err) {
                            debug(err);
                            return;
                        }
                    });
            });
        });
    }
};