const ID = require('../enums/analyzedOrderEnum').ID;
const DueStatus = require('../enums/userEnum').DueStatus;

module.exports = function UserOrderCatalog(dbUser) {
    const analyzedUserOrder = {};
    for (let dueStatusKey in DueStatus) {
        const aDueStatus = DueStatus[dueStatusKey];
        for (let idKey in ID) {
            const idRegistered = ID[idKey];
            if (!analyzedUserOrder.hasOwnProperty(idRegistered))
                analyzedUserOrder[idRegistered] = {};
            analyzedUserOrder[idRegistered][aDueStatus] = [];
        }
    }
    return Object.assign(this, {
        dbUser,
        analyzedUserOrder
    });
}