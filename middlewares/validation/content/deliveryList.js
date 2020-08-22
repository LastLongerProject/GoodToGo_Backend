const dayFormatter = require('../../../helpers/toolkit').dayFormatter;
const monthFormatter = require('../../../helpers/toolkit').monthFormatter;
const intReLength = require('../../../helpers/toolkit').intReLength;
const Box = require('../../../models/DB/boxDB');
const BoxStatus = require('../../../models/enums/boxEnum').BoxStatus;
const BoxAction = require('../../../models/enums/boxEnum').BoxAction;
const RoleElement = require('../../../models/enums/userEnum').RoleElement;
const ErrorResponse = require('../../../models/enums/error').ErrorResponse;
const DataCacheFactory = require("../../../models/dataCacheFactory");
const getDeliverContent = require('../../../helpers/tools.js').getDeliverContent;
const getContainerHash = require('../../../helpers/tools').getContainerHash;
const isSameDay = require('../../../helpers/toolkit').isSameDay;
const redis = require("../../../models/redis");

const queue = require('queue')({
    concurrency: 1,
    autostart: true
});

let fullDateStringWithoutYear = function (date) {
    const dayFormatted = intReLength(dayFormatter(date), 2);
    const monthFormatted = intReLength(monthFormatter(date), 2);

    return monthFormatted + "/" + dayFormatted;
}

function createBoxID(date, sequence, stationID) {
    let dateString = fullDateStringWithoutYear(date).replace(/\//g, '');
    return dateString + String(stationID) + intReLength(sequence, 2);
}

function fetchBoxCreation(req, res, next) {
    queue.push((cb) => {
        redis.get("delivery_box_creation_amount", (error, string) => {
            let dict = JSON.parse(string || "{}");
            let now = new Date();
            now.setDate(now.getDate() + 8);
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
    const dbUser = req._user;
    const phone = dbUser.user.phone;
    const dbRole = req._thisRole;
    let thisStationID;
    try {
        thisStationID = dbRole.getElement(RoleElement.STATION_ID, false);
    } catch (error) {
        return next(error);
    }

    let boxList = req.body.boxList;
    const storeID = parseInt(req.params.storeID);
    if (boxList === undefined || !Array.isArray(boxList))
        return res.status(403).json(ErrorResponse.H001_1);

    let date = new Date();
    let listID = fullDateStringWithoutYear(date).replace(/\//g, '');
    let index = req._sequence || 1;

    let boxArray = [];
    let boxIDs = [];
    if (!stationIsBoxable(thisStationID))
        return res.status(403).json(ErrorResponse.H013);
    for (let element of boxList) {
        let pass = validateBoxContent(element, BoxContentType.order, [
            'boxName',
            'boxOrderContent',
            'dueDate'
        ]);

        if (!pass.bool)
            return res.status(403).json(ErrorResponse[pass.code]);
        let boxID = parseInt(createBoxID(date, index++, thisStationID));
        let box = new Box({
            boxID: boxID,
            boxName: element.boxName,
            boxOrderContent: element.boxOrderContent,
            containerHash: getContainerHash(element.boxOrderContent, true),
            dueDate: element.dueDate,
            storeID,
            stationID: thisStationID,
            action: [{
                phone,
                storeID: {
                    from: null,
                    to: storeID
                },
                destinationStoreId: storeID,
                stationID: {
                    from: null,
                    to: thisStationID
                },
                boxStatus: BoxStatus.Created,
                boxAction: BoxAction.Create,
                timestamps: Date.now(),
            }],
            user: {
                box: phone
            },
            status: BoxStatus.Created,
        });
        boxArray.push(box);
        boxIDs.push(boxID);
    }
    req._listID = listID;
    req._boxArray = boxArray;
    req._boxIDs = boxIDs;
    next();
}

function validateStockApiContent(req, res, next) {
    let boxContent = req.body.boxContent;
    let date = new Date();
    let index = req._sequence || 1;

    const dbUser = req._user;
    const phone = dbUser.user.phone;
    const dbRole = req._thisRole;
    let thisStationID;
    try {
        thisStationID = dbRole.getElement(RoleElement.STATION_ID, false);
    } catch (error) {
        return next(error);
    }

    let pass = validateBoxContent(boxContent, null, [
        'boxName',
        'containerList'
    ]);
    if (!pass.bool)
        return res.status(403).json(ErrorResponse[pass.code]);
    if (!stationIsBoxable(thisStationID))
        return res.status(403).json(ErrorResponse.H013);

    let boxID = parseInt(createBoxID(date, index++, thisStationID));
    let orderContent = getDeliverContent(boxContent.containerList);
    let box = new Box({
        boxID,
        boxName: boxContent.boxName,
        dueDate: Date.now(),
        storeID: null,
        stationID: thisStationID,
        boxOrderContent: orderContent,
        containerList: boxContent.containerList,
        containerHash: getContainerHash(boxContent.containerList),
        action: [{
            phone,
            stationID: {
                from: null,
                to: thisStationID
            },
            boxStatus: BoxStatus.Created,
            boxAction: BoxAction.Create,
            timestamps: Date.now(),
        }, {
            phone,
            boxStatus: BoxStatus.Boxing,
            boxAction: BoxAction.Pack,
            timestamps: Date.now(),
        }, {
            phone,
            boxStatus: BoxStatus.Stocked,
            boxAction: BoxAction.Stock,
            timestamps: Date.now()
        }],
        user: {
            box: phone
        },
        status: BoxStatus.Stocked,
    });

    req._box = box;
    next();
}

function validateBoxingApiContent(req, res, next) {
    let boxContent = req.body.boxContent;
    let pass = validateBoxContent(boxContent, null, [
        'comment',
        'containerList'
    ]);
    if (!pass.bool) {
        return res.status(403).json(ErrorResponse[pass.code]);
    }
    next();
}

function validateChangeStateApiContent(req, res, next) {
    let boxContent = req.body.boxContent;
    let pass = validateBoxContent(boxContent, BoxContentType.changeState, [
        'newState',
    ]);
    if (!pass.bool) {
        return res.status(403).json(ErrorResponse[pass.code]);
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

function validateBoxStatus(req, res, next) {
    let boxStatus = req.params.boxStatus || req.query.boxStatus

    if (boxStatus === undefined) {
        return res.status(422).json(ErrorResponse.F016_1)
    }

    const isArray = Array.isArray(boxStatus)
    if ((isArray && boxStatus.includes(status => !Object.values(BoxStatus).includes(status))) ||
        (!isArray && !Object.values(BoxStatus).includes(boxStatus))) {
        return res.status(422).json(ErrorResponse.F016_2)
    }

    next()
}

module.exports = {
    validateCreateApiContent,
    validateBoxingApiContent,
    validateStockApiContent,
    validateChangeStateApiContent,
    validateModifyApiContent,
    validateBoxStatus,
    fetchBoxCreation
};

let BoxContentType = Object.freeze({
    order: 'boxOrderContent',
    changeState: 'change state'
});

function validateBoxContent(element, boxContentType, contents) {
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

function stationIsBoxable(stationID) {
    const stationDict = DataCacheFactory.get(DataCacheFactory.keys.STATION);
    return stationDict[stationID].boxable;
}