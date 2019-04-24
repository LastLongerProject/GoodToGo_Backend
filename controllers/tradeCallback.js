const debug = require('../helpers/debugger')('tradeCallback');

const PointLog = require('../models/DB/pointLogDB');
const UserOrder = require('../models/DB/userOrderDB');
const DataCacheFactory = require('../models/dataCacheFactory');

const checkUserShouldUnban = require('../helpers/appInit').checkUsersShouldBeBanned;
const NotificationCenter = require('../helpers/notifications/center');
const NotificationEvent = require('../helpers/notifications/enums/events');

module.exports = {
    return: function (tradeDetail, options) {
        if (tradeDetailIsEmpty(tradeDetail)) return;
        if (!options) options = {};
        tradeDetail.forEach((aTradeDetail) => {
            UserOrder.updateOne({
                "containerID": aTradeDetail.container.ID,
                "archived": false
            }, {
                "archived": true
            }, (err) => {
                if (err) return debug.error(err);
            });
        });
        integrateTradeDetailForNotification(tradeDetail,
                aTradeDetail => aTradeDetail.oriUser,
                aTradeDetail => aTradeDetail.container)
            .forEach(aCustomerTradeDetail => {
                checkUserShouldUnban(false, aCustomerTradeDetail.customer);
                NotificationCenter.emit(NotificationEvent.CONTAINER_RETURN, {
                    customer: aCustomerTradeDetail.customer
                }, {
                    containerList: aCustomerTradeDetail.containerList
                });
            });
        const toStore = typeof options.storeID === "undefined" ?
            tradeDetail[0].newUser.roles.clerk.storeID :
            options.storeID;
        integrateTradeDetailForPoint(tradeDetail,
                aTradeDetail => `${aTradeDetail.oriUser.user.phone}-${toStore}`, {
                    container: aTradeDetail => aTradeDetail.container.ID,
                    customer: aTradeDetail => aTradeDetail.oriUser
                })
            .forEach(aTradeDetail => {
                const dbCustomer = aTradeDetail.customer;
                if (!dbCustomer.hasPurchase || !dbCustomer.agreeTerms) return null;
                const containerList = aTradeDetail.containerList;
                const quantity = containerList.length;
                const storeDict = DataCacheFactory.get("store");
                let newPointLog = new PointLog({
                    user: dbCustomer._id,
                    title: `歸還了${quantity}個容器`,
                    body: `${storeDict[toStore].name}`,
                    quantityChange: quantity
                });
                NotificationCenter.emit(NotificationEvent.CONTAINER_RETURN_LINE, {
                    customer: dbCustomer
                }, {
                    amount: quantity,
                    point: quantity
                });
                newPointLog.save((err) => {
                    if (err) debug.error(err);
                });
                dbCustomer.point += quantity;
                dbCustomer.save((err) => {
                    if (err) debug.error(err);
                });
            });
    }
};

function tradeDetailIsEmpty(tradeDetail) {
    return !(tradeDetail && tradeDetail.length > 0);
}

function integrateTradeDetailForNotification(oriTradeDetail, keyGenerator, dataExtractor) {
    let seen = {};
    oriTradeDetail.forEach(ele => {
        let thisKey = keyGenerator(ele);
        let thisData = dataExtractor(ele);
        if (seen.hasOwnProperty(thisKey)) seen[thisKey].containerList.push(thisData);
        else seen[thisKey] = {
            customer: thisKey,
            containerList: [thisData]
        };
    });
    return Object.values(seen);
}

function integrateTradeDetailForPoint(oriTradeDetail, keyGenerator, dataExtractor) {
    let seen = {};
    oriTradeDetail.forEach(ele => {
        let thisKey = keyGenerator(ele);
        let thisContainerID = dataExtractor.container(ele);
        if (seen.hasOwnProperty(thisKey)) seen[thisKey].containerList.push(thisContainerID);
        else seen[thisKey] = {
            customer: dataExtractor.customer(ele),
            containerList: [thisContainerID]
        };
    });
    return Object.values(seen);
}