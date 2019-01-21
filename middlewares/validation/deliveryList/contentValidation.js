const timeFormatter = require('@lastlongerproject/toolkit').timeFormatter;
const fullDateStringWithoutYear = require('@lastlongerproject/toolkit').fullDateStringWithoutYear;
const Box = require('../../../models/DB/boxDB');
const BoxStatus = require('../../../models/variables/boxEnum.js').BoxStatus;
const ErrorResponse = require('../../../models/variables/error.js')
    .ErrorResponse;
const DataCacheFactory = require("../../../models/dataCacheFactory");

function validateCreateApiContent(req, res, next) {
    let boxArray = [];
    let boxIDs = [];
    let boxList = req.body.boxList;
    let date = new Date();
    let listID =
        fullDateStringWithoutYear(date).replace(/\//g, '') +
        '' +
        timeFormatter(date).replace(/\:/g, '');
    let index = 0;
    if (boxList === undefined || !Array.isArray(boxList)) {
        return res.status(403).json(ErrorResponse.H001_1);
    } else if (req.body.phone === undefined)
        return res.status(403).json(ErrorResponse.H001_2);

    for (let element of boxList) {
        index++;
        let pass = validateBoxListContent(element, BoxContentType.order, [
            'boxName',
            'boxOrderContent',
            'dueDate'
        ]);

        if (!pass.bool) {
            return res.status(403).json(ErrorResponse[pass.code]);
        } else {
            let boxID = parseInt(listID + String(index));
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
    let listID =
        fullDateString(date).replace(/\//g, '') +
        '' +
        timeFormatter(date).replace(/\:/g, '');
    let index = 0;
    if (boxList === undefined || !Array.isArray(boxList)) {
        return res.status(403).json(ErrorResponse.H001_1);
    } else if (req.body.phone === undefined)
        return res.status(403).json(ErrorResponse.H001_2);

    for (let element of boxList) {
        index++;
        let pass = validateBoxListContent(element, BoxContentType.deliver, [
            'boxName',
            'boxDeliverContent',
            'containerList'
        ]);

        if (!pass.bool) {
            return res.status(403).json(ErrorResponse[pass.code]);
        } else {
            let boxID = parseInt(listID + String(index));

            let box = new Box({
                boxID: boxID,
                boxName: element.boxName,
                boxOrderContent: element.boxDeliverContent,
                boxDeliverContent: element.boxDeliverContent,
                dueDate: Date.now(),
                storeID: 99999,
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
            boxArray.push(box);
            boxIDs.push(boxID);
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
        let pass = validateBoxListContent(element, BoxContentType.deliver, [
            'boxDeliverContent',
            'comment',
            'containerList',
            'boxId',
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
            "id"
        ]);

        if (!pass.bool) {
            return res.status(403).json(ErrorResponse[pass.code]);
        }
    }

    next();
}

function validateModifyApiContent(req, res, next) {
    let body = req.body;
    let modifiable = ["boxName", "storeID", "dueDate", "boxOrderContent", "boxDeliverContent", "containerList", "comment"];
    for (let key of Object.keys(body)) {
        if (modifiable.indexOf(key) === -1) return res.status(403).json(ErrorResponse.H009);
        if ((key === 'boxName' && typeof body['boxName'] !== 'string') ||
            (key === 'storeID' && typeof body['storeID'] !== 'number') ||
            (key === 'dueDate' && typeof body['dueDate'] !== 'string') ||
            (key === 'boxOrderContent' && !Array.isArray(body['boxOrderContent'])) ||
            (key === 'boxDeliverContent' && !Array.isArray(body['boxDeliverContent'])) ||
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
                } else if (!('containerType' in content) || typeof content['containerType'] !== 'number') {
                    ErrorResponse.H010.message = "missing containerType or its type is not Number";
                    return res.status(403).json(ErrorResponse.H010);
                }
            }
        }
        if (key === 'boxDeliverContent' || key === 'containerList') {
            if (!body['containerList'] || !body['boxDeliverContent']) return res.status(403).json(ErrorResponse.H012);

            if (key === "containerList") {
                let containerType = DataCacheFactory.get('containerType');
                let containerList = DataCacheFactory.get('containerWithDeactive');
                let containerCodeAndName = {};
                for (let key of Object.keys(containerType)) {
                    containerCodeAndName[containerType[key].name] = key;
                }

                for (let container of body['containerList']) {
                    if (typeof container !== 'number') {
                        ErrorResponse.H010.message = "container id type should be number";
                        return res.status(403).json(ErrorResponse.H010);
                    }
                }

                let deliverContent = {};
                for (let content of body['boxDeliverContent']) {
                    if (!('amount' in content) || typeof content['amount'] !== 'number') {
                        ErrorResponse.H010.message = "missing amount or its type is not Number";
                        return res.status(403).json(ErrorResponse.H010);
                    } else if (!('containerType' in content) || typeof content['containerType'] !== 'number') {
                        ErrorResponse.H010.message = "missing containerType or its type is not Number";
                        return res.status(403).json(ErrorResponse.H010);
                    }
                    deliverContent[content['containerType']] = content['amount'];
                }

                let deliverContentInContainerList = {};
                for (let container of body['containerList']) {
                    let name = containerList[String(container)];
                    let key = containerCodeAndName[name];
                    if (!deliverContentInContainerList[key]) deliverContentInContainerList[key] = 0;
                    deliverContentInContainerList[key]++;
                }

                for (let key of Object.keys(deliverContentInContainerList)) {
                    if (deliverContent[key] !== deliverContentInContainerList[key]) {
                        return res.status(403).json(ErrorResponse.H012);
                    }
                }

                for (let key of Object.keys(deliverContent)) {
                    if (deliverContent[key] !== deliverContentInContainerList[key]) {
                        return res.status(403).json(ErrorResponse.H012);
                    }
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
    validateModifyApiContent
};

let BoxContentType = Object.freeze({
    order: 'boxOrderContent',
    deliver: 'boxDeliverContent',
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
                    typeof element.containerType !== 'number' ||
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