const http = require('http');
const path = require('path');
const logger = require('morgan');
const express = require('express');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const URL = require('url');
const uuid = require('uuid/v4');
const helmet = require('helmet');
const timeout = require('connect-timeout');
const ua = require('universal-analytics');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const debug = require('./helpers/debugger')('app');
const config = require('./config/config');
const logModel = require('./models/DB/logDB');
const DataCacheFactory = require('./models/dataCacheFactory');
const mSocket = require('./controllers/socket');
const logSystem = require('./middlewares/logSystem');
const task = require('./routes/task');
const users = require('./routes/users');
const stores = require('./routes/stores');
const images = require('./routes/images');
const manage = require('./routes/manage');
const coupon = require('./routes/coupon');
const userOrder = require('./routes/userOrder');
const deliveryList = require('./routes/deliveryList.js');
const containers = require('./routes/containers');
const foodpandaOrder = require('./routes/foodpandaOrder');

const app = express();
let io = require('socket.io');
let esm;

app.use("/ping", (req, res) => res.end("pong"));
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
app.use(cors());
app.use(GAtrigger()); // Trigger Google Analytics
app.use((req, res, next) => {
    if (!esm) {
        esm = require('express-status-monitor')({
            title: "GoodToGo Backend Monitor",
            websocket: app.get('socket.io'),
            socketPath: `${(config.serverEnv === null? "": ("/" + config.serverEnv))}/socket.io`
        });
    }
    esm(req, res, next);
});

app.use('/manage', (req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${60 * 5}`);
    next();
}, manage);

app.use('/images', (req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${60 * 60 * 24 * 3}`);
    next();
}, images);

app.use(timeout('10s'));
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache');
    next();
});
app.use('/task', task);
app.use('/users', users);
app.use('/stores', stores);
app.use('/coupon', coupon);
app.use('/userOrder', userOrder);
app.use('/containers', containers);
app.use('/deliveryList', deliveryList);
app.use('/foodpandaOrder', foodpandaOrder)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});
// error handler
app.use(function (err, req, res, next) {
    if (!err.status) {
        debug.error(err);
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

require("./models/redis");
require("./models/mongo")(mongoose, startServer);

process.on('SIGINT', () => {
    debug.log('SIGINT signal received');
    let server = app.get('server');
    if (typeof server !== "undefined") {
        server.close(function (err) {
            if (err) {
                debug.error(err);
            }
            mongoose.connection.close(function () {
                debug.log('Mongoose connection disconnected');
            });
        });
    }
});

function startServer(err) {
    if (err) {
        debug.error(err);
        return process.exit(1);;
    }
    /**
     * Get port from environment and store in Express.
     */
    var port = normalizePort(process.env.PORT || '3030');
    app.set('port', port);

    /**
     * Create HTTP server.
     */
    var server = http.createServer(app);

    /**
     * Listen on provided port, on all network interfaces.
     */
    server.listen(port);
    server.on('error', onError());
    server.on('listening', onListening(server));
    app.set('server', server);
    io = io(server);
    io.of(mSocket.namespace.CHALLENGE)
        .use(mSocket.auth)
        .on('connection', mSocket.challenge);
    let SocketEmitter = io.of(mSocket.namespace.SERVER_EVENT)
        .use(mSocket.auth)
        .on('connection', mSocket.serverEvent);
    app.set('socket.io', io);
    DataCacheFactory.set(DataCacheFactory.keys.SOCKET_EMITTER, SocketEmitter);
    process.send('ready');
}

// cookie middleware (just for identify user)
function cookieMid() {
    let url = URL.parse(config.serverUrl);
    if (!url.slashes) url = URL.parse(`http://${config.serverUrl}`);
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
            let uid = uuid();
            res.cookie("uid", uid, cookieOptions);
            req._uid = uid;
        }
        next();
    };
}

// GA
function GAtrigger() {
    const gaErrHandler = err => {
        if (err) debug.error('Failed to trigger GA: ' + err);
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

function resBodyParser(req, res, next) {
    var oldWrite = res.write,
        oldEnd = res.end;

    var chunks = [];

    res.write = function (chunk) {
        if (!Buffer.isBuffer(chunk))
            chunk = new Buffer.from(chunk);
        chunks.push(chunk);

        oldWrite.apply(res, arguments);
    };

    res.end = function (chunk) {
        if (typeof chunk !== 'undefined') {
            if (!Buffer.isBuffer(chunk))
                chunk = new Buffer.from(chunk);
            chunks.push(chunk);
        }

        var body = Buffer.concat(chunks).toString('utf8');
        res._body = body;

        oldEnd.apply(res, arguments);
    };

    next();
}

function cors() {
    return function cors(req, res, next) {
        if (!res.headersSent) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Expose-Headers", "Authorization");
            res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, apikey, authorization, reqid, reqtime, line-id");
        }
        return next();
    };
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
function onError() {
    return function onErrorfunction(error) {
        if (error.syscall !== 'listen') {
            throw error;
        }

        var bind = typeof port === 'string' ?
            'Pipe ' + app.get('port') :
            'Port ' + app.get('port');

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
    };
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening(server) {
    return function onListening() {
        var addr = server.address();
        var bind = typeof addr === 'string' ?
            'pipe ' + addr :
            'port ' + addr.port;
        debug.log('Listening on ' + bind);
    };
}

module.exports = app;