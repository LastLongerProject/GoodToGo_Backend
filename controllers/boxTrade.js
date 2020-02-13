const BoxStatus = require('../models/enums/boxEnum').BoxStatus;
const BoxAction = require('../models/enums/boxEnum').BoxAction;
const Category = require('../models/enums/storeEnum').Category;
const ProgramStatus = require('../models/enums/programEnum').ProgramStatus;
const ContainerAction = require('../models/enums/containerEnum').Action;
const ContainerState = require('../models/enums/containerEnum').State;
const StateChangingError = require('../models/enums/programEnum').StateChangingError;

const changeContainersState = require('./containerTrade');
const DataCacheFactory = require('../models/dataCacheFactory');

const checkStoreIsInArea = require("../helpers/tools").checkStoreIsInArea;

const validChange = {
    Box2Stock: [BoxStatus.Boxing, BoxStatus.Stocked],
    Box2Deliver: [BoxStatus.Boxing, BoxStatus.Delivering],
    Deliver2Box: [BoxStatus.Delivering, BoxStatus.Boxing],
    Sign2Stock: [BoxStatus.Signed, BoxStatus.Stocked],
    Stock2Box: [BoxStatus.Stocked, BoxStatus.Boxing],
    // Sign2Archive: [BoxStatus.Signed, BoxStatus.Archived],
    Deliver2Sign: [BoxStatus.Delivering, BoxStatus.Signed],
    Stock2Dispatch: [BoxStatus.Stocked, BoxStatus.Dispatching],
    Dispatch2Stock: [BoxStatus.Dispatching, BoxStatus.Stocked],
    Box2Dispatch: [BoxStatus.Boxing, BoxStatus.Dispatching]
};

