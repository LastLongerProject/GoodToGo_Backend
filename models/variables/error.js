let ErrorResponse = Object.freeze({
    F012: {
        code: 'F012',
        type: 'BoxingMessage',
        message: 'Box is already exist'
    },
    H001_1: {
        code: 'H001_1',
        type: "CreateMessage",
        message: "Data format invalid (boxList should in the request and be an array)"
    },
    H001_2: {
        code: 'H001_2',
        type: "CreateMessage",
        message: "Data format invalid (phone should in the request)"
    },
    H001_3: {
        code: 'H001_3',
        type: "CreateMessage",
        message: "Data format invalid (boxId should in the request)"
    },
    H002: {
        code: 'H002',
        type: "CreateMessage",
        message: "Missing info in boxList element"
    },
    H003: {
        code: 'H003',
        type: "CreateMessage",
        message: "Data format invalid (boxOrderContent must be an array)"
    },
    H004: {
        code: 'H004',
        type: "CreateMessage",
        message: "Too many request at the same time"
    },
    H005_1: {
        code: 'H005_1',
        type: "CreateMessage",
        message: "Data format invalid (boxOrderContent must include ContainerType and amount)"
    },
    H005_2: {
        code: 'H005_2',
        type: "CreateMessage",
        message: "Data format invalid (ContainerType and amount and should be Number)"
    },
    H005_3: {
        code: 'H005_3',
        type: "CreateMessage",
        message: "Data format invalid (Update Stocked to Boxing need provide destinationStoreId)"
    },
    H006: {
        code: "H006",
        type: "CreateMessage",
        message: "Database save error(Please check key type is correct)"
    },
    H007: {
        code: "H007",
        type: "ChangeStateMessage",
        message: ""
    },
    H008: {
        code: "H008",
        type: "ChangeStateMessage",
        message: "Please use 'sign' api to sign the box"
    }
});

module.exports = {
    ErrorResponse
}