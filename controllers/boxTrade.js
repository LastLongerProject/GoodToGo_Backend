const BoxStatus = require('../models/enums/boxEnum').BoxStatus;
const BoxAction = require('../models/enums/boxEnum').BoxAction;
const ContainerAction = require('../models/enums/containerTransactionEnum').Action;
const ProgramStatus = require('../models/enums/programEnum').ProgramStatus;
const BoxSaveType = require('../models/enums/programEnum').BoxSaveType;
const changeContainersState = require('./containerTrade');

const validChange = [
    [BoxStatus.Boxing, BoxStatus.Stocked],
    [BoxStatus.Boxing, BoxStatus.Delivering],
    [BoxStatus.Delivering, BoxStatus.Boxing],
    [BoxStatus.Signed, BoxStatus.Stocked],
    [BoxStatus.Stocked, BoxStatus.Boxing],
    [BoxStatus.Signed, BoxStatus.Archived],
    [BoxStatus.Delivering, BoxStatus.Signed]
];

let checkStateChanging = function (stateChanging) {
    for (let element of validChange) {
        if (stateChanging[0] === element[0] && stateChanging[1] === element[1]) {
            return element;
        }
    }
    return false;
}

let changeStateProcess = async function (element, box, phone) {
    const newState = element.newState;
    let stateChanging = [box.status, newState];
    let result = checkStateChanging(stateChanging);
    if (!result) return Promise.resolve({
        status: ProgramStatus.Error,
        message: "invalid box state changing"
    });

    if (result === validChange[0]) {
        let info = {
            status: BoxStatus.Stocked,
            storeID: 99999,
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Stocked,
                    boxAction: BoxAction.Stock,
                    timestamps: Date.now()
                }
            }
        }
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            info,
            type: BoxSaveType.Update
        });
    } else if (result === validChange[1]) {
        let info = {
            status: BoxStatus.Delivering,
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Delivering,
                    boxAction: BoxAction.Arrival,
                    timestamps: Date.now()
                }
            }
        }
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            info,
            type: BoxSaveType.Update
        });
    } else if (result === validChange[2]) {
        let info = {
            status: BoxStatus.Boxing,
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Boxing,
                    boxAction: BoxAction.CancelArrival,
                    timestamps: Date.now()
                }
            }
        }
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            info,
            type: BoxSaveType.Update
        });
    } else if (result === validChange[3]) {
        let info = {
            status: BoxStatus.Stocked,
            storeID: 99999,
            dueDate: Date.now(),
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Stocked,
                    boxAction: BoxAction.Stock,
                    timestamps: Date.now()
                }
            }
        }
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            info,
            type: BoxSaveType.Update
        });
    } else if (result === validChange[4]) {
        let info = {
            status: BoxStatus.Boxing,
            storeID: element.destinationStoreId,
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Boxing,
                    boxAction: BoxAction.Deliver,
                    timestamps: Date.now()
                }
            }
        }
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            box,
            info,
            type: BoxSaveType.Update
        });
    } else if (result === validChange[5]) {
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            type: BoxSaveType.Remove
        });
    } else if (result === validChange[6]) {
        let info = {
            status: BoxStatus.Signed,
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Signed,
                    boxAction: BoxAction.Sign,
                    timestamps: Date.now()
                }
            }
        }
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            info,
            type: BoxSaveType.Update
        });
    }
}

let containerStateFactory = async function (newState, aBox, dbAdmin, boxInfo, res, next) {
    let boxID = aBox.boxID;
    let storeID = aBox.storeID;

    if (aBox.status === BoxStatus.Boxing && newState === BoxStatus.Delivering) {
        changeContainersState(
            aBox.containerList,
            dbAdmin, {
                action: ContainerAction.DELIVERY,
                newState: 0,
            }, {
                boxID,
                storeID,
            },
            async (err, tradeSuccess, reply) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(reply);
                aBox.delivering = true;
                aBox.stocking = false;
                aBox.user.delivery = dbAdmin.user.phone;
                await aBox.update(boxInfo).exec();
                await aBox.save();

                return res.status(200).json({
                    type: "ChangeStateMessage",
                    message: "Change state successfully"
                });
            }
        );
    }

    if (aBox.status === BoxStatus.Delivering && newState === BoxStatus.Boxing) {
        changeContainersState(
            aBox.containerList,
            dbAdmin, {
                action: ContainerAction.CANCEL_DELIVERY,
                newState: 5
            }, {
                bypassStateValidation: true,
            },
            async (err, tradeSuccess, reply) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(reply);
                aBox.delivering = false;
                aBox.user.delivery = undefined;
                await aBox.update(boxInfo).exec();
                await aBox.save();
                return res.status(200).json({
                    type: "ChangeStateMessage",
                    message: "Change state successfully"
                });
            }
        );
    }

    if (aBox.status === BoxStatus.Signed && newState === BoxStatus.Stocked) {
        changeContainersState(
            aBox.containerList,
            dbAdmin, {
                action: ContainerAction.UNSIGN,
                newState: 5
            }, {
                bypassStateValidation: true,
            },
            async (err, tradeSuccess, reply) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(reply);
                aBox.delivering = false;
                aBox.user.delivery = undefined;
                aBox.stocking = true;
                await aBox.update(boxInfo).exec();
                await aBox.save();
                return res.status(200).json({
                    type: "ChangeStateMessage",
                    message: "Change state successfully"
                });
            }
        );
    }

    if (aBox.status === BoxStatus.Stocked && newState === BoxStatus.Boxing) {
        await aBox.update(boxInfo).exec();

        return res.status(200).json({
            type: "ChangeStateMessage",
            message: "Change state successfully"
        });
    }

    if (aBox.status === BoxStatus.Signed && newState === BoxStatus.Archived) {
        await aBox.remove();
        return res.status(200).json({
            type: "ChangeStateMessage",
            message: "Change state successfully"
        });
    }

    if (aBox.status === BoxStatus.Boxing && newState === BoxStatus.Stocked) {
        await aBox.update(boxInfo).exec();

        return res.status(200).json({
            type: "ChangeStateMessage",
            message: "Change state successfully"
        });
    }

    if (aBox.status === BoxStatus.Delivering && newState === BoxStatus.Signed) {
        await aBox.update(boxInfo).exec();

        return res.status(200).json({
            type: "SignMessage",
            message: "Sign successfully"
        });
    }
}

module.exports = {
    checkStateChanging,
    changeStateProcess,
    containerStateFactory
};