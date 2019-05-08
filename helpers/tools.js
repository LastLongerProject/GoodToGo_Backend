const getDateCheckpoint = require('@lastlongerproject/toolkit').getDateCheckpoint;

const DataCacheFactory = require("../models/dataCacheFactory.js");

exports.getDeliverContent = function (containerList) {
    let container = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_WITH_DEACTIVE);
    let deliverContent = {};
    containerList.forEach(element => {
        if (!deliverContent[container[element]]) deliverContent[container[element]] = {
            amount: 0
        };
        deliverContent[container[element]]['amount']++;
    });

    return Object.keys(deliverContent).map(containerType => {
        return {
            containerType,
            amount: deliverContent[containerType]['amount']
        }
    });
}

exports.generateUUID = function () {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

exports.computeDaysOfUsing = function (dateToCompute, now) {
    return Math.ceil((now - getDateCheckpoint(dateToCompute)) / (1000 * 60 * 60 * 24));
}