var debug = require('debug')('goodtogo_toolKit:err');
var crc32 = require('buffer-crc32');

module.exports = {
    uniqArr: function (a) {
        var seen = {};
        return a.filter(function (item) {
            return seen.hasOwnProperty(item) ? false : (seen[item] = true);
        });
    },
    wetag: function (body) {
        if (body.length === 0) {
            return 'W/"0-0"';
        }
        var buf = Buffer.from(body);
        var len = buf.length;
        return 'W/"' + len.toString(16) + '-' + crc32.unsigned(buf) + '"';
    },
    intReLength: function (data, length) {
        var str = data.toString();
        const zeroToAppend = length - str.length;
        if (zeroToAppend) {
            for (let j = 0; j < zeroToAppend; j++) {
                str = "0" + str;
            }
        }
        return str;
    },
    dateCheckpoint: function (checkpoint) {
        var dateNow = new Date();
        var timezoneFix = 0;
        if (dateNow.getHours() < 16)
            timezoneFix--;
        var date = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() + checkpoint + timezoneFix, 16, 0, 0, 0);
        return date;
    },
    getDateCheckpoint: function (date) {
        if (!isDate(date)) date = new Date();
        var timezoneFix = 0;
        if (date.getHours() < 16)
            timezoneFix--;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + timezoneFix, 16, 0, 0, 0);
    },
    getWeekCheckpoint: function (date) {
        if (!isDate(date)) date = new Date();
        var timezoneFix = 0;
        if (date.getHours() < 16)
            timezoneFix--;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() + 1 + timezoneFix, 16, 0, 0, 0);
    },
    timeFormatter: function (dateToFormat) {
        var tmpHour = dateToFormat.getHours() + 8;
        var hoursFormatted = module.exports.intReLength((tmpHour >= 24) ? tmpHour - 24 : tmpHour, 2);
        var minutesFormatted = module.exports.intReLength(dateToFormat.getMinutes(), 2);
        return hoursFormatted + ":" + minutesFormatted;
    },
    dayFormatter: function (dateToFormat) {
        var localDate = new Date(dateToFormat);
        if (localDate.getHours() >= 16)
            localDate.setDate(localDate.getDate() + 1);
        return localDate.getDate();
    },
    monthFormatter: function (dateToFormat) {
        var localDate = new Date(dateToFormat);
        if (localDate.getHours() >= 16)
            localDate.setDate(localDate.getDate() + 1);
        return localDate.getMonth() + 1;
    },
    fullDateString: function (date) {
        var dayFormatted = module.exports.intReLength(module.exports.dayFormatter(date), 2);
        var monthFormatted = module.exports.intReLength(module.exports.monthFormatter(date), 2);
        return date.getFullYear() + "/" + monthFormatted + "/" + dayFormatted;
    },
    validateStateChanging: function (bypass, oriState, newState, callback) {
        if (bypass) {
            switch (newState) {
                case 5: // CancelDelivery
                    if (oriState > 1)
                        return callback(false);
                    break;
                case 4: // Unbox
                    if (oriState !== 5)
                        return callback(false);
                    break;
                default:
                    return callback(true);
            }
        } else {
            switch (oriState) {
                case 0: // delivering
                    if (newState !== 1)
                        return callback(false);
                    break;
                case 1: // readyToUse
                    if (newState <= 1 || newState === 5)
                        return callback(false);
                    break;
                case 2: // rented
                    if (newState !== 3 && newState !== 6)
                        return callback(false);
                    break;
                case 3: // returned
                    if (newState !== 4 && newState !== 6)
                        return callback(false);
                    break;
                case 4: // notClean
                    if (newState !== 5)
                        return callback(false);
                    break;
                case 5: // boxed
                    if (newState !== 0)
                        return callback(false);
                    break;
                default:
                    return callback(false);
            }
        }
        return callback(true);
    },
    cleanUndoTrade: function (action, tradeList) {
        var undoAction;
        var containerKey;
        var recordToRemove = [];
        if (typeof action === 'string') {
            undoAction = "Undo" + action;
            for (let i = tradeList.length - 1; i >= 0; i--) {
                if (tradeList[i].tradeType.action === undoAction) {
                    containerKey = tradeList[i].container.id + "-" + tradeList[i].container.cycleCtr;
                    recordToRemove.push(containerKey);
                    tradeList.splice(i, 1);
                } else if (tradeList[i].tradeType.action === action) {
                    containerKey = tradeList[i].container.id + "-" + tradeList[i].container.cycleCtr;
                    let removeIndex = recordToRemove.indexOf(containerKey);
                    if (removeIndex !== -1) {
                        recordToRemove.splice(removeIndex, 1);
                        tradeList.splice(i, 1);
                    }
                }
            }
        } else if (Array.isArray(action)) {
            undoAction = ["Undo" + action[0], "Undo" + action[1]];
            for (let i = tradeList.length - 1; i >= 0; i--) {
                if (tradeList[i].tradeType.action === undoAction[0] || tradeList[i].tradeType.action === undoAction[1]) {
                    containerKey = tradeList[i].container.id + "-" + tradeList[i].container.cycleCtr + "-" + tradeList[i].tradeType.action.slice(4);
                    recordToRemove.push(containerKey);
                    tradeList.splice(i, 1);
                } else if (tradeList[i].tradeType.action === action[0] || tradeList[i].tradeType.action === action[1]) {
                    containerKey = tradeList[i].container.id + "-" + tradeList[i].container.cycleCtr + "-" + tradeList[i].tradeType.action;
                    let removeIndex = recordToRemove.indexOf(containerKey);
                    if (removeIndex !== -1) {
                        recordToRemove.splice(removeIndex, 1);
                        tradeList.splice(i, 1);
                    }
                }
            }
        }
    },
    bindFunction: function (doFirst, then, argToAssign) {
        return function bindedFunction() {
            doFirst();
            if (argToAssign && typeof arguments[0] !== "undefined") Object.assign(arguments[0], argToAssign);
            then.apply(this, arguments);
        };
    }
};

function isDate(date) {
    return typeof date === "object" && date instanceof Date
};

if (process.env.OS === 'Windows_NT') {
    debug("Windows Version toolkit");
    module.exports.dateCheckpoint = function (checkpoint) {
        var dateNow = new Date();
        var date = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() + checkpoint, 0, 0, 0, 0);
        return date;
    };
    module.exports.getDateCheckpoint = function (date) {
        if (!date) date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    };
    module.exports.getWeekCheckpoint = function (date) {
        if (!date) date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay() + 1, 0, 0, 0, 0);
    };
    module.exports.dayFormatter = function (dateToFormat) {
        return dateToFormat.getDate();
    };
    module.exports.monthFormatter = function (dateToFormat) {
        return dateToFormat.getMonth() + 1;
    };
    module.exports.timeFormatter = function (dateToFormat) {
        var hoursFormatted = module.exports.intReLength(dateToFormat.getHours(), 2);
        var minutesFormatted = module.exports.intReLength(dateToFormat.getMinutes(), 2);
        return hoursFormatted + ":" + minutesFormatted;
    };
}