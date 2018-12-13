const storage = {};

module.exports = {
    set: function (key, newData) {
        storage[key] = newData;
    },
    get: function (key) {
        if (storage[key]) return storage[key];
        else return null;
    }
};