const timeFormatter = require('../../../helpers/toolkit').timeFormatter;
const dayFormatter = require('../../../helpers/toolkit').dayFormatter;
const monthFormatter = require('../../../helpers/toolkit').monthFormatter;
const intReLength = require('../../../helpers/toolkit').intReLength;
const Box = require('../../../models/DB/boxDB');
const BoxStatus = require('../../../models/enums/boxEnum').BoxStatus;
const ErrorResponse = require('../../../models/enums/error')
    .ErrorResponse;
const DataCacheFactory = require("../../../models/dataCacheFactory");
const getDeliverContent = require('../../../helpers/tools.js').getDeliverContent;
const redis = require("../../../models/redis");

const queue = require('queue')({
    concurrency: 1,
    autostart: true
});

let fullDateStringWithoutYear = function (date) {
    dayFormatted = intReLength(dayFormatter(date), 2);
    monthFormatted = intReLength(monthFormatter(date), 2);

    return monthFormatted + "/" + dayFormatted;
}

function isSameDay(d1, d2) {    
    if (!(d1 instanceof Date && d2 instanceof Date)) return false;
    d1.toLocaleString
    if (d1.getFullYear() !== d2.getFullYear()) return false;
    if (d1.getMonth() !== d2.getMonth()) return false;
    if (d1.getDate() !== d2.getDate()) return false;

    return true
}

