let BoxStatus = require('../models/variables/boxEnum').BoxStatus;
let ProgramStatus = require('../models/variables/programEnum.js').ProgramStatus;
let ErrorResponse = require('../models/variables/error.js').ErrorResponse;

let validChange = [
    [BoxStatus.Boxing, BoxStatus.Stocked],
    [BoxStatus.Boxing, BoxStatus.Delivering],
    [BoxStatus.Delivering, BoxStatus.Boxing],
    [BoxStatus.Signed, BoxStatus.Stocked],
    [BoxStatus.Stocked, BoxStatus.Boxing],
    [BoxStatus.Signed, BoxStatus.Archived]
];

let checkStateChanging = function(stateChanging) {
    for (let element of validChange) {
        if (stateChanging === element) {
            return true;
        }
        return false;
    }
}

let changeStateProcess = function(oldState, newState, box, phone, cb) {
    let stateChanging = [oldState, newState];
    if (!checkStateChanging(stateChanging)) return Promise.resolve({
        status: ProgramStatus.Error,
        message: "invalid box state changing"
    });
    if (stateChanging === validChange[0]) {
        return box.update({
            status: BoxStatus.Stocked,
            storeID: 99999,
        }, function(err, result) {
            if (err) return Promise.resolve({
                status: ProgramStatus.Error,
                message: "Box update failed in changing state from Boxing to Stock"
            });
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Boxing to Stock"
            });
        });
    } else if (stateChanging === validChange[1]) {
        return box.update({
            status: BoxStatus.Delivering,
            $push: {
                action: {
                    phone: phone,
                    boxStatus: BoxStatus.Delivering,
                    timestamps: Date.now()
                }
            }
        }, function(err, result) {
            if (err) return Promise.resolve({
                status: ProgramStatus.Error,
                message: "Box update failed in changing state from Boxing to Delivering"
            });
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Boxing to Stock"
            });
        });
    } else if (stateChanging === validChange[2]) {
        return box.update({
            status: BoxStatus.Boxing,
            $pull: {
                action: {
                    boxStatus: BoxStatus.Delivering
                }
            }
        }, function(err, result) {
            if (err) return Promise.resolve({
                status: ProgramStatus.Error,
                message: "Box update failed in changing state from Delivering to Boxing"
            });
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Delivering to Boxing"
            });
        });
    } else if (stateChanging === validChange[3]) {
        return box.update({
            status: BoxStatus.Stocked,
            storeID: 99999,
            dueDate: Date.now(),
            $pull: {
                action: {
                    boxStatus: BoxStatus.Delivering
                },
                action: {
                    boxStatus: BoxStatus.Signed
                }
            }
        }, function(err, result) {
            if (err) return Promise.resolve({
                status: ProgramStatus.Error,
                message: "Box update failed in changing state from Signed to Stocked"
            });
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Signed to Stocked"
            });
        });
    } else if (stateChanging === validChange[4]) {
        return box.update({
            status: BoxStatus.Boxing
        }, function(err, result) {
            if (err) return Promise.resolve({
                status: ProgramStatus.Error,
                message: "Box update failed in changing state from Stocked to Boxing"
            });
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Stocked to Boxing"
            });
        });
    } else if (stateChanging === validChange[5]) {
        return box.deleteOne(function(err, result) {
            if (err) return Promise.resolve({
                status: ProgramStatus.Error,
                message: "Box delete failed in changing state from Signed to Archived"
            });
            return Promise.resolve({
                status: ProgramStatus.Success,
                message: "Successfully change state from Signed to Archived"
            });
        });
    }
}

module.exports = {
    checkStateChanging,
    changeStateProcess
};