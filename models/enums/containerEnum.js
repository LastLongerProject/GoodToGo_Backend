const ContainerAction = Object.freeze({
    DELIVERY: "Delivery",
    CANCEL_DELIVERY: "CancelDelivery",
    SIGN: "Sign",
    UNSIGN: "UnSign",
    RENT: "Rent",
    UNDO_RENT: "UndoRent",
    RETURN: "Return",
    UNDO_RETURN: "UndoReturn",
    DIRTY_RETURN: "dirtyReturn",
    RELOAD: "ReadyToClean",
    UNDO_RELOAD: "UndoReadyToClean",
    BOXING: "Boxing",
    UNBOXING: "Unboxing",
    RENT_IDLESS: "RentWithoutID",
    RETURN_IDLESS: "ReturnWithoutID",
});

module.exports = {
    Action: ContainerAction,
    ActionTranslation: Object.freeze({
        [ContainerAction.DELIVERY]: "配送",
        [ContainerAction.CANCEL_DELIVERY]: "取消配送",
        [ContainerAction.SIGN]: "簽收",
        [ContainerAction.UNSIGN]: "取消簽收",
        [ContainerAction.RENT]: "借出",
        [ContainerAction.UNDO_RENT]: "取消借出",
        [ContainerAction.RETURN]: "歸還",
        [ContainerAction.UNDO_RETURN]: "取消歸還",
        [ContainerAction.RELOAD]: "回收",
        [ContainerAction.UNDO_RELOAD]: "取消回收",
        [ContainerAction.BOXING]: "裝箱",
        [ContainerAction.UNBOXING]: "取消裝箱",
        [ContainerAction.RENT_IDLESS]: "借出",
        [ContainerAction.RETURN_IDLESS]: "歸還"
    }),
    State: Object.freeze({
        DELIVERING: 0,
        READY_TO_USE: 1,
        USING: 2,
        RETURNED: 3,
        RELOADED: 4,
        BOXED: 5,
        DIRTY_RETURN: 6 // exception
    })
};