let checkStateChanging = function (stateChanging) {
    for (let element of Object.values(validChange)) {
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
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Stocked,
                    boxAction: BoxAction.Stock,
                    timestamps: Date.now()
                }
            }
        };
        removeStoreIDfromBox(box, info);
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            info,
            validatedStateChanging
        });
    } else if (validatedStateChanging === validChange.Box2Deliver) {
        if (box.storeID === null)
            return Promise.reject({
                status: ProgramStatus.Error,
                errorType: StateChangingError.MissingArg,
                message: "StoreID is not assign yet"
            });
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
        let info = {
            status: BoxStatus.Stocked,
            dueDate: Date.now(),
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Stocked,
                    boxAction: BoxAction.Stock,
                    timestamps: Date.now()
                }
            }
        };
        removeStoreIDfromBox(box, info);
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "State is validate, update box after change container successfully",
            info,
            validatedStateChanging
        });
    } else if (validatedStateChanging === validChange.Stock2Box) {
        const validationResult = validateStoreID(element);
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
                    storeID: {
                        from: box.storeID,
                        to: storeID
                    },
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
    } else if (validatedStateChanging === validChange.Stock2Dispatch ||
        validatedStateChanging === validChange.Box2Dispatch) {
        const missingArgList = checkMissingArgument(element, ["destinationStationID"]);
        if (missingArgList.length !== 0)
            return Promise.resolve({
                status: ProgramStatus.Error,
                errorType: StateChangingError.MissingArg,
                argumentNameList: missingArgList
            });
        const stationID = element.destinationStationID;
        let info = {
            status: BoxStatus.Dispatching,
            stationID,
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Dispatching,
                    boxAction: BoxAction.Dispatch,
                    stationID: {
                        from: box.stationID,
                        to: stationID
                    },
                    timestamps: Date.now()
                }
            }
        };
        removeStoreIDfromBox(box, info);
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
        } else if (boxAction === BoxAction.RejectDispatch) {
            const stationID = getLastStationIdInAction(box).from;
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
                        stationID: {
                            from: box.stationID,
                            to: stationID
                        },
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
                message: `Arguments [boxAction] should be ${BoxAction.AcceptDispatch} or ${BoxAction.RejectDispatch}`
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
        return new Promise((resolve, reject) => {
            changeContainersState(aBox.containerList, dbAdmin, {
                action: ContainerAction.DELIVERY,
                newState: ContainerState.DELIVERING,
            }, {
                boxID,
                storeID,
            }, async (err, tradeSuccess, reply) => {
                if (err)
                    return reject(err);
                if (!tradeSuccess)
                    return resolve({
                        status: ProgramStatus.Error,
                        message: reply
                    });
                aBox.delivering = true;
                aBox.stocking = false;
                aBox.user.delivery = dbAdmin.user.phone;
                await aBox.update(boxInfo).exec();
                return resolve({
                    status: ProgramStatus.Success,
                    message: "Changing Container State successfully"
                });
            });
        });
    } else if (validatedStateChanging === validChange.Deliver2Box) {
        return new Promise((resolve, reject) => {
            changeContainersState(aBox.containerList, dbAdmin, {
                action: ContainerAction.CANCEL_DELIVERY,
                newState: ContainerState.BOXED
            }, {
                bypassStateValidation: true,
            }, async (err, tradeSuccess, reply) => {
                if (err)
                    return reject(err);
                if (!tradeSuccess)
                    return resolve({
                        status: ProgramStatus.Error,
                        message: reply
                    });
                aBox.delivering = false;
                aBox.user.delivery = undefined;
                await aBox.update(boxInfo).exec();
                return resolve({
                    status: ProgramStatus.Success,
                    message: "Changing Container State successfully"
                });
            });
        });
    } else if (validatedStateChanging === validChange.Sign2Stock) {
        return new Promise((resolve, reject) => {
            changeContainersState(aBox.containerList, dbAdmin, {
                action: ContainerAction.UNSIGN,
                newState: ContainerState.BOXED
            }, {
                bypassStateValidation: true,
            }, async (err, tradeSuccess, reply) => {
                if (err)
                    return reject(err);
                if (!tradeSuccess)
                    return resolve({
                        status: ProgramStatus.Error,
                        message: reply
                    });
                aBox.delivering = false;
                aBox.user.delivery = undefined;
                aBox.stocking = true;
                await aBox.update(boxInfo).exec();
                return resolve({
                    status: ProgramStatus.Success,
                    message: "Changing Container State successfully"
                });
            });
        });
    } else if (validatedStateChanging === validChange.Deliver2Sign) {
        return new Promise((resolve, reject) => {
            changeContainersState(aBox.containerList, dbAdmin, {
                action: ContainerAction.SIGN,
                newState: ContainerState.READY_TO_USE
            }, {
                boxID,
                storeID
            }, async (err, tradeSuccess, reply) => {
                if (err)
                    return reject(err);
                if (!tradeSuccess)
                    return resolve({
                        status: ProgramStatus.Error,
                        message: reply
                    });
                await aBox.update(boxInfo).exec();
                return resolve({
                    status: ProgramStatus.Success,
                    message: "Changing Container State successfully"
                });
            });
        });
    } else if (validatedStateChanging === validChange.Stock2Box ||
        validatedStateChanging === validChange.Box2Stock ||
        validatedStateChanging === validChange.Box2Dispatch ||
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
    const missingArgList = checkMissingArgument(element, ["destinationStoreID"]);
    if (missingArgList.length !== 0)
        return {
            valid: false,
            errorType: StateChangingError.MissingArg,
            argumentNameList: missingArgList
        };
    const storeID = element.destinationStoreID;
    const stationID = element.stationID;
    const storeIsStorage = checkStoreIs(storeID, Category.Storage);
    const storeIsInArea = checkStoreIsInArea(storeID, stationID);
    if (storeIsStorage)
        return {
            valid: false,
            errorType: StateChangingError.ArgumentInvalid,
            message: `Arguments [storeID] should not represent a ${category}`
        };
    if (!storeIsInArea)
        return {
            valid: false,
            errorType: StateChangingError.ArgumentInvalid,
            message: `Arguments [storeID] is not in your Area`
        };
    return {
        valid: true,
        storeID
    };
}

function getLastStationIdInAction(box) {
    let stationID = null;
    for (let i = box.action.length - 1; i >= 0; i--) {
        if (box.action[i].stationID) {
            stationID = box.action[i].stationID;
            break;
        }
    }
    return stationID;
}

function removeStoreIDfromBox(box, info) {
    if (box.storeID !== null)
        Object.assign(info, {
            storeID: null,
            $push: {
                action: {
                    storeID: {
                        from: box.storeID,
                        to: null
                    }
                }
            }
        });
}