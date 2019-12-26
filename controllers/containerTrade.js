const queue = require('queue')({
    concurrency: 1,
    autostart: true
});

const debug = require('../helpers/debugger')('containerTrade');
const DEMO_CONTAINER_ID_LIST = require('../config/config').demoContainers;
const validateStateChanging = require('../helpers/toolkit').validateStateChanging;
const bindFunction = require('../helpers/toolkit').bindFunction;
const DataCacheFactory = require("../models/dataCacheFactory");
const Container = require('../models/DB/containerDB');
const Trade = require('../models/DB/tradeDB');
const User = require('../models/DB/userDB');
const Box = require('../models/DB/boxDB');

const status = ['delivering', 'readyToUse', 'rented', 'returned', 'notClean', 'boxed'];
const REAL_ID_RANGE = 99900;

function uniArr(oriArr) {
    return Array.from(new Set(oriArr));
}

function changeContainersState(reqContainers, reqUser, stateChanging, options, done) {
    let containers;
    if (!Array.isArray(reqContainers))
        containers = [reqContainers];
    else
        containers = uniArr(reqContainers);
    if (containers.length < 1)
        return done(null, false, {
            code: 'F002',
            message: 'No container found'
        });
    if (!stateChanging || typeof stateChanging.newState !== "number" || typeof stateChanging.action !== "string")
        throw new Error("Arguments Not Complete");
    const messageType = stateChanging.action + 'Message';
    const consts = {
        containerTypeDict: DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE)
    };

    let tradeTime;
    if (options && options.orderTime) tradeTime = options.orderTime; // Rent Return ReadyToClean NEED
    else tradeTime = Date.now();
    Object.assign(stateChanging, {
        tradeTime
    });

    Promise
        .all(containers.map(stateChangingTask(reqUser, stateChanging, options, consts)))
        .then(taskResults => {
            let oriUser;
            let tradeDetail = [];
            let replyTxt;
            let dataSavers = [];
            let errorListArr = [];
            let errorDictArr = [];
            taskResults.forEach(aResult => {
                if (aResult.txt) replyTxt = aResult.txt;
                if (aResult.oriUser) oriUser = aResult.oriUser;
                if (aResult.errorList) errorListArr.push(aResult.errorList);
                if (aResult.errorDict) errorDictArr.push(aResult.errorDict);
                if (aResult.dataSaver) dataSavers.push({
                    containerID: aResult.ID,
                    saver: aResult.dataSaver
                });
                if (aResult.tradeDetail) tradeDetail.push(aResult.tradeDetail);
            });

            let allSucceed = taskResults.every(aResult => aResult.succeed);
            if (allSucceed) {
                Promise
                    .all(dataSavers.map(aDataSaver => new Promise(aDataSaver.saver)))
                    .then(containerList => {
                        return done(null, true, {
                            type: messageType,
                            message: replyTxt || stateChanging.action + ' Succeeded',
                            oriUser: oriUser,
                            containerList
                        }, tradeDetail);
                    }).catch(done);
            } else {
                return done(null, false, {
                    code: 'F001',
                    type: messageType,
                    message: "State Changing Invalid",
                    stateExplanation: status,
                    listExplanation: ["containerID", "originalState", "newState", "boxID"],
                    errorList: errorListArr,
                    errorDict: errorDictArr
                });
            }
        })
        .catch(err => {
            if (typeof err.code !== "undefined") {
                Object.assign(err, {
                    type: messageType
                });
                return done(null, false, err);
            } else {
                return done(err);
            }
        });
}

