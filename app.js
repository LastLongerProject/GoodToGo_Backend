const http = require('http');
const path = require('path');
const logger = require('morgan');
const express = require('express');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const URL = require('url');
const uuid = require('uuid/v4');
const mongoose = require('mongoose');
const helmet = require('helmet');
const timeout = require('connect-timeout');
const ua = require('universal-analytics');
const debug = require('debug')('goodtogo_backend:app');
debug.log = console.log.bind(console);
const debugError = require('debug')('goodtogo_backend:appERR');

const config = require('./config/config');
const appInit = require('./helpers/appInit');
const scheduler = require('./helpers/scheduler');
const logModel = require('./models/DB/logDB');
const socketCb = require('./controllers/socket');
const logSystem = require('./middlewares/logSystem');
const users = require('./routes/users');
const stores = require('./routes/stores');
const images = require('./routes/images');
const manage = require('./routes/manage');
const containers = require('./routes/containers');

const app = express();
let io = require('socket.io');
let esm;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'public/favicon.ico')));
app.use(logger(':date - :method :url HTTP/:http-version :status - :response-time ms'));
app.use(logSystem(logModel));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser(config.cookie.sign));
app.use(cookieMid());
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

mongoose.Promise = global.Promise;
connectMongoDB();
require("./models/redis");

app.use('/manage', manage);
app.use(timeout('10s'));

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
    if (!err.status) {
        debugError(err);
        req._errorLevel = 3;
        res.status(500);
        res.json({
            code: 'Z002',
            type: 'globalError',
            message: 'Unexpect Error',
            data: (process.env.NODE_ENV && process.env.NODE_ENV.replace(/"|\s/g, "") !== "production") ? err.toString() : undefined
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


/**
 * Get port from environment and store in Express.
 */
var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */
var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

io = io(server);
io.of('/containers/challenge/socket')
    .use(socketCb.auth)
    .on('connection', socketCb.init);
app.set('socket.io', io);

// cookie middleware (just for identify user)
function cookieMid() {
    let url = URL.parse(config.serverBaseUrl);
    if (!url.slashes) url = URL.parse(`http://${config.serverBaseUrl}`);
    const cookieOptions = {
        domain: url.hostname,
        path: url.path,
        secure: url.protocol === "https:",
        maxAge: 1000 * 60 * 60 * 24 * 5000,
        httpOnly: true,
        signed: true
    };

    return function cookieMid(req, res, next) {
        if (!req.signedCookies.uid) {
            res.cookie("uid", uuid(), cookieOptions);
        }
        next();
    };
}

// GA
function GAtrigger() {
    const gaErrHandler = err => {
        if (err) debugError('Failed to trigger GA: ' + err);
    };
    return function GAtrigger(req, res, next) {
        if (req._realIp) {
            let visitor = ua(config.GA_TRACKING_ID, req.signedCookies.uid);
            visitor.set('ua', req.headers['user-agent']);
            visitor.set('uip', req._realIp);
            visitor.pageview(req.url, gaErrHandler);
        }
        next();
    };
}

function connectMongoDB() {
    mongoose.connect(config.dbUrl, config.dbOptions, function (err) {
        if (err) throw err;
        debug('mongoDB connect succeed');
        // require('./tmp/changeTradeTime')
        appInit.container(app);
        appInit.store(app);
        if (process.env.NODE_ENV && process.env.NODE_ENV.replace(/"|\s/g, "") === "develop") {
            scheduler(app);
        } else if (process.env.NODE_ENV && process.env.NODE_ENV.replace(/"|\s/g, "") === "testing") {
            debug("Local Testing no scheduler");
        } else {
            debug("Deploy Server no scheduler");
        }
    });
    mongoose.connection.on('error', err => debugError(`MongoDB connection error: ${err}`));
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

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    var bind = typeof port === 'string' ?
        'Pipe ' + port :
        'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string' ?
        'pipe ' + addr :
        'port ' + addr.port;
    debug('Listening on ' + bind);
}