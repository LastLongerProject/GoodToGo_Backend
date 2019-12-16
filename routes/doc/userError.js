/**
 * @apiDefine ErrorExample Error message example
 * @apiErrorExample {json} Error-Response:
 * {
 *     code: String, // ex.A001
 *     type : String, // Error Type
 *     message : String // Message Content
 *     [,extra data...] // Some Error Response will Contain Extra key-value Pair
 * }
 */

/**
 * @apiDefine SignupError
 * @apiError {String} D001 status : 401, type : signupMessage, msg : Content not Complete - Missing phone or password in body
 * @apiError {String} D002 status : 401, type : signupMessage, msg : That phone is already taken - This phone has been register
 * @apiError {String} D003 status : 401, type : signupMessage, msg : Role structure invalid
 * @apiError {String} D009 status : 401, type : signupMessage, msg : Phone is not valid
 * @apiError {String} D010 status : 401, type : signupMessage, msg : Verification Code expired
 * @apiError {String} D011 status : 401, type : signupMessage, msg : Verification Code isn't correct
 */

/**
 * @apiDefine LoginError
 * @apiError {String} D004 status : 401, type : loginMessage, msg : Content not Complete - Missing phone or password in body
 * @apiError {String} D005 status : 401, type : loginMessage, msg : No user found
 * @apiError {String} D006 status : 401, type : loginMessage, msg : Wrong password
 */
/**
 * @apiDefine ChangePwdError
 * @apiError {String} D007 status : 401, type : chanPassMessage, msg : Content not Complete - Missing phone or password in body
 * @apiError {String} D008 status : 401, type : chanPassMessage, msg : Wrong password
 */

/**
 * @apiDefine ForgetPwdError
 * @apiError {String} D009 status : 401, type : forgotPassMessage, msg : Phone is not valid
 * @apiError {String} D010 status : 401, type : forgotPassMessage, msg : Verification Code expired
 * @apiError {String} D011 status : 401, type : forgotPassMessage, msg : Verification Code isn't correct
 * @apiError {String} D012 status : 401, type : forgotPassMessage, msg : Content not Complete - Missing phone or password in body
 * @apiError {String} D013 status : 401, type : forgotPassMessage, msg : No User Found
 */

/**
 * @apiDefine AddbotError
 * @apiError {String} D001 status : 401, type : signupMessage, msg : Content not Complete - Missing phone or password in body
 * @apiError {String} D003 status : 401, type : signupMessage, msg : Role structure invalid
 */

/**
 * @apiDefine GetDataByTokenError
 * @apiError {String} F013 status : 403, type : borrowContainerMessage, msg : Rent Request Expired
 */

/**
 * @apiDefine SubscribeSNSError
 * @apiError {String} D009 status : 401, type : subscribeMessage, msg : Content not Complete
 * @apiError {String} D010 status : 401, type : subscribeMessage, msg : Content invalid - appType or sysyem is wrong
 */

/**
 * @apiDefine RoleError
 * @apiError {String} D??? status : 401, type : roleMessage, msg : *
 */