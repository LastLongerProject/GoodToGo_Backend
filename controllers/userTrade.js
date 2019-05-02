const debug = require('../helpers/debugger')('userTrade');

const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../helpers/notifications/enums/events');

module.exports = {
    banUser: function (dbUser, overdueAmount, sendNotice) {
        if (!dbUser.hasBanned) {
            dbUser.hasBanned = true;
            dbUser.bannedTimes++;
            dbUser.save(err => {
                if (err) return debug.error(err);
            });
            if (sendNotice)
                NotificationCenter.emit(NotificationEvent.USER_BANNED, dbUser, {
                    bannedTimes: dbUser.bannedTimes,
                    overdueAmount
                });
        }
    },
    noticeUserWhoIsGoingToBeBanned: function (dbUser, almostOverdueAmount) {
        if (!dbUser.hasBanned) {
            NotificationCenter.emit(NotificationEvent.USER_ALMOST_OVERDUE, dbUser, {
                bannedTimes: dbUser.bannedTimes,
                almostOverdueAmount
            });
        }
    },
    unbanUser: function (dbUser) {
        if (dbUser.hasBanned && dbUser.bannedTimes <= 1) {
            dbUser.hasBanned = false;
            dbUser.save(err => {
                if (err) return debug.error(err);
            });
            NotificationCenter.emit(NotificationEvent.USER_UNBANNED, dbUser, {
                bannedTimes: dbUser.bannedTimes,
                purchaseStatus: dbUser.getPurchaseStatus()
            });
        }
    }
}