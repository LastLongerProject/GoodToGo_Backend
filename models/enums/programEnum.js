const ProgramStatus = Object.freeze({
    Error: "error",
    Success: "success"
});

const BoxSaveType = Object.freeze({
    Update: "update",
    Remove: "remove"
});

const StateChangingError = Object.freeze({
    MissingArg: "missing_arg",
    InvalidStateChanging: "invalid_state_changing",
    ArgumentInvalid: "argument_invalid"
});

module.exports = {
    ProgramStatus,
    BoxSaveType,
    StateChangingError
};