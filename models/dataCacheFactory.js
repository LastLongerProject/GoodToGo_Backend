const storage = {};

module.exports = {
    set: function (key, newData) {
        storage[key] = newData;
    },
    get: function (key) {
        if (storage[key]) return storage[key];
        else return null;
    },
    keys: Object.freeze({
        STORE: "store",
        CONTAINER_TYPE: "containerType",
        CONTAINER_WITH_DEACTIVE: "containerWithDeactive",
        CONTAINER_ONLY_ACTIVE: "container",
        COUPON_TYPE: "couponType",
        SOCKET_EMITTER: "SocketEmitter"
    })
};