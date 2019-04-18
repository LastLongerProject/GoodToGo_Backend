# § Auth Method & Security

## | Default
### Headers
- reqID : random text ( suggestion -> String that encode with 'hex', length = 10 )
- reqTime : Time.now();
### Error Code
- A001 ~ A002

## | JWT
### Headers
- Authorization (A JWT string, encode using Secret key : // secretKey you get by signup or login. Shouldn't contain 'Bearer ' in string)
> JWT payload should contain :
> - jti : random text ( suggestion -> encode with 'hex', length = 10 )
> - iat : Time.now();
> - exp : Time.now(); plus 3 days
- ApiKey
> You can get ApiKey by signup or login
### Error Code
- B001 ~ B008

## | Token Control
### Url
- The url you get from "/stores/list"
### Error Code
- C001 ~ C003

## | LINE
### Headers
- line-id
### Error Code
- B001 ~ B004