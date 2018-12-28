/**
 * @apiDefine StockError
 * @apiError {String} F007 status : 403, type : stockBoxMessage, msg : Can't Find The Box
 */

/**
 * @apiDefine DeliveryError
 * @apiError {String} F007 status : 403, type : DeliveryMessage, msg : Can't Find The Box
 * @apiError {String} F007 status : 403, type : DeliveryMessage, msg : Box Already Delivering
 */

/**
 * @apiDefine CancelDeliveryError
 * @apiError {String} F007 status : 403, type : CancelDeliveryMessage, msg : Can't Find The Box
 * @apiError {String} F007 status : 403, type : DeliveryMessage, msg : Box Isn't Delivering
 */

/**
 * @apiDefine SignError
 * @apiError {String} F007 status : 403, type : SignMessage, msg : Can't Find The Box
 * @apiError {String} F007 status : 403, type : SignMessage, msg : Box is not belong to user's store
 */

/**
 * @apiDefine RentError
 * @apiError {String} F006 status : 403, type : borrowContainerMessage, msg : Missing Order Time
 * @apiError {String} F009 status : 403, type : borrowContainerMessage, msg : Invalid Rent Request
 * @apiError {String} F010 status : 403, type : borrowContainerMessage, msg : Container not belone to user's store
 * @apiError {String} F013 status : 403, type : borrowContainerMessage, msg : Rent Request Expired
 */

/**
 * @apiDefine ReturnError
 * @apiError {String} F006 status : 403, type : returnContainerMessage, msg : Missing Order Time
 */

/**
 * @apiDefine ReadyToCleanError
 * @apiError {String} F006 status : 403, type : readyToCleanMessage, msg : Missing Order Time
 */

/**
 * @apiDefine BoxError 
 * @apiError {String} F011 status : 403, type : BoxingMessage, msg : Boxing req body invalid
 * @apiError {String} F012 status : 403, type : BoxingMessage, msg : Box is already exist
 */

/**
 * @apiDefine UnboxError 
 * @apiError {String} F007 status : 403, type : UnboxingMessage, msg : Can't Find The Box
 */

/**
 * @apiDefine UndoError 
 * @apiError {String} F002 status : 403, type : UndoMessage, msg : No container found
 * @apiError {String} F00? status : 403, type : UndoMessage, msg : Container is not in that state
 */

/**
 * @apiDefine ChanllengeActionError 
 * @apiError {String} F001 status : 403, type : ChallengeMessage, msg : "Can NOT be " + action
 * @apiError {String} F002 status : 403, type : ChallengeMessage, msg : No container found
 */

/**
 * @apiDefine ChangeStateError
 * @apiError {String} F001 status : 403, msg : State Changing Invalid
 * @apiError {String} F002 status : 403, msg : No container found
 * @apiError {String} F003 status : 403, msg : Container not available
 * @apiError {String} F004 status : 403, msg : No user found
 * @apiError {String} F005 status : 403, msg : User has Banned
 */