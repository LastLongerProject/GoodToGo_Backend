const getDateCheckpoint = require('@lastlongerproject/toolkit').getDateCheckpoint;

const DueDays = require('../enums/userEnum').DueDays;
const LastCallDays = require('../enums/userEnum').LastCallDays;
const DueStatus = require('../enums/userEnum').DueStatus;

function computeDaysOfUsing(dateToCompute, now) {
    return Math.ceil((now - getDateCheckpoint(dateToCompute)) / (1000 * 60 * 60 * 24));
}

module.exports = {
    daysOverDue: function (dateToCompute, userPurchaseStatus, now) {
        if (typeof now === "undefined") now = Date.now();
        return computeDaysOfUsing(dateToCompute, now) - DueDays[userPurchaseStatus];
    },
    daysToDue: function (dateToCompute, userPurchaseStatus, now) {
        if (typeof now === "undefined") now = Date.now();
        return DueDays[userPurchaseStatus] - computeDaysOfUsing(dateToCompute, now);
    },
    dueStatus: function (dateToCompute, userPurchaseStatus, now) {
        if (typeof now === "undefined") now = Date.now();

        const UserDueDays = DueDays[userPurchaseStatus];
        const UserLastCallDays = LastCallDays[userPurchaseStatus];
        const daysOfUsing = computeDaysOfUsing(dateToCompute, now);
        const daysToDue = daysOfUsing - UserDueDays;
        const daysOverDue = UserDueDays - daysOfUsing;

        if (daysToDue < 0) return DueStatus.NOT_DUE;
        else if (daysToDue === 0) return DueStatus.ALMOST_OVERDUE;
        else if (daysOverDue < UserLastCallDays) return DueStatus.LAST_CALL;
        else return DueStatus.OVERDUE;
    }
};