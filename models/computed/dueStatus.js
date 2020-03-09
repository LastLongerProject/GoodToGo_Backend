const dateCheckpoint = require('../../helpers/toolkit').dateCheckpoint;
const getDateCheckpoint = require('../../helpers/toolkit').getDateCheckpoint;

const DueDays = require('../enums/userEnum').DueDays;
const LastCallDays = require('../enums/userEnum').LastCallDays;
const DueStatus = require('../enums/userEnum').DueStatus;

function computeDaysOfUsing(dateToCompute, now) {
    return Math.ceil((now - getDateCheckpoint(dateToCompute)) / (1000 * 60 * 60 * 24));
}

module.exports = {
    daysOverDue: function (dateToCompute, userPurchaseStatus, now = Date.now()) {
        return computeDaysOfUsing(dateToCompute, now) - DueDays[userPurchaseStatus];
    },
    daysToDue: function (dateToCompute, userPurchaseStatus, now = Date.now()) {
        return DueDays[userPurchaseStatus] - computeDaysOfUsing(dateToCompute, now);
    },
    dueStatus: function (dateToCompute, userPurchaseStatus, now = Date.now()) {
        const UserDueDays = DueDays[userPurchaseStatus];
        const UserLastCallDays = LastCallDays[userPurchaseStatus];
        const daysOfUsing = computeDaysOfUsing(dateToCompute, now);

        if (daysOfUsing < UserDueDays) return DueStatus.NOT_DUE;
        else if (daysOfUsing === UserDueDays) return DueStatus.ALMOST_OVERDUE;
        else if (daysOfUsing <= (UserDueDays + UserLastCallDays)) return DueStatus.LAST_CALL;
        else return DueStatus.OVERDUE;
    },
    deadline: function (dateToCompute, userPurchaseStatus, now = Date.now()) {
        const UserDueDays = DueDays[userPurchaseStatus];
        const UserLastCallDays = LastCallDays[userPurchaseStatus];
        return dateCheckpoint(UserDueDays + UserLastCallDays - computeDaysOfUsing(dateToCompute, now) + 1);
    }
};