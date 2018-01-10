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
    dayFormatter: function(dateToFormat) {
        if (dateToFormat.getHours() >= 16)
            dateToFormat.setDate(dateToFormat.getDate() + 1);
        return dateToFormat.getDate();
    },
    intReLength: function(data, length) {
        var str = data.toString();
        if (length - str.length) {
            for (j = 0; j <= length - str.length; j++) {
                str = "0" + str;
            }
        }
        return str;
    }
};