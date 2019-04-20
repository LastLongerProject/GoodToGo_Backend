/**
 * @apiDefine CreateError
 * @apiError {String} H001_1 status : 403, type : CreateMessage, msg : "Data format invalid (boxList must be an array)"
 * @apiError {String} H001_2 status : 403, type : CreateMessage, msg : "Data format invalid (phone should in the request)"
 * @apiError {String} H001_2 status : 403, type : CreateMessage, msg : "Data format invalid (boxId should in the request)"
 * @apiError {String} H002 status : 403, type : CreateMessage, msg : "Missing info in boxList element"
 * @apiError {String} H003 status : 403, type : CreateMessage, msg : "Data format invalid (boxOrderContent or boxDeliverContent must be an array)"
 * @apiError {String} H004 status : 403, type : CreateMessage, msg : "Too many request at the same time"
 * @apiError {String} H005_1 status : 403, type : CreateMessage, msg : "Data format invalid (boxOrderContent or boxDeliverContent must include ContainerType and amount)"
 * @apiError {String} H005_2 status : 403, type : CreateMessage, msg : "Data format invalid (ContainerType and amount and should be Number)"
 * @apiError {String} H006 status : 403, type : CreateMessage, msg : "Database save error(Please check key type is correct)"
 */

/**
 * @apiDefine ChangeStateError
 * @apiError {String} H007 status : 403, type : ChangeStateMessage, msg : "Box update failed in changing state from {oldState} to {newState}"
 * @apiError {String} H008 status : 403, type : ChangeStateMessage, msg : "Please use 'sign' api to sign the box"
 */

/**
 * @apiDefine ModifyError
 * @apiError {String} H005_4 status : 403, type : ModifyMessage, msg : "Data format invalid (Please see the data type in apidoc)"
 */