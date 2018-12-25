/**
 * @apiDefine DefaultSecurityMethod Add reqTime and reqID to header
 * 
 * @apiHeader {String} reqID random text ( suggestion -> String that encode with ‘hex’, length = 10 )  
 * @apiHeader {String} reqTime Time.now()   
 * @apiError {String} A001 status : 401, msg : Req Invalid - Missing hashID or reqTime in headers
 * @apiError {String} A002 status : 401, msg : Req Expired - reqTime is not acceptable
 */

/**
 * @apiDefine JWT Add jwt payload as authorization to header
 * 
 * @apiHeader {String} Authorization A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string
 * 
 * JWT payload should contain:
 *  - jti : random text ( suggestion -> encode with ‘hex’, length = 10 )
 *  - iat : Time.now();
 *  - epx : Time.now(); plus 3 days 
 * @apiHeader {String} ApiKey You can get ApiKey by signup or login
 * @apiError {String} B001 status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers
 * @apiError {String} B002 status : 401, msg : User not Found - apikey is wrong
 * @apiError {String} B003 status : 401, msg : User has logout - As msg says
 * @apiError {String} B004 status : 401, msg : User has Banned - As msg says
 * @apiError {String} B005 status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device
 * @apiError {String} B006 status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload
 * @apiError {String} B007 status : 401, msg : JWT Expired - iat or exp is not acceptable
 * @apiError {String} B008 status : 401, msg : Not Authorized for this URI - As msg says
 */