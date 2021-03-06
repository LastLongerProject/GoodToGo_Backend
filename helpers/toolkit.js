const debug = require('debug')('goodtogo_toolKit:err');
const crc32 = require('buffer-crc32');

const ContainerState = require("../models/enums/containerEnum").State;

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
    yearFormatter: function (dateToFormat) {
        var localDate = new Date(dateToFormat);
        if (localDate.getHours() >= 16)
            localDate.setDate(localDate.getDate() + 1);
        return localDate.getFullYear();
    },
    fullDateString: function (dateToFormat) {
        var localDate = new Date(dateToFormat);
        if (localDate.getHours() >= 16)
            localDate.setDate(localDate.getDate() + 1);
        return localDate.getFullYear() + "/" +
            module.exports.intReLength(localDate.getMonth() + 1, 2) + "/" +
            module.exports.intReLength(localDate.getDate(), 2);
    },
    validateStateChanging: function (bypass, oriState, newState, callback) {
        if (bypass) {
            switch (newState) {
                case ContainerState.BOXED: // CancelDelivery
                    if (oriState > ContainerState.READY_TO_USE)
                        return callback(false);
                    break;
                case ContainerState.RELOADED: // Unbox
                    if (oriState !== ContainerState.BOXED)
                        return callback(false);
                    break;
                default:
                    return callback(true);
            }
        } else {
            switch (oriState) {
                case ContainerState.DELIVERING:
                    if (newState !== ContainerState.READY_TO_USE)
                        return callback(false);
                    break;
                case ContainerState.READY_TO_USE:
                    if (newState <= ContainerState.READY_TO_USE || newState === ContainerState.BOXED)
                        return callback(false);
                    break;
                case ContainerState.USING:
                    if (newState !== ContainerState.RETURNED && newState !== ContainerState.DIRTY_RETURN)
                        return callback(false);
                    break;
                case ContainerState.RETURNED:
                    if (newState !== ContainerState.RELOADED && newState !== ContainerState.DIRTY_RETURN)
                        return callback(false);
                    break;
                case ContainerState.RELOADED:
                    if (newState !== ContainerState.BOXED)
                        return callback(false);
                    break;
                case ContainerState.BOXED:
                    if (newState !== ContainerState.DELIVERING)
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
            undoAction = action.map(anAction => `Undo${anAction}`);
            for (let i = tradeList.length - 1; i >= 0; i--) {
                if (undoAction.indexOf(tradeList[i].tradeType.action) !== -1) {
                    containerKey = tradeList[i].container.id + "-" + tradeList[i].container.cycleCtr + "-" + tradeList[i].tradeType.action.slice(4);
                    recordToRemove.push(containerKey);
                    tradeList.splice(i, 1);
                } else if (action.indexOf(tradeList[i].tradeType.action) !== -1) {
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
    },
    isSameDay: function (d1, d2) {
        if (!(d1 instanceof Date && d2 instanceof Date)) return false;
        d1.toLocaleString
        if (d1.getFullYear() !== d2.getFullYear()) return false;
        if (d1.getMonth() !== d2.getMonth()) return false;
        if (d1.getDate() !== d2.getDate()) return false;

        return true
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
    module.exports.yearFormatter = function (dateToFormat) {
        return dateToFormat.getFullYear();
    };
    module.exports.fullDateString = function (dateToFormat) {
        return dateToFormat.getFullYear() + "/" +
            module.exports.intReLength(dateToFormat.getMonth() + 1, 2) + "/" +
            module.exports.intReLength(dateToFormat.getDate(), 2);
    };
    module.exports.timeFormatter = function (dateToFormat) {
        var hoursFormatted = module.exports.intReLength(dateToFormat.getHours(), 2);
        var minutesFormatted = module.exports.intReLength(dateToFormat.getMinutes(), 2);
        return hoursFormatted + ":" + minutesFormatted;
    };
}