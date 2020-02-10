const BoxStatus = require('../models/enums/boxEnum').BoxStatus;
const BoxAction = require('../models/enums/boxEnum').BoxAction;
const Category = require('../models/enums/storeEnum').Category;
const ContainerAction = require('../models/enums/containerEnum').Action;
const ProgramStatus = require('../models/enums/programEnum').ProgramStatus;
const StateChangingError = require('../models/enums/programEnum').StateChangingError;
const changeContainersState = require('./containerTrade');
const DataCacheFactory = require('../models/dataCacheFactory');

const validChange = {
    Box2Stock: [BoxStatus.Boxing, BoxStatus.Stocked],
    Box2Deliver: [BoxStatus.Boxing, BoxStatus.Delivering],
    Deliver2Box: [BoxStatus.Delivering, BoxStatus.Boxing],
    Sign2Stock: [BoxStatus.Signed, BoxStatus.Stocked],
    Stock2Box: [BoxStatus.Stocked, BoxStatus.Boxing],
    // Sign2Archive: [BoxStatus.Signed, BoxStatus.Archived],
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
        const missingArgList = checkMissingArgument(element, ["stationID"]);
        if (missingArgList.length !== 0)
            return Promise.resolve({
                status: ProgramStatus.Error,
                errorType: StateChangingError.MissingArg,
                argumentNameList: missingArgList
            });
        const stationID = element.stationID;
        let info = {
            status: BoxStatus.Stocked,
            stationID,
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Stocked,
                    boxAction: BoxAction.Stock,
                    stationID,
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
        };
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
        };
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            info,
            validatedStateChanging
        });
    } else if (validatedStateChanging === validChange.Sign2Stock) {
        let stationID = null;
        for (let i = box.action.length - 1; i >= 0; i--) {
            if (typeof box.action[i].stationID !== "undefined") {
                stationID = box.action[i].stationID;
                break;
            }
        }
        if (stationID === null)
            return Promise.resolve({
                status: ProgramStatus.Error,
                errorType: StateChangingError.Unknown,
                message: `Element [stationID] can't be found in box's[${box.boxID}] action list`
            });
        let info = {
            status: BoxStatus.Stocked,
            stationID,
            dueDate: Date.now(),
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Stocked,
                    boxAction: BoxAction.Stock,
                    stationID,
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
    } else if (validatedStateChanging === validChange.Stock2Box) {
        const validationResult = validateStoreID(element, Category.Store);
        if (!validationResult.valid) {
            const reply = {
                status: ProgramStatus.Error
            };
            delete validationResult.valid;
            Object.assign(reply, validationResult);
            return Promise.resolve(reply);
        }
        const storeID = validationResult.storeID;
        let info = {
            status: BoxStatus.Boxing,
            storeID,
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Boxing,
                    boxAction: BoxAction.Deliver,
                    storeID,
                    timestamps: Date.now()
                }
            }
        };
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            box,
            info,
            validatedStateChanging
        });
        // } else if (validatedStateChanging === validChange.Sign2Archive) {
        //     return Promise.resolve({
        //         status: ProgramStatus.Success,
        //         message: "State is validate, update box after change container successfully",
        //         validatedStateChanging
        //     });
    } else if (validatedStateChanging === validChange.Deliver2Sign) {
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
        const missingArgList = checkMissingArgument(element, ["stationID"]);
        if (missingArgList.length !== 0)
            return Promise.resolve({
                status: ProgramStatus.Error,
                errorType: StateChangingError.MissingArg,
                argumentNameList: missingArgList
            });
        const stationID = element.stationID;
        let info = {
            status: BoxStatus.Dispatching,
            stationID,
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Dispatching,
                    boxAction: BoxAction.Dispatch,
                    stationID,
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
        const missingArgList = checkMissingArgument(element, ["boxAction"]);
        if (missingArgList.length !== 0)
            return Promise.resolve({
                status: ProgramStatus.Error,
                errorType: StateChangingError.MissingArg,
                argumentNameList: missingArgList
            });

        let info;
        let stationID = null;
        let boxAction = element.boxAction;
        if (boxAction === BoxAction.AcceptDispatch) {
            info = {
                status: BoxStatus.Stocked,
                $push: {
                    action: {
                        phone: phone,
                        boxStatus: BoxStatus.Stocked,
                        boxAction,
                        timestamps: Date.now()
                    }
                }
            };
        } else if (boxAction === BoxAction.CancelArrival) {
            for (let i = box.action.length - 2; i >= 0; i--) {
                if (typeof box.action[i].stationID !== "undefined") {
                    stationID = box.action[i].stationID;
                    break;
                }
            }
            if (stationID === null)
                return Promise.resolve({
                    status: ProgramStatus.Error,
                    errorType: StateChangingError.Unknown,
                    message: `Element [stationID] can't be found in box's[${box.boxID}] action list`
                });
            info = {
                status: BoxStatus.Stocked,
                stationID,
                $push: {
                    action: {
                        phone: phone,
                        stationID,
                        boxStatus: BoxStatus.Stocked,
                        boxAction,
                        timestamps: Date.now()
                    }
                }
            };
        } else {
            return Promise.resolve({
                status: ProgramStatus.Error,
                errorType: StateChangingError.ArgumentInvalid,
                message: `Arguments [boxAction] should be ${BoxAction.Sign} or ${BoxAction.CancelArrival}`
            });
        }
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
        changeContainersState(aBox.containerList, dbAdmin, {
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
        });
    } else if (validatedStateChanging === validChange.Deliver2Box) {
        changeContainersState(aBox.containerList, dbAdmin, {
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
        });
    } else if (validatedStateChanging === validChange.Sign2Stock) {
        changeContainersState(aBox.containerList, dbAdmin, {
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
        });
    } else if (validatedStateChanging === validChange.Deliver2Sign) {
        changeContainersState(aBox.containerList, dbAdmin, {
            action: ContainerAction.SIGN,
            newState: 1
        }, {
            boxID,
            storeID
        }, async (err, tradeSuccess, reply) => {
            if (err)
                return Promise.reject(err);
            if (!tradeSuccess)
                return Promise.resolve({
                    status: ProgramStatus.Error,
                    message: reply
                });
            await aBox.update(boxInfo).exec();
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Changing Container State successfully"
            });
        });
    } else if (validatedStateChanging === validChange.Stock2Box ||
        validatedStateChanging === validChange.Box2Stock ||
        validatedStateChanging === validChange.Stock2Dispatch ||
        validatedStateChanging === validChange.Dispatch2Stock) {
        await aBox.update(boxInfo).exec();
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "Changing Container State successfully"
        });
        // } else if (validatedStateChanging === validChange.Sign2Archive) {
        //     await aBox.remove();
        //     return Promise.resolve({
        //         status: ProgramStatus.Success,
        //         message: "Changing Container State successfully"
        //     });
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

function checkStoreIs(storeID, category) {
    const storeDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    return storeDict[storeID].category === category;
}




function validateStoreID(element, category) {
    const missingArgList = checkMissingArgument(element, ["destinationStoreId"]);
    if (missingArgList.length !== 0)
        return {
            valid: false,
            errorType: StateChangingError.MissingArg,
            argumentNameList: missingArgList
        };
    const storeID = element.destinationStoreId;
    const storeIsStorage = checkStoreIs(storeID, category);
    if (!storeIsStorage)
        return {
            valid: false,
            errorType: StateChangingError.ArgumentInvalid,
            message: `Arguments [storeID] should represent a ${category}`
        };
    return {
        valid: true,
        storeID
    };
}