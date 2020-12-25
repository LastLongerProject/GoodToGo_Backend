const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const debug = require('../helpers/debugger')('cleanServerLogs');
const { dateCheckpoint } = require('../helpers/toolkit');
const ServerLog = require('../models/DB/logDB');

require("../models/mongo")(mongoose, false, err => {
    if (err) throw err;
    ServerLog.deleteMany({
        logTime: {
            $lt: dateCheckpoint(-7)
        }
    }, err => {
        if (err) throw err;
        debug.log("Done");
        mongoose.connection.close(function () {
            debug.log('Closing...');
            return process.exit(0);
        });
    });
});