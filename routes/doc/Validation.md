# § Auth Method & Security

## | Default
**Headers**
- reqID : random text ( suggestion -> String that encode with 'hex', length = 10 )
- reqTime : Time.now();
**Error Code**
- A001 ~ A002

## | JWT
**Headers**
- Authorization (A JWT string, encode using Secret key : // secretKey you get by signup or login. Shouldn't contain 'Bearer ' in string)
> JWT payload should contain :
> - jti : random text ( suggestion -> encode with 'hex', length = 10 )
> - iat : Time.now();
> - exp : Time.now(); plus 3 days
- ApiKey
> You can get ApiKey by signup or login
**Error Code**
- B001 ~ B008

## | Token Control
**Url**
- The url you get from "/stores/list"
**Error Code**
- C001 ~ C003

## | LINE
**Headers**
- line-id (line_liff_userID)
**Error Code**
- B001 ~ B004

## | Channel
**Headers**
- line-id (line_channel_userID)
**Error Code**
- B001 ~ B004

# § Role
**Enum of RoleType**
```
RoleType: Object.freeze({
    CUSTOMER: "customer",
    STORE: "store",
    CLEAN_STATION: "station"
    ADMIN: "admin",
    BOT: "bot",
    CLERK: "clerk" // Deprecated
})
```
## | Customer
**Elements**
- group: *String*
## | Store
**Elements**
- storeID: *Number*
- storeName: *String*
- manager: *Boolean*
## | CleanStation
**Elements**
- stationID: *Number*
- stationName: *String*
- boxable: *Boolean*
- manager: *Boolean*
## | Admin
**Elements**
- asStoreID: *Number*
- asStationID: *Number*
## | Bot
**Elements**
- scopeID: *Number*
- rentFromStoreID: *Number*
- returnToStoreID: *Number*
- reloadToStationID: *Number*