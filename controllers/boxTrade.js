const BoxStatus = require('../models/variables/boxEnum').BoxStatus;
const ProgramStatus = require('../models/variables/programEnum.js').ProgramStatus;
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

let checkStateChanging = function(stateChanging) {
    for (let element of validChange) {

        if (stateChanging[0] === element[0] && stateChanging[1] === element[1]) {
            return element;
        }
    }
    return false;
}

let changeStateProcess = async function(element, box, phone) {
    const newState = element.newState;
    let stateChanging = [box.status, newState];
    let result = checkStateChanging(stateChanging);
    if (!result) return Promise.resolve({
        status: ProgramStatus.Error,
        message: "invalid box state changing"
    });

    if (result === validChange[0]) {
        let res = await box.update({
            status: BoxStatus.Stocked,
            storeID: 99999,
        }).exec();

        if (res) {
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Boxing to Stock"
            });
        }
        return Promise.resolve({
            status: ProgramStatus.Error,
            message: "Box update failed in changing state from Boxing to Stock"
        });

    } else if (result === validChange[1]) {
        let res = await box.update({
            status: BoxStatus.Delivering,
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Delivering,
                    timestamps: Date.now()
                }
            }
        }).exec();

        if (res) {
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Boxing to Delivering"
            });
        }
        return Promise.resolve({
            status: ProgramStatus.Error,
            message: "Box update failed in changing state from Boxing to Delivering"
        });
    } else if (result === validChange[2]) {
        let res = await box.update({
            status: BoxStatus.Boxing,
            $pull: {
                action: {
                    boxStatus: BoxStatus.Delivering
                }
            }
        }).exec();
        if (res) {
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Delivering to Boxing"
            });
        }
        return Promise.resolve({
            status: ProgramStatus.Error,
            message: "Box update failed in changing state from Delivering to Boxing"
        });

    } else if (result === validChange[3]) {
        let res = await box.update({
            status: BoxStatus.Stocked,
            storeID: 99999,
            dueDate: Date.now(),
            $pull: {
                action: {
                    $or: [{
                            boxStatus: BoxStatus.Delivering
                        },
                        {
                            boxStatus: BoxStatus.Signed
                        }
                    ]
                }
            }
        }).exec();
        if (res) {
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Signed to Stocked"
            });
        }

        return Promise.resolve({
            status: ProgramStatus.Error,
            message: "Box update failed in changing state from Signed to Stocked"
        });

    } else if (result === validChange[4]) {
        let res = await box.update({
            status: BoxStatus.Boxing,
            storeID: element.destinationStoreId
        }).exec();

        if (res) {
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Stocked to Boxing"
            });
        }

        return Promise.resolve({
            status: ProgramStatus.Error,
            message: "Box update failed in changing state from Stocked to Boxing"
        });

    } else if (result === validChange[5]) {
        let res = await box.remove();
        if (res) {
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Signed to Archived"
            });
        }
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "Successfully change state from Signed to Archived"
        });
    } else if (result === validChange[6]) {
        let res = await box.update({
            status: BoxStatus.Signed,
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Signed,
                    timestamps: Date.now()
                }
            }
        }).exec();
        if (res) {
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Delivering to Signed"
            });
        }
        return Promise.resolve({
            status: ProgramStatus.Success,
            message: "Successfully change state from Delivering to Signed"
        });
    }
}

let containerStateFactory = function(newState, aBox, dbAdmin, res, next) {
    let boxID = aBox.boxID;
    let storeID = aBox.storeID;
    if (aBox.status === BoxStatus.Boxing && newState === BoxStatus.Delivering) {
        changeContainersState(
            aBox.containerList,
            dbAdmin, {
                action: 'Delivery',
                newState: 0,
            }, {
                boxID,
                storeID,
            },
            async(err, tradeSuccess, reply) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(reply);
                aBox.delivering = true;
                aBox.stocking = false;
                aBox.user.delivery = dbAdmin.user.phone;
                let result = await aBox.save();
                if (result) return res.status(200).json({
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
                action: 'CancelDelivery',
                newState: 5
            }, {
                bypassStateValidation: true,
            },
            async(err, tradeSuccess, reply) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(reply);
                aBox.delivering = false;
                aBox.user.delivery = undefined;
                let result = await aBox.save();
                if (result) return res.status(200).json({
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
                action: 'UnSign',
                newState: 5
            }, {
                bypassStateValidation: true,
            },
            async(err, tradeSuccess, reply) => {
                if (err) return next(err);
                if (!tradeSuccess) return res.status(403).json(reply);
                aBox.delivering = false;
                aBox.user.delivery = undefined;
                aBox.stocking = true;
                let result = await aBox.save();
                if (result) return res.status(200).json({
                    type: "ChangeStateMessage",
                    message: "Change state successfully"
                });
            }
        );
    }

    if (aBox.status === BoxStatus.Stocked && newState === BoxStatus.Boxing) {
        return res.status(200).json({
            type: "ChangeStateMessage",
            message: "Change state successfully"
        });
    }

    if (aBox.status === BoxStatus.Signed && newState === BoxStatus.Archived) {
        return res.status(200).json({
            type: "ChangeStateMessage",
            message: "Change state successfully"
        });
    }

    if (aBox.status === BoxStatus.Signed && newState === BoxStatus.Archived) {
        return res.status(200).json({
            type: "ChangeStateMessage",
            message: "Change state successfully"
        });
    }

    if (aBox.status === BoxStatus.Delivering && newState === BoxStatus.Signed) {
        return Promise.resolve({
            type: "ChangeStateMessage",
            message: "Change state successfully"
        });
    }
}

module.exports = {
    checkStateChanging,
    changeStateProcess,
    containerStateFactory
};