function stateChangingTask(reqUser, stateChanging, option, consts) {
    const action = stateChanging.action;
    const tradeTime = stateChanging.tradeTime;
    const options = option || {};
    const boxID = options.boxID; // Boxing Delivery Sign NEED
    const storeID = options.storeID; // Delivery Sign Rent Return NEED
    const rentToUser = options.rentToUser || null; // Rent NEED
    const inLineSystem = options.inLineSystem; // Rent NEED
    const activity = options.activity || null; // Deliver NEED
    const bypassStateValidation = options.bypassStateValidation || false;
    const containerTypeDict = consts.containerTypeDict;
    return function trade(aContainer) {
        return new Promise((oriResolve, oriReject) => {
            queue.push(doneThisTask => {
                let newUser = reqUser;
                const resolve = bindFunction(doneThisTask, oriResolve, {
                    succeed: true
                });
                const resolveWithErr = bindFunction(doneThisTask, oriResolve, {
                    succeed: false
                });
                const reject = bindFunction(doneThisTask, oriReject);
                let aContainerId = parseInt(aContainer);
                if (isNaN(aContainerId))
                    return reject({
                        code: 'F???',
                        message: 'Container ID Type Invalid',
                        data: aContainer
                    });
                if (DEMO_CONTAINER_ID_LIST.indexOf(aContainerId) !== -1)
                    return resolve({
                        ID: aContainerId,
                        txt: "DEMO container"
                    });
                Container.findOne({
                    'ID': aContainerId
                }, function (err, theContainer) {
                    if (err)
                        return reject(err);
                    if (!theContainer)
                        return reject({
                            code: 'F002',
                            message: 'No container found',
                            data: aContainerId
                        });
                    if (!theContainer.active && theContainer.ID < REAL_ID_RANGE)
                        return reject({
                            code: 'F003',
                            message: 'Container not available',
                            data: aContainerId
                        });
                    const newState = stateChanging.newState;
                    const oriState = theContainer.statusCode;
                    if (action === 'Rent' && theContainer.storeID !== storeID)
                        return reject({
                            code: 'F010',
                            message: "Container not belone to user's store"
                        });
                    else if (action === 'Return' && oriState === 3) // 髒杯回收時已經被歸還過
                        return resolve({
                            ID: aContainerId,
                            txt: "Already Return"
                        });
                    validateStateChanging(bypassStateValidation, oriState, newState, function (succeed) {
                        if (!succeed) {
                            let errorList = [aContainerId, oriState, newState];
                            let errorDict = {
                                containerID: aContainerId,
                                originalState: oriState,
                                newState: newState
                            };
                            let errorMsg = {
                                errorList,
                                errorDict
                            };

                            if (oriState === 0 || oriState === 1) {
                                Box.findOne({
                                    'containerList': {
                                        '$all': [aContainerId]
                                    }
                                }, function (err, aBox) {
                                    if (err) return reject(err);
                                    if (!aBox) return resolveWithErr(errorMsg);
                                    errorList.push(aBox.boxID);
                                    errorDict.boxID = aBox.boxID;
                                    return resolveWithErr(errorMsg);
                                });
                            } else {
                                return resolveWithErr(errorMsg);
                            }
                        } else {
                            getOriUser(action, theContainer, rentToUser, function (err, oriUser) {
                                if (err)
                                    return reject(err);
                                if (!oriUser) {
                                    debug.error('Containers state changing unexpect err. Data : ' + JSON.stringify(theContainer) +
                                        ' ID in uri : ' + aContainerId);
                                    return reject({
                                        code: 'F004',
                                        message: 'No user found'
                                    });
                                }

                                let storeID_newUser, storeID_oriUser;
                                if (action === 'Sign') {
                                    storeID_newUser = storeID;
                                } else if (action === 'Rent') {
                                    let tmp = oriUser;
                                    oriUser = newUser;
                                    newUser = tmp;
                                    storeID_oriUser = storeID;
                                } else if (action === 'Return') {
                                    storeID_newUser = storeID;
                                    if (typeof theContainer.storeID !== 'undefined') storeID_oriUser = theContainer.storeID; // 髒杯回收未借出
                                } else if (action === 'ReadyToClean') {
                                    storeID_oriUser = theContainer.storeID;
                                } else if (action === 'Delivery') {
                                    storeID_newUser = storeID;
                                    theContainer.cycleCtr++;
                                } else if (action === 'CancelDelivery' || action === 'UnSign') {
                                    theContainer.cycleCtr--;
                                } else if (action === 'Boxing') {
                                    theContainer.boxID = boxID;
                                }
                                theContainer.statusCode = newState;
                                theContainer.conbineTo = newUser.user.phone;
                                theContainer.lastUsedAt = Date.now();
                                theContainer.inLineSystem = inLineSystem;
                                if (action === 'Sign' || action === 'Return') theContainer.storeID = storeID_newUser;
                                else theContainer.storeID = null;

                                let newTrade = new Trade({
                                    tradeTime,
                                    tradeType: {
                                        action,
                                        oriState,
                                        newState
                                    },
                                    oriUser: {
                                        phone: oriUser.user.phone,
                                        storeID: storeID_oriUser
                                    },
                                    newUser: {
                                        phone: newUser.user.phone,
                                        storeID: storeID_newUser
                                    },
                                    container: {
                                        id: theContainer.ID,
                                        typeCode: theContainer.typeCode,
                                        cycleCtr: theContainer.cycleCtr,
                                        box: boxID,
                                        inLineSystem: theContainer.inLineSystem
                                    },
                                    activity
                                });

                                resolve({
                                    ID: aContainerId,
                                    oriUser: oriUser.user.phone,
                                    dataSaver: (doneSave, getErr) => {
                                        newTrade.save(err => {
                                            if (err) return getErr(err);
                                            theContainer.save(err => {
                                                if (err) return getErr(err);
                                                doneSave({
                                                    id: theContainer.ID,
                                                    typeCode: theContainer.typeCode,
                                                    typeName: (containerTypeDict[theContainer.typeCode] && containerTypeDict[theContainer.typeCode].name) || '未知的容器'
                                                });
                                            });
                                        });
                                    },
                                    tradeDetail: action === "Rent" || (action === "Return" && oriState === 2) ? {
                                        oriUser,
                                        newUser,
                                        container: theContainer
                                    } : null
                                });
                            });
                        }
                    });
                });
            });
        });
    };
}

function getOriUser(action, theContainer, rentToUser, cb) {
    if (action === "Rent" && rentToUser) return cb(null, rentToUser);
    else return User.findOne({
        'user.phone': theContainer.conbineTo
    }, cb);
}

module.exports = changeContainersState;