var path = require('path');
var logger = require('morgan');
var express = require('express');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
// var cookieParser = require('cookie-parser');
var mongoose = require('mongoose');
var helmet = require('helmet');
var timeout = require('connect-timeout');
var ua = require('universal-analytics');
var debug = require('debug')('goodtogo_backend:app');
debug.log = console.log.bind(console);
var debugError = require('debug')('goodtogo_backend:appERR');

var config = require('./config/config');
var appInit = require('./models/appInit');
var logSystem = require('./models/logSystem');
var logModel = require('./models/DB/logDB');
var scheduler = require('./models/scheduler');
var stores = require('./routes/stores');
var users = require('./routes/users');
var images = require('./routes/images');
var manage = require('./routes/manage');
var containers = require('./routes/containers');

var app = express();
var esm;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'assets/images/icon', 'favicon.ico')));
app.use(logger(':date - :method :url HTTP/:http-version :status - :response-time ms'));
app.use(logSystem(logModel));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(resBodyParser);
app.use(helmet());
app.use(GAtrigger()); // Trigger Google Analytics
app.use((req, res, next) => {
    if (!esm) {
        esm = require('express-status-monitor')({
            title: "GoodToGo Backend Monitor",
            websocket: app.get('socket.io')
        });
    }
    esm(req, res, next);
});

process.env['GOOGLE_APPLICATION_CREDENTIALS'] = path.join(__dirname, 'config', 'GoodToGoTW-a98833274341.json');

mongoose.Promise = global.Promise;
connectMongoDB();
require("./models/redis");

app.use('/manage', manage);
app.use('/.well-known/acme-challenge', express.static(path.join(__dirname, 'runtime/.well-known/acme-challenge')));
app.use(timeout('10s'));
app.use('/lottery', function (req, res) {
    res.redirect('http://goodtogo.tw');
});
app.use('/usage', function (req, res) {
    res.redirect('http://goodtogo.tw');
});

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache');
    next();
});
app.use('/stores', stores);
app.use('/users', users);
app.use('/containers', containers);
app.use('/images', images);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    if (!err.status) {
        debugError(JSON.stringify(err));
        req._errorLevel = 3;
        res.status(500);
        res.json({
            code: 'Z002',
            type: 'globalError',
            message: 'Unexpect Error',
            data: err
        });
    } else if (err.status === 404) {
        res.status(err.status);
        res.json({
            code: 'Z001',
            type: 'globalError',
            message: err.message
        });
    } else {
        req._errorLevel = 3;
        res.status(err.status);
        res.json({
            code: 'Z003',
            type: 'globalError',
            message: err.message
        });
    }
});

module.exports = app;

// GA
function GAtrigger() {
    var visitor = ua(config.GA_TRACKING_ID, {
        https: true
    });

    return function GAtrigger(req, res, next) {
        visitor.set('ua', req.headers['user-agent']);
        visitor.pageview(req.url, function (err) {
            if (err !== null) {
                debugError('Failed to trigger GA: ' + err);
            }
        });
        next();
    };
}

function connectMongoDB() {
    mongoose.connect(config.dbUrl, config.dbOptions, function (err) {
        if (err) throw err;
        debug('mongoDB connect succeed');
        // require('./tmp/changeUserStruc')
        appInit.container(app);
        appInit.store(app);
        if (process.env.NODE_ENV && process.env.NODE_ENV.replace(/"|\s/g, "") === "testing") {
            debug("Testing ENV no scheduler");
        } else {
            scheduler(app);
        }
    });
}

function resBodyParser(req, res, next) {
    var oldWrite = res.write,
        oldEnd = res.end;

    var chunks = [];

    res.write = function (chunk) {
        if (!Buffer.isBuffer(chunk))
            chunk = new Buffer(chunk);
        chunks.push(chunk);

        oldWrite.apply(res, arguments);
    };

    res.end = function (chunk) {
        if (typeof chunk !== 'undefined') {
            if (!Buffer.isBuffer(chunk))
                chunk = new Buffer(chunk);
            chunks.push(chunk);
        }

        var body = Buffer.concat(chunks).toString('utf8');
        res._body = body;

        oldEnd.apply(res, arguments);
    };

    next();
}