module.exports = function UserOrderCatalog(dbUser) {
    return Object.assign(this, {
        dbUser,
        idRegistered: {
            almostOverdue: [],
            lastCall: [],
            overdue: [],
            others: []
        },
        idNotRegistered: {
            almostOverdue: [],
            lastCall: [],
            overdue: [],
            others: []
        }
    });
}