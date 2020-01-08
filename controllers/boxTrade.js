const BoxStatus = require('../models/enums/boxEnum').BoxStatus;
const BoxAction = require('../models/enums/boxEnum').BoxAction;
const ContainerAction = require('../models/enums/containerEnum').Action;
const ProgramStatus = require('../models/enums/programEnum').ProgramStatus;
const StateChangingError = require('../models/enums/programEnum').StateChangingError;
const changeContainersState = require('./containerTrade');

const validChange = {
    Box2Stock: [BoxStatus.Boxing, BoxStatus.Stocked],
    Box2Deliver: [BoxStatus.Boxing, BoxStatus.Delivering],
    Deliver2Box: [BoxStatus.Delivering, BoxStatus.Boxing],
    Sign2Stock: [BoxStatus.Signed, BoxStatus.Stocked],
    Stock2Box: [BoxStatus.Stocked, BoxStatus.Boxing],
    Sign2Archive: [BoxStatus.Signed, BoxStatus.Archived],
    Deliver2Sign: [BoxStatus.Delivering, BoxStatus.Signed],
    Stock2Dispatch: [BoxStatus.Stocked, BoxStatus.Dispatching],
    Dispatch2Stock: [BoxStatus.Dispatching, BoxStatus.Stocked]
};

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
    let validatedStateChanging = checkStateChanging(stateChanging);
    if (!validatedStateChanging)
        return Promise.resolve({
            status: ProgramStatus.Error,
            errorType: StateChangingError.InvalidStateChanging
        });

    if (validatedStateChanging === validChange.Box2Stock) {
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
            validatedStateChanging
        });
    } else if (validatedStateChanging === validChange.Box2Deliver) {
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
            validatedStateChanging
        });
    } else if (validatedStateChanging === validChange.Deliver2Box) {
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
            validatedStateChanging
        });
    } else if (validatedStateChanging === validChange.Sign2Stock) {
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
            validatedStateChanging
        });
    } else if (validatedStateChanging === validChange.Stock2Box) {
        const missingArgList = checkMissingArgument(["destinationStoreId"]);
        if (missingArgList.length !== 0)
            return Promise.resolve({
                status: ProgramStatus.Error,
                errorType: StateChangingError.MissingArg,
                argumentNameList: missingArgList
            });
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
            validatedStateChanging
        });
    } else if (validatedStateChanging === validChange.Sign2Archive) {
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            validatedStateChanging
        });
    } else if (validatedStateChanging === validChange.Sign2Archive) {
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
        };
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            info,
            validatedStateChanging
        });
    } else if (validatedStateChanging === validChange.Stock2Dispatch) {
        let info = {
            status: BoxStatus.Dispatching,
            storeID: element.destinationStoreId, //??
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Dispatching,
                    boxAction: BoxAction.Dispatch, //??
                    timestamps: Date.now()
                }
            }
        };
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            info,
            validatedStateChanging
        });
    } else if (validatedStateChanging === validChange.Dispatch2Stock) {
        const missingArgList = checkMissingArgument(["boxAction"]);
        if (missingArgList.length !== 0)
            return Promise.resolve({
                status: ProgramStatus.Error,
                errorType: StateChangingError.MissingArg,
                argumentNameList: missingArgList
            });
        if (element.boxAction !== BoxAction.Sign || element.boxAction !== BoxAction.CancelArrival)
            return Promise.resolve({
                status: ProgramStatus.Error,
                errorType: StateChangingError.ArgumentInvalid,
                message: `Arguments [boxAction] should be ${BoxAction.Sign} or ${BoxAction.CancelArrival}`
            });
        let info = {
            status: BoxStatus.Stocked,
            storeID: element.destinationStoreId, //??
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Stocked,
                    boxAction: element.boxAction,
                    timestamps: Date.now()
                }
            }
        };
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            info,
            validatedStateChanging
        });
    }
}

let containerStateFactory = async function (validatedStateChanging, aBox, dbAdmin, boxInfo) {
    let boxID = aBox.boxID;
    let storeID = aBox.storeID;

    if (validatedStateChanging === validChange.Box2Deliver) {
        changeContainersState(
            aBox.containerList, dbAdmin, {
                action: ContainerAction.DELIVERY,
                newState: 0,
            }, {
                boxID,
                storeID,
            }, async (err, tradeSuccess, reply) => {
                if (err)
                    return Promise.reject(err);
                if (!tradeSuccess)
                    return Promise.resolve({
                        status: ProgramStatus.Error,
                        message: reply
                    });
                aBox.delivering = true;
                aBox.stocking = false;
                aBox.user.delivery = dbAdmin.user.phone;
                await aBox.update(boxInfo).exec();
                await aBox.save();
                return Promise.resolve({
                    status: ProgramStatus.Success,
                    message: "Changing Container State successfully"
                });
            }
        );
    } else if (validatedStateChanging === validChange.Deliver2Box) {
        changeContainersState(
            aBox.containerList, dbAdmin, {
                action: ContainerAction.CANCEL_DELIVERY,
                newState: 5
            }, {
                bypassStateValidation: true,
            }, async (err, tradeSuccess, reply) => {
                if (err)
                    return Promise.reject(err);
                if (!tradeSuccess)
                    return Promise.resolve({
                        status: ProgramStatus.Error,
                        message: reply
                    });
                aBox.delivering = false;
                aBox.user.delivery = undefined;
                await aBox.update(boxInfo).exec();
                await aBox.save();
                return Promise.resolve({
                    status: ProgramStatus.Success,
                    message: "Changing Container State successfully"
                });
            }
        );
    } else if (validatedStateChanging === validChange.Sign2Stock) {
        changeContainersState(
            aBox.containerList, dbAdmin, {
                action: ContainerAction.UNSIGN,
                newState: 5
            }, {
                bypassStateValidation: true,
            }, async (err, tradeSuccess, reply) => {
                if (err)
                    return Promise.reject(err);
                if (!tradeSuccess)
                    return Promise.resolve({
                        status: ProgramStatus.Error,
                        message: reply
                    });
                aBox.delivering = false;
                aBox.user.delivery = undefined;
                aBox.stocking = true;
                await aBox.update(boxInfo).exec();
                await aBox.save();
                return Promise.resolve({
                    status: ProgramStatus.Success,
                    message: "Changing Container State successfully"
                });
            }
        );
    } else if (validatedStateChanging === validChange.Stock2Box ||
        validatedStateChanging === validChange.Box2Stock ||
        validatedStateChanging === validChange.Deliver2Sign) {
        await aBox.update(boxInfo).exec();
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "Changing Container State successfully"
        });
    } else if (validatedStateChanging === validChange.Sign2Archive) {
        await aBox.remove();
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "Changing Container State successfully"
        });
    }
}

module.exports = {
    checkStateChanging,
    changeStateProcess,
    containerStateFactory
};

function checkMissingArgument(obj, argNameList) {
    const missingArgList = [];
    for (let aArgName of argNameList) {
        if (!obj.hasOwnProperty(aArgName))
            missingArgList.push(aArgName);
    }
    return missingArgList;
}