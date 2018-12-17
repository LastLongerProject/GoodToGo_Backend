const config = require('../config/config');

const debug = require('../helpers/debugger')('redis');

const redis = require('redis');
const redisClient = redis.createClient(6379, config.redisUrl, {
    password: config.redisPass
});
redisClient.on('ready', function () {
    debug.log('redisDB ready');
});

redisClient.on('connect', function () {
    debug.log('redisDB connect');
});

redisClient.on('reconnecting', function (delay, attempt) {
    debug.log('redisDB reconnecting');
});

redisClient.on('error', function (err) {
    debug.error('redisDB err ', err);
});

module.exports = redisClient;