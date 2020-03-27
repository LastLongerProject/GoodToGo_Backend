const queueStorage = {};

module.exports = function throttle(senderGenerater, delay, batch) {
    let timer;
    if (!senderGenerater) throw new Error("senderGenerater undefined");
    if (!batch) batch = 150;
    if (!delay) delay = 1000;
    return function (url, preprocessedMsg) {
        const sendEvent = function () {
            clearQueue(url, senderGenerater);
        };
        if (queueingAmount(url) < batch) {
            clearTimeout(timer);
            addToQueue(url, preprocessedMsg);
            timer = setTimeout(sendEvent, delay);
        } else {
            addToQueue(url, preprocessedMsg);
            sendEvent();
        }
    }
};

function queueingAmount(url) {
    if (!queueStorage[url]) return 0;
    return queueStorage[url].length;
}

function clearQueue(url, senderGenerater) {
    if (!queueStorage[url]) return null;
    const toSend = {
        events: queueStorage[url]
    };
    queueStorage[url] = [];
    senderGenerater(toSend)(url);
}

function addToQueue(url, preprocessedMsg) {
    if (!queueStorage[url]) {
        queueStorage[url] = [];
    }
    queueStorage[url].push(preprocessedMsg);
}