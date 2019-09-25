const request = require('request');
const {
    google
} = require('googleapis');
const sheets = google.sheets('v4');
const debug = require('../debugger')('google_sheet');

const intReLength = require('../toolkit').intReLength;
const dateCheckpoint = require('../toolkit').dateCheckpoint;
const getDateCheckpoint = require('../toolkit').getDateCheckpoint;

const User = require('../../models/DB/userDB');
const Store = require('../../models/DB/storeDB');
const PlaceID = require('../../models/DB/placeIdDB');
const UserKeys = require('../../models/DB/userKeysDB');
const Activity = require('../../models/DB/activityDB');
const Container = require('../../models/DB/containerDB');
const CouponType = require('../../models/DB/couponTypeDB');
const ContainerType = require('../../models/DB/containerTypeDB');

const googleAuth = require("./auth");
const configs = require("../../config/config").google;
const placeApiKey = configs.apikeys.place;
const dictionary = configs.translater;

const isNum = /^\d+$/;
const ignorePlaceTypes = ["point_of_interest", "establishment"];
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
                const validRows = rowsFromSheet.filter(aRow => (isNum.test(aRow[0]) && aRow[1] !== "" && aRow[2] !== "" && aRow.length >= 11));
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
                        Store.find((err, oriStoreList) => {
                            if (err) return debug.error(err);
                            Promise
                                .all(placeList.map(aPlace => new Promise((resolve, reject) => {
                                    const bufferArray = [];
                                    request
                                        .get('https://maps.googleapis.com/maps/api/place/details/json?placeid=' + aPlace.placeID +
                                            '&language=zh-TW&region=tw&key=' + placeApiKey +
                                            '&fields=formatted_address,opening_hours,geometry,types')
                                        .on('response', function (response) {
                                            if (response.statusCode !== 200) {
                                                debug.error('[Place API ERR (1)] StatusCode: ' + response.statusCode);
                                                return reject(aPlace.ID);
                                            }
                                        })
                                        .on('error', function (err) {
                                            debug.error('[Place API ERR (2)] Message: ' + err);
                                            return reject(aPlace.ID);
                                        })
                                        .on('data', function (data) {
                                            bufferArray.push(data);
                                        })
                                        .on('end', function () {
                                            const dataBuffer = Buffer.concat(bufferArray);
                                            const dataObject = JSON.parse(dataBuffer.toString());
                                            const dataFromApi = dataObject.result;
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
                if (err) return debug.error('[Sheet API ERR (getActivity)] Error: ' + err);
                const rows = response.data.values;
                const checkpoint = Date.now();
                const validRows = rows.filter(aRow => (aRow[1] !== "" && aRow[2] !== "" && aRow[3] !== ""));
                Promise
                    .all(validRows.map(aRow => new Promise((resolve, reject) => {
                        Activity.findOneAndUpdate({
                            'ID': aRow[0]
                        }, {
                            'name': aRow[1],
                            'startAt': aRow[2],
                            'endAt': aRow[3]
                        }, {
                            upsert: true,
                            new: true
                        }, (err, afterUpdate) => {
                            if (err) return reject(err);
                            resolve(afterUpdate);
                        });
                    })))
                    .then(activityList => {
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
    },


/*
request={
    auth,
    spreadsheetId:String,
    resources:{
        "valueInputOption":String,
        "data":Array
    }
}

data Array=[
    {
        "majorDimension":String,
        "range":String,
        "values":Array of array,
    }
]

Array of array of total data =[
    [
        Store name,
        Container type,
        Sign Count,
        Rent Count,
        Availible Count
    ]
]

Array of array of weekly data =[
    [
        日期,
        Sign 大器,
        Sign 小器,
        Rent 大器,
        Rent 小器,
        Return 大器,
        Return 小器,
        登記借出未登記ID
    ]
]


*/
    integrateStoreDataToGoogleSheet:(req,res,next)=>{
            let datasetOfTotalData=[];
            let ValuesOfTotalDataset=[];
            let datasetOfWeeklyData=[];
            let storeNames={};
            let storeIDkeysOfTotalData=Object.keys(req.StoreTotalData);
            let storeIDkeysOfWeeklyData=Object.keys(req.StoreWeeklyData);

            Store.find({
                'id':{'$in':storeIDkeysOfTotalData}
            },(err,stores)=>{
                if (err) next(err)
                stores.forEach(store=>{
                    storeNames[store._doc.id]=store._doc.name;
                })
                storeIDkeysOfTotalData.forEach(storeIDkey=>{
                    let ArrayOfContainerType=Object.keys(req.StoreTotalData[storeIDkey]['Sign']);
                    ArrayOfContainerType.forEach(containerType=>{
                        let ValueBePushTotalValuesOfTotalDataset=[];
                        ValueBePushTotalValuesOfTotalDataset.push(storeNames[storeIDkey])
                        if (containerType==='8') ValueBePushTotalValuesOfTotalDataset.push('小器');
                        else if (containerType==='9') ValueBePushTotalValuesOfTotalDataset.push('大器');
                        else console.error('Container type is not in expectance(\'8\' or \'9\')');
                        ValueBePushTotalValuesOfTotalDataset.push(req.StoreTotalData[storeIDkey]['Sign'][containerType]);
                        ValueBePushTotalValuesOfTotalDataset.push(req.StoreTotalData[storeIDkey]['Rent'][containerType]);
                        ValueBePushTotalValuesOfTotalDataset.push(req.StoreTotalData[storeIDkey]['availableCount'][containerType]);
                        ValuesOfTotalDataset.push(ValueBePushTotalValuesOfTotalDataset);
                    })
                })
                datasetOfTotalData.push({
                    "range":"'SUMMARY'!B1:5",
                    "majorDimension":"COLUMNS",
                    "values":ValuesOfTotalDataset,
                })
                req.datasetOfTotalData=datasetOfTotalData;
                


                storeIDkeysOfWeeklyData.forEach(storeIDkey=>{
                    let valuesOfWeeklyDataset=[];
                    let dataItem={}
                    dataItem["range"]=""+"'"+`${storeIDkey}`+'_'+`${storeNames[storeIDkey]}`+"'"+"!A3:H"
                    dataItem["majorDimension"]="ROWS"
                    Object.keys(req.StoreWeeklyData[storeIDkey]).forEach(date=>{
                        let valueOfWeeklyData=[];
                        valueOfWeeklyData.push(date)
                        Object.keys(req.StoreWeeklyData[storeIDkey][date]).forEach(actionType=>{
                            if(actionType==="nullCount") valueOfWeeklyData.push(req.StoreWeeklyData[storeIDkey][date][actionType])
                            else {
                                Object.keys(req.StoreWeeklyData[storeIDkey][date][actionType]).forEach(containerType=>{
                                    valueOfWeeklyData.push(req.StoreWeeklyData[storeIDkey][date][actionType][containerType])
                                })
                            }
                        })
                        valuesOfWeeklyDataset.push(valueOfWeeklyData);
                    })
                    dataItem["values"]=valuesOfWeeklyDataset;
                    datasetOfWeeklyData.push(dataItem)
                })
                req.datasetOfWeeklyData=datasetOfWeeklyData;
                next()
            })   
    },

    sendCompleteDataToGoogleSheet:(req,res,next)=>{
        let CompleteDataSet=[];
        req.datasetOfTotalData.forEach(dataItem=>{
            CompleteDataSet.push(dataItem);
        })
        req.datasetOfWeeklyData.forEach(dataItem=>{
            CompleteDataSet.push(dataItem);
        })
        let spreadsheetId=req.sheetIDofSummary;
        req.CompleteDataSet=CompleteDataSet;
            googleAuth(auth=>{
                let request={
                    auth,
                    spreadsheetId:spreadsheetId,
                    resource:{
                        "valueInputOption":"RAW",
                        "data":CompleteDataSet
                    }
                }
                sheets.spreadsheets.values.batchUpdate(request,(err,response)=>{
                    if(err) {
                        console.error(err);
                        next(err);
                    }else {
                        res.responseFromGoogleSheet=response;
                        next();
                    }
                })
            })
    },
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

function detectTitleAndUpdateSheets(req,res,...next){
    let newSheetsCount=0;
    googleAuth(auth=>{
        let request={
            auth,
            spreadsheetId:req.sheetIDofSummary
        };

        sheets.spreadsheets.get(request,(err,res)=>{
            if (err) {
                console.error(err);
                return err
            }
            console.log(req.CompleteDataSet);

            let ArrayOfNewSheetTitle=[];
            req.CompleteDataSet.forEach((dataItem)=>{
                let sheetNameYouWantToUpdate=dataItem.range.split("'")[1];
                let ExistSheetTitles=res.data.sheets.map(sheet=>sheet.properties.title);
                console.log(ExistSheetTitles)
                console.log(sheetNameYouWantToUpdate)
                if (ExistSheetTitles.indexOf(sheetNameYouWantToUpdate)===-1){
                    newSheetsCount++
                    ArrayOfNewSheetTitle.push(sheetNameYouWantToUpdate);
                }
            })
            req.newSheetsCount=newSheetsCount;
            req.ArrayOfNewSheetTitle=ArrayOfNewSheetTitle;
            next[0](req,res,next[1])
        })
    })
}
function addSheetsInID(req,res,...next){
    console.log("New Sheet Count : "+req.newSheetsCount)
    console.log("Spreadsheet ID : "+req.sheetIDofSummary)
    req.body.ArrayOfStoreID.sort((a,b)=>{
        return a-b
    })
    googleAuth(auth=>{
        let requests=[];
        req.ArrayOfNewSheetTitle.forEach(title=>{
            requests.push({
                sourceSheetId:configs.summary_sheet_ID_for_Huiqun,
                
            })
        })
        let request={
            spreadsheetId:req.sheetIDofSummary,
            auth,
            resource:{
                requests:[]
            }
        };
        sheets.spreadsheets.batchUpdate(request,(err,res)=>{
            
        })
    })
}