let BoxStatus = require('../models/variables/boxEnum').BoxStatus;
let ProgramStatus = require('../models/variables/programEnum.js').ProgramStatus;

let checkStateChanging = function(oldState, newState) {
    let validChange = [
        [BoxStatus.Boxing, BoxStatus.Stocked],
        [BoxStatus.Boxing, BoxStatus.Delivering],
        [BoxStatus.Delivering, BoxStatus.Boxing],
        [BoxStatus.Signed, BoxStatus.Boxing],
        [BoxStatus.Stocked, BoxStatus.Boxing],
        [BoxStatus.Signed, BoxStatus.Archived]
    ];
    for (let element of validChange) {
        if ([oldState, newState] === element) {
            return true;
        }
        return false;
    }
}

let changeStateProcess = function(oldState, newState) {
    if (!checkStateChanging) return Promise.resolve({
        status: ProgramStatus.Error,
        message: "invalid state changing"
    });
}

module.exports = {
    checkStateChanging,

};