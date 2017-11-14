var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
// var redis = require('redis');
var passport = require('passport');
var compression = require('compression');
var helmet = require('helmet')
var timeout = require('connect-timeout')
var ua = require('universal-analytics');
var debug = require('debug')('goodtogo_backend:app');
var debugError = require('debug')('goodtogo_backend:appERR');

var logSystem = require('./models/logSystem')
var logModel = require('./models/DB/logDB')
var index = require('./routes/index');
var stores = require('./routes/stores');
var users = require('./routes/users');
var containers = require('./routes/containers');
var images = require('./routes/images');
var config = require('./config/config');

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'assets/images/icon', 'favicon.ico')));
app.use(logger(':remote-addr - :date - :method :url HTTP/:http-version :status - :response-time ms'));
app.use(logSystem(logModel));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(resBodyParser);
app.use(helmet());
// app.use(compression());
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));
app.use(GAtrigger()); // Trigger Google Analytics
app.use(passport.initialize());
app.set('passport', passport);
app.use(timeout('10s'))
app.use(require('express-status-monitor')({ title: "GoodToGo Backend Monitor" }));

debug.log = console.log.bind(console);
mongoose.Promise = global.Promise;
mongoose.connect(config.dbUrl, config.dbOptions, function(err) {
    if (err) next(err);
    debug('mongoDB connect succeed');
    // require('./tmp/changeTradeTime.js')
});
/*
var RDS_PORT = 6379,
    RDS_HOST = config.redisUrl,
    RDS_PWD = config.redisPass,
    RDS_OPTS = {},
    client = redis.createClient(RDS_PORT, RDS_HOST, RDS_OPTS);

client.auth(RDS_PWD, function() {
    debug('redisDB auth succeed');
});

client.on('ready', function(err) {
    if (err) next(err);
    debug('redisDB connect succeed');
});*/

require('./models/userQuery'); // pass passport for configuration

app.use('/lottery', function(req, res) { res.redirect('http://goodtogo.tw'); });
app.use('/usage', function(req, res) { res.redirect('http://goodtogo.tw'); });

// app.use('/', index);
app.use('/stores', stores);
app.use('/users', users);
app.use('/containers', containers);
app.use('/images', images);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    if (typeof err.status === 'undefined') {
        debugError(JSON.stringify(err));
        req._error = {
            type: 'server',
            description: 'Unexpect Error',
            level: 3
        }
        res.status(500);
        res.json({ type: 'globalError', message: 'Unexpect Error. Please contact network administrator with following data: ' + JSON.stringify(req.headers) });
    } else {
        if (err.status !== 404)
            req._error = {
                type: 'Unknown',
                description: 'Unexpect Error',
                level: 2
            }
        res.status(err.status);
        res.json({ type: 'globalError', message: err.message });
    }
});

module.exports = app;

// GA
function GAtrigger() {
    var visitor = ua(config.GA_TRACKING_ID, { https: true });

    return function GAtrigger(req, res, next) {
        visitor.set('ua', req.headers['user-agent']);
        visitor.pageview(req.url, function(err) {
            if (err !== null) {
                console.log('Failed to trigger GA: ' + err);
            }
        });
        next();
    }
}

function resBodyParser(req, res, next) {
    var oldWrite = res.write,
        oldEnd = res.end;

    var chunks = [];

    res.write = function(chunk) {
        chunks.push(chunk);

        oldWrite.apply(res, arguments);
    };

    res.end = function(chunk) {
        if (chunk)
            chunks.push(chunk);

        var body = Buffer.concat(chunks).toString('utf8');
        res._body = body;

        oldEnd.apply(res, arguments);
    };

    next();
}