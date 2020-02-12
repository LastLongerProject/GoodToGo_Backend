const jwt = require('jsonwebtoken');
const debug = require('../helpers/debugger')('socket');
const keys = require('../config/keys');
const User = require('../models/DB/userDB');
const Trade = require('../models/DB/tradeDB');
const UserKeys = require('../models/DB/userKeysDB');
const Container = require('../models/DB/containerDB');
const RoleElement = require('../models/enums/userEnum').RoleElement;
const ContainerAction = require('../models/enums/containerEnum').Action;
const ContainerState = require('../models/enums/containerEnum').State;
const validateStateChanging = require('../helpers/toolkit').validateStateChanging;
const DEMO_CONTAINER_ID_LIST = require('../config/config').demoContainers;

const status = ['delivering', 'readyToUse', 'rented', 'returned', 'notClean', 'boxed'];
const actionTodo = [ContainerAction.DELIVERY, ContainerAction.SIGN, ContainerAction.RENT, ContainerAction.RETURN, ContainerAction.RELOAD, ContainerAction.BOXING, ContainerAction.DIRTY_RETURN];

const namespace = Object.freeze({
    CHALLENGE: "/containers/challenge/socket",
    SERVER_EVENT: "/serverEvent"
});

module.exports = {
    namespace,
    generateToken: function (thisNamespace) {
        return function (req, res, next) {
            var dbUser = req._user;
            keys.serverSecretKey(function (err, serverSecretKey) {
                if (err) return next(err);
                var date = new Date();
                var token = jwt.sign({
                    'iat': Date.now(),
                    'exp': date.setMinutes(date.getMinutes() + 5),
                    'user': dbUser.user.phone
                }, serverSecretKey);
                res.json({
                    uri: thisNamespace,
                    token: token
                });
            });
        };
    },
    auth: function (socket, next) {
        var handShakeData = socket.request;
        debug.log(handShakeData.url);
        if (!handShakeData._query.token || !handShakeData._query.apikey) {
            debug.log('[SOCKET] EMIT "error": "Authentication error (Missing Something)"');
            return next(new Error('Authentication error (Missing Something)'));
        }
        UserKeys.findOne({
            'apiKey': handShakeData._query.apikey
        }, function (err, dbKey) {
            if (err) return debug.error(err);
            keys.serverSecretKey(function (err, serverSecretKey) {
                if (err) return debug.error(err);
                let thisErr;
                jwt.verify(handShakeData._query.token, serverSecretKey, (err, decoded) => {
                    if (err || !decoded || !decoded.user || !decoded.exp || !decoded.iat || decoded.exp < Date.now() || !dbKey || decoded.user !== dbKey.phone) {
                        if (err || !decoded) {
                            thisErr = "Can't Decode";
                        } else if (!decoded.user || !decoded.exp || !decoded.iat) {
                            thisErr = "Token Payload Missing Something";
                        } else if (decoded.exp < Date.now()) {
                            thisErr = "Token Expired";
                        } else if (!dbKey) {
                            thisErr = "Can't Find User by Apikey";
                        } else if (decoded.user !== dbKey.phone) {
                            thisErr = "User & Apikey Mismatch";
                        } else {
                            thisErr = "Unknown Err";
                        }
                        debug.log('[SOCKET] EMIT "error": "Authentication error (' + thisErr + ')"');
                        return next(new Error('Authentication error (' + thisErr + ')'));
                    } else {
                        socket._user = decoded.user;
                        socket._roleID = dbKey.roleId;
                        next();
                    }
                });
            });
        });
    },
    challenge: function (socket) {
        socket.emitWithLog = addLog(socket);
        let next = nextInit(socket);

        socket.emitWithLog('connection', {
            message: 'auth succeed'
        });
        socket.on('challenge', function (data) {
            if (!data) {
                return next({
                    code: "Err1",
                    msg: "Request Format Invalid (No Args)"
                });
            }
            var containerID = data.containerID;
            let requestID = data.requestID;
            var action = data.action;
            debug.log("[" + socket._user + "] ON \"challenge\": " + containerID + ", " + action);
            if (typeof containerID !== 'number' || typeof action !== "string") {
                return next({
                    code: "Err1",
                    msg: "Request Format Invalid"
                });
            }
            var newState = actionTodo.indexOf(action);
            if (newState === -1) return next({
                code: "Err1",
                msg: "Request Format Invalid (ContainerAction Invalid)"
            });
            Container.findOne({
                'ID': containerID
            }, function (err, theContainer) {
                if (err) return next(err);
                if (!theContainer)
                    return next({
                        code: 'Err2',
                        msg: 'No Container Found',
                        data: {
                            id: containerID
                        }
                    });
                if (DEMO_CONTAINER_ID_LIST.indexOf(containerID) !== -1)
                    return socket.emitWithLog('reply', {
                        id: containerID,
                        succeed: true,
                        requestID: requestID,
                        message: "Can be " + action,
                        originalState: theContainer.statusCode,
                        newState: newState
                    });
                if (!theContainer.active)
                    return next({
                        code: 'Err3',
                        msg: 'Container Inactive',
                        data: {
                            id: containerID
                        }
                    });
                validateStateChanging(false, theContainer.statusCode, newState, function (succeed) {
                    return socket.emitWithLog('reply', {
                        id: containerID,
                        requestID: requestID,
                        succeed: succeed,
                        message: "Can" + (succeed ? "" : " NOT") + " be " + action,
                        originalState: theContainer.statusCode,
                        newState: newState
                    });
                });
            });
        });
        socket.on('data_get', function (data) {
            debug.log("[" + socket._user + "] ON \"data_get\": " + data);
            if (typeof data !== "string") {
                return next({
                    code: "Err1",
                    msg: "Request Format Invalid"
                });
            }
            if (data === "storeAmount") {
                User.findOne({
                    "user.phone": socket._user
                }, (err, theUser) => {
                    if (err) return next(err);
                    if (!theUser) return next(`Can't find User:${socket._user}`);
                    const dbRole = theUser.getRoleByID(socket._roleID);
                    let storeID;
                    try {
                        storeID = dbRole.getElement(RoleElement.STORE_ID, false);
                    } catch (error) {
                        return next(error);
                    }
                    Trade.count({
                        'tradeType.action': ContainerAction.RENT,
                        "tradeType.oriState": ContainerState.READY_TO_USE,
                        'oriUser.storeID': storeID
                    }, (err, amount) => {
                        if (err) return next(err);
                        return socket.emitWithLog('data_reply', amount);
                    });
                });
            } else {
                return next({
                    code: "Err1",
                    msg: "Request Format Invalid (Req Data Is Not Supported)"
                });
            }
        });
    },
    serverEvent: function (socket) {

    }
};

var addLog = socket => (flag, data) => {
    debug.log("[" + socket._user + "] EMIT \"" + flag + "\": " + JSON.stringify(data));
    return socket.emit(flag, data);
};

function nextInit(socket) {
    socket.on("error", (args) => {});
    return function next(err) {
        if (typeof err === "undefined") err = {};
        socket.emitWithLog('request_error', {
            code: err.code || "Err0",
            message: err.msg || "Unknown Error",
            data: err.data || (err.code && err.msg) ? undefined : JSON.stringify(err)
        });
    };
}