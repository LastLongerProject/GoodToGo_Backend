module.exports = {
    BoxStatus: Object.freeze({
        Created: "Created",
        Boxing: "Boxing",
        Delivering: "Delivering",
        Signed: "Signed",
        Stocked: "Stocked",
        Archived: "Archived",
        Dispatching: "Dispatching"
    }),
    BoxAction: Object.freeze({
        Create: "Create",
        Pack: "Pack",
        Deliver: "Deliver",
        Arrival: "Arrival",
        Sign: "Sign",
        Stock: "Stock",
        CancelArrival: "CancelArrival",
        ModifyDueDate: "ModifyDueDate",
        Archive: "Archive",
        Assign: "Assign",
        Dispatch: "Dispatch",
        AcceptDispatch: "AcceptDispatch",
        RejectDispatch: "RejectDispatch"
    })
};