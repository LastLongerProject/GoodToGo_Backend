# § Error Message
**ALL Message is sended by JSON**
```
Default Format of Error Message
{
    code: String, // ex.A001
    type : String, // Error Type
    message : String // Message Content
    [,extra data...] // Some Error Response will Contain Extra key-value Pair
}
```
- Global Error - `type: globalError`
    - **Z001** - `status : 404` - Not Found
    - **Z002** - `status : ???` - Plz contact me ASAP
    - **Z003** - `status : 500` - Server Error, Plz contact me ASAP
- A series - `type : validatingDefault`
    - **A001** - `status : 401, msg : Req Invalid` - Missing `hashID` or `reqTime` in headers
    - **A002** - `status : 401, msg : Req Expired` - `reqTime` is not acceptable
- B series - `type : validatingUser`
    - **B001** - `status : 401, msg : JWT or ApiKey undefined` - Missing `authorization` or `apikey` in headers
    - **B002** - `status : 401, msg : User not Found` - `apikey` is wrong
    - **B003** - `status : 401, msg : User has logout` - As msg says
    - **B004** - `status : 401, msg : User has Banned` - As msg says
    - **B005** - `status : 401, msg : JWT Invalid` - Wrong encoding of `authorization` or User has logined on other device
    - **B006** - `status : 401, msg : JWT Payload Invalid` - Missing `jti` or `iat` or `exp` in `authorization`'s payload
    - **B007** - `status : 401, msg : JWT Expired` - `iat` or `exp` is not acceptable
    - **B008** - `status : 401, msg : Not Authorized for this URI` - As msg says
- C series - `type : validatingToken`
    - **C001** - `status : 401, msg : Token Invalid` - Token in URL can't be decoded, Plz contact me ASAP
    - **C002** - `status : 401, msg : Token Payload Invalid` - Payload in Token in URL not complete, Plz contact me ASAP
    - **C003** - `status : 401, msg : Token Expired` - You should use the newest URL given by server, hint: `Recall req with no-cache header can avoid to get the old url stored in cache`
- D series - 
    - **D001** - `status : 401, type : signupMessage, msg : Content not Complete` - Missing `phone` or `password` in body
    - **D002** - `status : 401, type : signupMessage, msg : That phone is already taken` - This phone has been register
    - **D003** - `status : 401, type : signupMessage, msg : Role structure invalid` - As msg says
    - **D004** - `status : 401, type : loginMessage, msg : Content not Complete` - Missing `phone` or `password` in body
    - **D005** - `status : 401, type : loginMessage, msg : No user found` - This `phone` has not registered yet
    - **D006** - `status : 401, type : loginMessage, msg : Wrong password` - As msg says
    - **D007** - `status : 401, type : chanPassMessage, msg : Content not Complete` - Missing `oriPassword` or `newPassword` in body
    - **D008** - `status : 401, type : chanPassMessage, msg : Wrong password` - `oriPassword` is wrong
    - **D009** - `status : 401, type : signupMessage/forgotPassMessage, msg : Phone is not valid`
    - **D010** - `status : 401, type : signupMessage/forgotPassMessage, msg : Verification Code expired`
    - **D011** - `status : 401, type : signupMessage/forgotPassMessage, msg : Verification Code isn't correct`
    - **D012** - `status : 401, type : forgotPassMessage, msg : Content not Complete - Missing phone or password in body`
    - **D013** - `status : 401, type : forgotPassMessage, msg : No User Found`
    - **E001** - `status : 403, type : userSearchingError, msg : No User: [09XXXXXXXX] Found` - This `phone` has not been register 
        > Extra Key-Value :
        > `data : String // "09XXXXXXXX"`
    - **E002** - `status : 403, type : layoffError, msg : Don't lay off yourself` - As msg says
    - **E003** - `status : 403, type : changeOpeningTimeError, msg : Data format invalid` - Req body invalid
- F series - `type : [:action]Message`
    - **F001** - `status : 403, msg : [:action] Error` - The changing state of containers are not acceptable
        > Extra Key-Value :
        > `stateExplanation : a Array of String, // ['delivering', ...]`
        > `listExplanation : a Array of String, // ["containerID",...] `
        > `errorList : a Array of Array(3)`
    - **F002** - `status : 403, msg : No container found` - The container is not Legal
        > Extra Key-Value :
        > `data : String // Container ID`
    - **F003** - `status : 403, msg : Container not available` - The container has marked as unavailable
        > Extra Key-Value :
        > `data : String // Container ID`
    - **F004** - `status : 403, msg : No user found` - DB unexpected conflict, Plz contact me ASAP
    - **F005** - `status : 403, msg : User is Banned` - The user has banned because of didn't return container on time
    - **F006** - `status : 403, msg : Missing Order Time` - JWT payload missing `orderTime`
    - **F007** - `status : 403, msg : Can't Find The Box` - The box ID is wrong
    - **F008** - `status : 403, msg : Box is not belong to user's store` - As msg says
    - **F009** - `status : 403, msg : Invalid Rent Request` - Missing `userapikey` in headers
    - **F010** - `status : 403, msg : Container not belone to user's store` - As msg says
    - **F011** - `status : 403, msg : Boxing req body incomplete` - Missing `containerList` or `boxId` in request body
    - **F012** - `status : 403, msg : Box is already exist` - The box you request is in used
    - **F013** - `status : 403, msg : Rent Request Expired` - UserApiKey expired, tell user to search users phone again (call '/getUser' API again)
    - **F014** - `status : 403, msg : User is Out of quota` - The user has reach rental quantity limitation
    - **F015** - `status : 403, msg : Container amount is over limitation` - Rent too much container
- G series - `type : readImgERR`
    - **G001** - `status : 500, msg : No Image found` - Server Can't Load IMG, Plz contact me ASAP
        > Extra Key-Value :
        > `data : Object`