function createBoxID(date, sequence, stationID) {
    let dateString = fullDateStringWithoutYear(date).replace(/\//g, '');
    return dateString + String(stationID) + intReLength(sequence, 3);
}

function fetchBoxCreation(req, res, next) {
    queue.push((cb)=>{
        redis.get("delivery_box_creation_amount", (error, string) => {
            let dict = JSON.parse(string || "{}");
            let now = new Date();
            now.setDate(now.getDate()+8);
            let sequence = dict.sequence;
            let _sequence = isSameDay(now, new Date(dict.date)) ? Number(sequence) + 1 : 1;
            
            dict.sequence = _sequence;
            dict.date = now;

            req._sequence = _sequence;
            redis.set("delivery_box_creation_amount", JSON.stringify(dict));
            next();
            cb();
        })
    })
}

function validateCreateApiContent(req, res, next) {
    let boxArray = [];
    let boxIDs = [];
    let boxList = req.body.boxList;
    let dbUser = req._user;
    let date = new Date();

    let listID = fullDateStringWithoutYear(date).replace(/\//g, '');

    let index = req._sequence || 1;

    if (boxList === undefined || !Array.isArray(boxList)) {
        return res.status(403).json(ErrorResponse.H001_1);
    } else if (req.body.phone === undefined)
        return res.status(403).json(ErrorResponse.H001_2);

    for (let element of boxList) {

        let pass = validateBoxListContent(element, BoxContentType.order, [
            'boxName',
            'boxOrderContent',
            'dueDate'
        ]);

        if (!pass.bool) {
            return res.status(403).json(ErrorResponse[pass.code]);
        } else {
            let boxID = parseInt(createBoxID(date, index, dbUser.roles.admin.stationID));
            let box = new Box({
                boxID: boxID,
                boxName: element.boxName,
                boxOrderContent: element.boxOrderContent,
                dueDate: element.dueDate,
                storeID: parseInt(req.params.storeID),
                action: [{
                    phone: req.body.phone,
                    boxStatus: BoxStatus.Created,
                    timestamps: Date.now(),
                }, ],
                user: {
                    box: req.body.phone,
                },
                status: BoxStatus.Created,
            });
            boxArray.push(box);
            boxIDs.push(boxID);

            index++;
        }
    }
    req._listID = listID;
    req._boxArray = boxArray;
    req._boxIDs = boxIDs;
    next();
}

function validateStockApiContent(req, res, next) {

    let boxArray = [];
    let boxIDs = [];
    let boxList = req.body.boxList;
    let date = new Date();
    let dbUser = req._user;

    let listID = fullDateStringWithoutYear(date).replace(/\//g, '');

    let index = req._sequence || 1;

    if (boxList === undefined || !Array.isArray(boxList)) {
        return res.status(403).json(ErrorResponse.H001_1);
    } else if (req.body.phone === undefined)
        return res.status(403).json(ErrorResponse.H001_2);

    for (let element of boxList) {
        let pass = validateBoxListContent(element, null, [
            'boxName',
            'containerList'
        ]);
        if (!pass.bool) {
            return res.status(403).json(ErrorResponse[pass.code]);
        } else {
            let boxID = parseInt(createBoxID(date, index, dbUser.roles.admin.stationID));
            let box = new Box({
                boxID: boxID,
                boxName: element.boxName,
                dueDate: Date.now(),
                storeID: 99999,
                boxOrderContent: getDeliverContent(element.containerList),
                containerList: element.containerList,
                action: [{
                    phone: req.body.phone,
                    boxStatus: BoxStatus.Boxing,
                    timestamps: Date.now(),
                }],
                user: {
                    box: req.body.phone,
                },
                status: BoxStatus.Stocked,
            });
            element.boxID = boxID;
            boxArray.push(box);
            boxIDs.push(boxID);
            index++;
        }
    }
    req._boxArray = boxArray;
    req._boxIDs = boxIDs;
    next();
}

function validateBoxingApiContent(req, res, next) {
    let boxList = req.body.boxList;
    if (boxList === undefined || !Array.isArray(boxList))
        return res.status(403).json(ErrorResponse.H001_1);
    else if (req.body.phone === undefined)
        return res.status(403).json(ErrorResponse.H001_2);
    for (let element of boxList) {
        let pass = validateBoxListContent(element, null, [
            'comment',
            'containerList',
            'ID',
        ]);

        if (!pass.bool) {
            return res.status(403).json(ErrorResponse[pass.code]);
        }
    }

    next();
}

function validateChangeStateApiContent(req, res, next) {
    let boxList = req.body.boxList;
    if (boxList === undefined || !Array.isArray(boxList))
        return res.status(403).json(ErrorResponse.H001_1);
    if (req.body.phone === undefined)
        return res.status(403).json(ErrorResponse.H001_2);

    for (let element of boxList) {
        let pass = validateBoxListContent(element, BoxContentType.changeState, [
            "id",
            'newState',
        ]);

        if (!pass.bool) {
            return res.status(403).json(ErrorResponse[pass.code]);
        }
    }

    next();
}

function validateSignApiContent(req, res, next) {
    let boxList = req.body.boxList;
    if (boxList === undefined || !Array.isArray(boxList))
        return res.status(403).json(ErrorResponse.H001_1);
    if (req.body.phone === undefined)
        return res.status(403).json(ErrorResponse.H001_2);

    for (let element of boxList) {
        let pass = validateBoxListContent(element, BoxContentType.changeState, [
            "ID"
        ]);

        if (!pass.bool) {
            return res.status(403).json(ErrorResponse[pass.code]);
        }
    }

    next();
}

function validateModifyApiContent(req, res, next) {
    let body = req.body;
    let modifiable = ["boxName", "storeID", "dueDate", "boxOrderContent", "containerList", "comment"];
    for (let key of Object.keys(body)) {
        if (modifiable.indexOf(key) === -1) return res.status(403).json(ErrorResponse.H009);
        if ((key === 'boxName' && typeof body['boxName'] !== 'string') ||
            (key === 'storeID' && typeof body['storeID'] !== 'number') ||
            (key === 'dueDate' && typeof body['dueDate'] !== 'string') ||
            (key === 'boxOrderContent' && !Array.isArray(body['boxOrderContent'])) ||
            (key === 'containerList' && !Array.isArray(body['containerList'])) ||
            (key === 'comment' && typeof body['comment'] !== 'string')
        ) {
            return res.status(403).json(ErrorResponse.H005_4);
        }
        if (key === 'boxOrderContent') {
            for (let content of body['boxOrderContent']) {
                if (!('amount' in content) || typeof content['amount'] !== 'number') {
                    ErrorResponse.H010.message = "missing amount or its type is not Number";
                    return res.status(403).json(ErrorResponse.H010);
                } else if (!('containerType' in content) || typeof content['containerType'] !== 'string') {
                    ErrorResponse.H010.message = "missing containerType or its type is not Number";
                    return res.status(403).json(ErrorResponse.H010);
                }
            }
        }
        if (key === 'containerList') {
            for (let container of body['containerList']) {
                if (typeof container !== 'number') {
                    ErrorResponse.H010.message = "container id type should be number";
                    return res.status(403).json(ErrorResponse.H010);
                }
            }
        }
    }
    next();
}
module.exports = {
    validateCreateApiContent,
    validateBoxingApiContent,
    validateStockApiContent,
    validateChangeStateApiContent,
    validateSignApiContent,
    validateModifyApiContent,
    fetchBoxCreation
};

let BoxContentType = Object.freeze({
    order: 'boxOrderContent',
    changeState: 'change state'
});

function validateBoxListContent(element, boxContentType, contents) {
    for (let index in contents) {
        if (!(contents[index] in element)) {
            return {
                bool: false,
                code: 'H002',
            };
        }
    }
    if (boxContentType === BoxContentType.order || boxContentType === BoxContentType.deliver) {
        if (!Array.isArray(element[boxContentType])) {
            return {
                bool: false,
                code: 'H003',
            };
        } else if (element[boxContentType].length !== 0) {
            let boxContent = element[boxContentType];
            for (let element of boxContent) {
                if (!('containerType' in element) || !('amount' in element)) {
                    return {
                        bool: false,
                        code: 'H005_1',
                    };
                } else if (
                    typeof element.containerType !== 'string' ||
                    typeof element.amount !== 'number'
                ) {
                    return {
                        bool: false,
                        code: 'H005_2',
                    };
                }
            }
            return {
                bool: true,
            };
        } else {
            return {
                bool: true,
            };
        }
    }
    return {
        bool: true,
    };
}