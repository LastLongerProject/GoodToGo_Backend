module.exports = {
    BoxStatus: Object.freeze({
        Created: "Created",
        Boxing: "Boxing",
        Delivering: "Delivering",
        Signed: "Signed",
        Stocked: "Stocked",
        Archived: "Archived",
    }),
    BoxAction: Object.freeze({
        Create: "Create",
        Pack: "Pack",
        Deliver: "Deliver",
        Arrival: "Arrival",
        Sign: "Sign",
        SendBack: "SendBack",
        CancelArrival: "CancelArrival",
        ModifyDueDate: "ModifyDueDate",
        Archive: "Archive",
        Assign: "Assign"
    })
};