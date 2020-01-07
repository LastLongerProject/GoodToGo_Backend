const ContainerAction = Object.freeze({
    DELIVERY: "Delivery",
    CANCEL_DELIVERY: "CancelDelivery",
    SIGN: "Sign",
    UNSIGN: "UnSign",
    RENT: "Rent",
    RETURN: "Return",
    UNDO_RETURN: "UndoReturn",
    DIRTY_RETURN: "dirtyReturn",
    READY_TO_CLEAN: "ReadyToClean",
    UNDO_READY_TO_CLEAN: "UndoReadyToClean",
    BOXING: "Boxing",
    UNBOXING: "Unboxing"
});

module.exports = {
    Action: ContainerAction,
    ActionTranslation: Object.freeze({
        [ContainerAction.DELIVERY]: "配送",
        [ContainerAction.CANCEL_DELIVERY]: "取消配送",
        [ContainerAction.SIGN]: "簽收",
        [ContainerAction.UNSIGN]: "取消簽收",
        [ContainerAction.RENT]: "借出",
        [ContainerAction.RETURN]: "歸還",
        [ContainerAction.UNDO_RETURN]: "取消歸還",
        [ContainerAction.READY_TO_CLEAN]: "回收",
        [ContainerAction.UNDO_READY_TO_CLEAN]: "取消回收",
        [ContainerAction.BOXING]: "裝箱",
        [ContainerAction.UNBOXING]: "取消裝箱"
    })
};