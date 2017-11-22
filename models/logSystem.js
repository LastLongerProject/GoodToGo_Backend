module.exports = logger

var debug = require('debug')('log')
var debugERR = require('debug')('goodtogo_backend:logERR')
var onFinished = require('on-finished')
var onHeaders = require('on-headers')

/**
 * Array of CLF month names.
 * @private
 */

var CLF_MONTH = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

function logger(dbModel) {
    var localdbModel = dbModel;

    return function logger(req, res, next) {

        var aRecord = new localdbModel();

        // request data
        req._startAt = undefined
        req._startTime = undefined
        req._remoteAddress = getip(req)

        // response data
        res._startAt = undefined
        res._startTime = undefined

        // record request start
        recordStartTime.call(req)

        function logRequest() {

            aRecord.ip = getip(req)
            if (aRecord.ip === '::1') {
                return
            }
            aRecord.url = getUrlToken(req)
            aRecord.method = getMethodToken(req)
            aRecord.httpVersion = getHttpVersionToken(req)
            aRecord.req = {
                date: getDateToken(req, res, 'clt'),
                headers: getHeadersToken(req),
                payload: res._payload,
                body: getBodyToken(req)
            }
            aRecord.res = {
                time: getResponseTimeToken(req, res),
                status: getStatusToken(req, res),
                headers: getResponseHeadersToken(res),
                body: getResponseBodyToken(res)
            }
            aRecord.user = getUser(req)
            aRecord.noticeLevel = getErrorLevel(req, res)
                /**
                 * 0 : regular 200 404
                 * 1 : notice(client error) 401 503
                 * 2 : warning(unusual error) 403
                 * 3 : error(may cause crash) 500
                 * 4 : user-defined important message
                 * 5 : unknown level
                 */

            if (aRecord.req.body) {
                if (aRecord.req.body.password) {
                    aRecord.req.body.password = 'pwd'
                }
            }

            aRecord.save((err) => {
                if (err) debugERR(err)
            })

            debug('log request')
        };

        // record response start
        onHeaders(res, recordStartTime)

        // log when response finished
        onFinished(res, logRequest)

        next()
    }
}

/**
 * Get request IP address.
 */

function getip(req) {
    return req.ip ||
        req._remoteAddress ||
        (req.connection && req.connection.remoteAddress) ||
        undefined
}

/**
 * request url
 */

function getUrlToken(req) {
    return req.originalUrl || req.url
}

/**
 * request method
 */

function getMethodToken(req) {
    return req.method
}

/**
 * HTTP version
 */

function getHttpVersionToken(req) {
    return req.httpVersionMajor + '.' + req.httpVersionMinor
}

/**
 * current date
 */

function getDateToken(req, res, format) {
    var date = new Date()

    switch (format || 'web') {
        case 'clf':
            return clfdate(date)
        case 'iso':
            return date.toISOString()
        case 'web':
            return date.toUTCString()
    }
}

/**
 * request headers
 */

function getHeadersToken(req) {
    return req.headers
}

/**
 * request body
 */

function getBodyToken(req) {
    return req.body || undefined
}

/**
 * response time in milliseconds
 */

function getResponseTimeToken(req, res, digits) {
    if (!req._startAt || !res._startAt) {
        // missing request and/or response start time
        return
    }

    // calculate diff
    var ms = (res._startAt[0] - req._startAt[0]) * 1e3 +
        (res._startAt[1] - req._startAt[1]) * 1e-6

    // return truncated value
    return ms.toFixed(digits === undefined ? 3 : digits)
}

/**
 * response status code
 */

function getStatusToken(req, res) {
    return res._header ?
        res.statusCode :
        null
}

/**
 * response headers
 */

function getResponseHeadersToken(res) {
    return res._headers
}

/**
 * response body
 */

function getResponseBodyToken(res) {
    if (res.get('Content-Type') === 'application/json; charset=utf-8') {
        var returnValue
        try {
            returnValue = JSON.parse(res._body)
        } catch (error) {
            returnValue = res._body
        }
        return returnValue
    } else return undefined
}

/**
 * response body
 */

function getUser(req) {
    return (req._user) ? req._user.user.phone : undefined
}

/**
 * error level
 */

function getErrorLevel(req, res) {
    if (!req._errorLevel) {
        switch (getStatusToken(req, res)) {
            case 200:
            case 301:
            case 304:
            case 404:
                req._errorLevel = 0
                break
            case 401:
            case 503:
                req._errorLevel = 1
                break
            case 403:
                req._errorLevel = 2
                break
            case 500:
                req._errorLevel = 3
                break
            default:
                req._errorLevel = 5
                break
        }
    }
    return req._errorLevel
}

/**
 * Format a Date in the common log format.
 *
 * @private
 * @param {Date} dateTime
 * @return {string}
 */

function clfdate(dateTime) {
    var date = dateTime.getUTCDate()
    var hour = dateTime.getUTCHours()
    var mins = dateTime.getUTCMinutes()
    var secs = dateTime.getUTCSeconds()
    var year = dateTime.getUTCFullYear()

    var month = CLF_MONTH[dateTime.getUTCMonth()]

    return pad2(date) + '/' + month + '/' + year +
        ':' + pad2(hour) + ':' + pad2(mins) + ':' + pad2(secs) +
        ' +0000'
}

/**
 * Pad number to two digits.
 *
 * @private
 * @param {number} num
 * @return {string}
 */

function pad2(num) {
    var str = String(num)

    return (str.length === 1 ? '0' : '') + str
}

/**
 * Record the start time.
 * @private
 */

function recordStartTime() {
    this._startAt = process.hrtime()
    this._startTime = new Date()
}