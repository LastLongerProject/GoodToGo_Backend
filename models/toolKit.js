var debug = require('debug')('goodtogo_backend:toolKit');
var crc32 = require('buffer-crc32');

module.exports = {
    wetag: function(body) {
        if (body.length === 0) {
            return 'W/"0-0"';
        }
        var buf = Buffer.from(body);
        var len = buf.length;
        return 'W/"' + len.toString(16) + '-' + crc32.unsigned(buf) + '"';
    },
    dateCheckpoint: function(checkpoint) {
        var dateNow = new Date();
        var timezoneFix = 0;
        if (dateNow.getHours() < 16)
            timezoneFix--;
        var date = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() + checkpoint + timezoneFix, 16, 0, 0, 0);
        return date;
    },
    timeFormatter: function(dateToFormat) {
        var tmpHour = dateToFormat.getHours() + 8;
        var hoursFormatted = this.intReLength((tmpHour >= 24) ? tmpHour - 24 : tmpHour, 2);
        var minutesFormatted = this.intReLength(dateToFormat.getMinutes(), 2);
        return hoursFormatted + ":" + minutesFormatted;
    },
    dayFormatter: function(dateToFormat) {
        var localDate = new Date(dateToFormat);
        if (localDate.getHours() >= 16)
            localDate.setDate(localDate.getDate() + 1);
        return localDate.getDate();
    },
    monthFormatter: function(dateToFormat) {
        var localDate = new Date(dateToFormat);
        if (localDate.getHours() >= 16)
            localDate.setDate(localDate.getDate() + 1);
        return localDate.getMonth() + 1;
    },
    intReLength: function(data, length) {
        var str = data.toString();
        if (length - str.length) {
            for (j = 0; j <= length - str.length; j++) {
                str = "0" + str;
            }
        }
        return str;
    },
    validateStateChanging: function(bypass, oriState, newState, callback) {
        if (bypass) return callback(true);
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
                if (newState !== 3 && newState !== 4)
                    return callback(false);
                break;
            case 3: // returned
                if (newState !== 4)
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
        callback(true);
    }
};

if (process.env.OS === 'Windows_NT') {
    debug("Windows Version toolkit");
    module.exports.dateCheckpoint = function(checkpoint) {
        var dateNow = new Date();
        var date = new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate() + checkpoint, 0, 0, 0, 0);
        return date;
    };
    module.exports.dayFormatter = function(dateToFormat) {
        return dateToFormat.getDate();
    };
    module.exports.monthFormatter = function(dateToFormat) {
        return dateToFormat.getMonth() + 1;
    };
    module.exports.timeFormatter = function(dateToFormat) {
        var hoursFormatted = module.exports.intReLength(dateToFormat.getHours(), 2);
        var minutesFormatted = module.exports.intReLength(dateToFormat.getMinutes(), 2);
        return hoursFormatted + ":" + minutesFormatted;
    };
}