const timeFormatter = require('@lastlongerproject/toolkit').timeFormatter;
const fullDateString = require('@lastlongerproject/toolkit').fullDateString;
const Box = require('../../../models/DB/boxDB');
const BoxStatus = require('../../../models/variables/boxEnum.js').BoxStatus;
const ErrorResponse = require('../../../models/variables/error.js')
    .ErrorResponse;

function validateCreateApiContent(req, res, next) {
    let boxArray = [];
    let boxIDs = [];
    let boxList = req.body.boxList;
    let date = new Date();
    let listID =
        fullDateString(date).replace(/\//g, '') +
        '' +
        timeFormatter(date).replace(/\:/g, '');
    if (boxList === undefined || !Array.isArray(boxList)) {
        return res.status(403).json(ErrorResponse.H001_1);
    } else if (req.body.phone === undefined)
        return res.status(403).json(ErrorResponse.H001_2);

    for (let element of boxList) {
        let pass = validateBoxListContent(element, BoxContentType.order, [
            'boxName',
            'boxOrderContent',
            'dueDate',
        ]);

        if (!pass.bool) {
            return res.status(403).json(ErrorResponse[pass.code]);
        } else {
            let boxID = listID + '_' + String(index);
            let box = new Box({
                boxID: boxID,
                boxName: element.boxName,
                boxOrderContent: element.boxOrderContent,
                dueDate: element.dueDate,
                destinationStoreID: parseInt(req.params.destinationStoreID),
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
    if (boxList === undefined || !Array.isArray(boxList)) {
        return res.status(403).json(ErrorResponse.H001_1);
    } else if (req.body.phone === undefined)
        return res.status(403).json(ErrorResponse.H001_2);

    for (let element of boxList) {
        let pass = validateBoxListContent(element, BoxContentType.deliver, [
            'boxName',
            'boxDeliverContent',
            'containerList',
        ]);

        if (!pass.bool) {
            return res.status(403).json(ErrorResponse[pass.code]);
        } else {
            let boxID = listID + '_' + String(index);
            let date = new Date();
            date.addDays(99999);
            let box = new Box({
                boxID: boxID,
                boxName: element.boxName,
                boxOrderContent: element.boxDeliverContent,
                boxDeliverContent: element.boxDeliverContent,
                dueDate: date,
                destinationStoreID: 99999,
                action: [{
                    phone: req.body.phone,
                    boxStatus: BoxStatus.Boxing,
                    timestamps: Date.now(),
                }, ],
                user: {
                    box: req.body.phone,
                },
                status: BoxStatus.Stocked,
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

module.exports = {
    validateCreateApiContent,
    validateBoxingApiContent,
    validateStockApiContent,
};

let BoxContentType = Object.freeze({
    order: 'boxOrderContent',
    deliver: 'boxDeliverContent',
});

function validateBoxListContent(element, boxContentType, contents) {
    for (let index in contents) {
        if (!(contents[index] in element)) {
            console.log(contents[index]);
            return {
                bool: false,
                code: 'H002',
            };
        }
    }

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