const oriDebug = require("debug");

module.exports = namespace => {
    namespace = `goodtogo_backend:${namespace}`;
    const log = oriDebug(namespace);
    const error = oriDebug(namespace);
    log.log = console.log.bind(console);

    return {
        log,
        error
    };
};