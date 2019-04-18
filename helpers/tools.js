const DataCacheFactory = require("../models/dataCacheFactory.js");

exports.getDeliverContent = function (containerList) {
    let container = DataCacheFactory.get('containerWithDeactive');
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

exports.transContainerType = function (typeCode) {
    let storeList = DataCacheFactory.get('store');
    return storeList[String(typeCode)].name;
}

exports.generateUUID = function () {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}