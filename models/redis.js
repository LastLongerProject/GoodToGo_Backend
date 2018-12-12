const config = require('../config/config');

const debug = require('debug')('goodtogo_backend:redis');
debug.log = console.log.bind(console);
const debugError = require('debug')('goodtogo_backend:redisERR');
const redis = require('redis');
const redisClient = redis.createClient(6379, config.redisUrl, {
    password: config.redisPass
});
redisClient.on('ready', function () {
    debug('redisDB ready');
});

redisClient.on('connect', function () {
    debug('redisDB connect');
});

redisClient.on('reconnecting', function (delay, attempt) {
    debug('redisDB reconnecting');
});

redisClient.on('error', function (err) {
    debugError('redisDB err ', err);
});

module.exports = redisClient;