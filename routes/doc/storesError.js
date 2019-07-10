/**
 * @apiDefine LayoffError
 * @apiError {String} E001 status : 401, type : userSearchingError, msg : "No User: id Found"
 * @apiError {String} E002 status : 401, type : layoffError, msg : Don't lay off yourself
 */

/**
 * @apiDefine ChangeOpeningTimeError
 * @apiError {String} E003 status : 403, type : changeOpeningTimeError, msg : Data format invalid
 */

/**
 * @apiDefine GetStoreInfoError
 * @apiError {String} E004 status : 403, type : GetStoreInfoError, msg : No store id found, please check it
 */

/**
 * @apiDefine GetActivityError
 * @apiError {String} E005 status : 404 type: GetActivityError, msg: activity not found, plz check id
 */