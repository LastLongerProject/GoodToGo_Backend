# § API Doc
```
API doc for https://app.goodtogo.tw
```
# § Auth Method & Security

## | Default
### headers
- reqID : random text ( suggestion -> String that encode with 'hex', length = 10 )
- reqTime : Time.now();
### Error Code
- **401** "Token Invalid" : Missing 'reqID' or 'reqTime'
- **400** "Token Expired" : 'reqTime' is not in expected period
- **401** "Token replay" : 'reqID' and 'reqTime' should be generate on runtime
- **500** "Oops something went wrong"  : Remember 'reqID', 'error' message and contact me

## | Token Control
### headers
- The url you get from "/stores/list"
### Error Code
- **400** "Token Expired" : Access permission time out
- **401** "Token Invalid" : Contact me
- **401** "JWT Invalid" : Contact me

## | JWT
### headers
- Authorization (A JWT string, encode using Secret key : // secretKey you get by signup or login. Shouldn't contain 'Bearer ' in string)
> JWT payload should contain :
> - jti : random text ( suggestion -> encode with 'hex', length = 10 )
> - iat : Time.now();
> - exp : Time.now(); plus 3 days
- ApiKey
> You can get ApiKey by signup or login
### Error Code
- **401** "JWT Invalid" : Wrong coding of JWT
- **401** "Token replay" : 'iat' and 'jti' should be generate on runtime
- **401** "User has Banned" : Clerk has banned by manager or User had not paid
- **401** "Invalid User" : apiKey is wrong, maybe user had login on another platform
- **401** "Token Invalid" : JWT content incomplete, or missing 'apiKey' or 'Authorization'
- **400** "Token Expired" : 'iat' or 'exp' is out of expected period
- **403** "Not Authorized" : User has no accessibility of this url
- **500** "Oops something went wrong" : Remember 'jti', 'error' message and contact me

# § Error Message
**ALL Message is sended by JSON**

```
{ type : Error Type, message : Message Content }
```

# § URI
## '/users/signup' - 使用者註冊
### Request - 
#### method
- **POST**

#### headers
- [Default Security Method](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===#default)
- content-type : "application/json"

#### body
- type : **JSON**
- "role" has default as customer, you can skip "role" if user role is customer.
```
{
	phone : "0936033088",
	password : "4324"
}
```

### Response -
#### headers
- Authorization (encode by JWT, Secret key : "secretKey")
```
**Decoded JWT**
payload = {
	apiKey : String,
	secretKey : String
	role : {
		typeCode : String // Should be "customer"
	}
}
```

### Error Code -
- **403** "Content lost" : Information in body is incomplete
- **403** "Thatypehone is already taken" : Phone has been registered
- Others : Remember 'reqID' and contact me


---
## '/users/signup/clerk' - 以店長身分註冊店員

### Request - 
#### method
- **POST**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)
- content-type : "application/json"

#### body
- type : **JSON**
```
{
	phone : "0936033088",
	password : "4324"
}
```


### Response -
#### headers
- Authorization (encode by JWT, Secret key : "secretKey")
```
**Decoded JWT**
payload = {
	apiKey : String,
	secretKey : String,
	role : {
		typeCode : String // Should be "clerk"
	}
}
```


### Error Code -
- **403** "Permission deny, clerk should be only signup by manager" : apikey should reference to a manager
- **403** "Content lost" : Information in body is incomplete
- **403** "That phone is already taken" : Phone has been registered
- Others : Remember 'jti' and contact me


---
## '/users/login' - 使用者登入
### Request - 
#### method
- **POST**

#### headers
- [Default Security Method](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===#default)
- content-type : "application/json"

#### body
-  p: **JSON**
- "role" has default as customer, you can skip "role" if user role is customer.
```
{
	phone : "0936033088",
	password : "4324"
}
```

### Response -
#### headers
- Authorization (encode by JWT, Secret key : "secretKey")
```
**Decoded JWT**
payload = {
	apiKey : String,
	secretKey : String,
	role : {
		typeCode : String, // Should be "customer" or "clerk" or "admin"
		storeID : Number, // If typeCode == clerk
		manager : Boolean // If typeCode == clerk or admin
	}
}
```

### Error Code -
- **401** "Content lost" : Information in body is incomplete
- **401** "No user found."
- **401** "Oops! Wrong password."
- Others : Remember 'reqID' and contact me


---
## '/users/modifypassword' - 修改密碼
### Request - 
#### method
- **POST**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)
- content-type : "application/json"


#### body
- type : **JSON**
```
{
	oriPassword : "1234", // Old password
	newPassword : "0000" // New password
}
```


### Response -
#### headers
- Authorization (encode by JWT, Secret key : "secretKey")
```
**Decoded JWT**
payload = {
	apiKey : String,
	secretKey : String,
	role : {
		typeCode : String, // Should be "customer" or "clerk"
		storeID : Number, // If typeCode == clerk
		manager : Boolean // If typeCode == clerk
	}
}
```

### Error Code -
- **401** "Content lost" : Information in body is incomplete
- **401** "Oops! Wrong password." : Wrong old password
- Others : Remember 'jti' and contact me


---
## '/users/data' - 使用者使用狀態及記錄
### Request - 
#### method
- **GET**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### body
- JSON
```
{
	usingAmount : 0,
	data : [
		{
			container : String, // #001
			time : Date
			returned : Boolean
			type : String // 12oz 玻璃杯
			store : String // 正興咖啡館
			returnTime : Date // If returned == true
		}, ...
	],
	globalAmount : Number
}
```

### Error Code -
- Others : Remember 'jti' and contact me


---
## '/users/logout' - 使用者刪除登入階段
### Request - 
#### method
- **POST**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### status code
- **200**

#### body
- JSON
```
{ type : "logoutMessage", message : "Logout succeeded." }
```

### Error Code -
- Others : Remember 'jti' and contact me


---
## '/stores/list' - 取得所有商店資訊
### Request - 
#### method
- **GET**

#### headers
- [Default Security Method](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===#default)
- If-None-Match : // 'Etag' header value from last /stores/list response


### Response -
#### status code
- **200** : Succeed
- **304** : Data has no need to update

#### headers
- Etag

#### body
```
{
	"title": String, // Stores list
	"contract_code_explanation": Object,
	"shop_data": [
		{
			"id": Number, // 0
			"name": String, // 正興咖啡館
			"img_info": {
				"img_src": String, // url
				"img_version": Number // 0 // For checking update
			},
			"opening_hours": [
				{
					"close": {
						"day": Number, // 0 for Sunday
						"time": String // 19:00
					},
					"open": {
						"day": Number,
						"time": String
					}
				}, ... // Missing day means day off
			],
			"contract": {
				"status_code": Number, // 2
				"returnable": Boolean, // true
				"borrowable": Boolean // true
			},
			"location": {
				"lat": Float, // 22.9942297
				"lng": Float // 120.1973623
			},
			"address": String, // 台南市中西區神農街49號
			"type": [
				String, ... // 咖啡
			]
		}, ...
	]
}
```

### Error Code -
- Others : Remember 'reqID' and contact me

---
## '/stores/status' - 取得商店庫存狀態
### Request - 
#### method
- **GET**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### body
- JSON
```
{
	containers : [
		{
			typeCode : Number, // 0
			name : String, // 12oz 玻璃杯
			amount : Number, // 5
			version : Number,
			icon : {
				"1x": "https://app.goodtogo.tw/images/icon/00_1x/:token",
				"2x": "https://app.goodtogo.tw/images/icon/00_2x/:token",
				"3x": "https://app.goodtogo.tw/images/icon/00_3x/:token"
			}
		}, ...
	],
	todayData : {
		rent : Number, // 1
		return : Number // 1
	}
}
```

### Error Code -
- Others : Remember 'jti' and contact me

---
## '/stores/getUser/:id' - 商店取得使用者資訊 始得租借
### Request - 
#### method
- **GET**

### uri
- :id // Phone number to search

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### body
- JSON
```
{
	phone : String, // 0936033088
	apiKey : String // For renting containers
}
```

### Error Code -
- **401** "No User :[09XXXXXXXX] Finded" : The phone is not register yet
- Others : Remember 'jti' and contact me

---
## '/stores/boxToSign' - 商店取得帶接收箱子的列表
### Request - 
#### method
- **GET**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### body
- JSON
```
{
    "toSign": [
        {
            "boxID": 1,
            "boxTime": "2017-11-06T12:44:00.929Z",
            "typeList": [
                "12oz 玻璃杯",...
            ],
            "containerList": {
                "12oz 玻璃杯": [
                    1,
                    2,...
                ],...
            },
            "isDelivering": false,
            "containerOverview": [
                {
                    "containerType": "12oz 玻璃杯",
                    "amount": 2
                },...
            ]
        },...
    ]
}
```

### Error Code -
- Others : Remember 'jti' and contact me

---
## '/stores/history' - 店家歷史資料
### Request - 
#### method
- **GET**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### body
- JSON
```
{
	rentHistory : {
		amount : Number, // 3
		dataList : [ {
			date : String, // "2017/09/14"
			orderAmount : Number, // 6
			orderList : [ {
				time : String, // "19:33"
				phone : String , // "0936-***-091"
				containerAmount : Number, // 1
				containerList : [ Array of String ] // "#069 | 12oz 玻璃杯"
			}, ...  ]
		}, ...  ]
	},
	returnHistory : {
		amount : Number, // 3
		dataList : [ {
			date : String, // "2017/09/14"
			orderAmount : Number, // 6
			orderList : [ {
				time : String, // "19:33"
				phone : String , // "0936-***-091"
				containerAmount : Number, // 1
				containerList : [ Array of String ] // "#069 | 12oz 玻璃杯"
			}, ...  ]
		}, ...  ]
	}
}
```

### Error Code -
- Others : Remember 'jti' and contact me


---
## '/stores/favorite' - 常用客戶
### Request - 
#### method
- **GET**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### body
- JSON
```
{
	userList : [
		[ String, Number ], ... // [ "0905519292",16 ]
	]
}
```

### Error Code -
- Others : Remember 'jti' and contact me


---
## '/containers/:id' - 自動導向至官網

---
## '/containers/get/list' - 所有容器對應到的類別名稱
### Request - 
#### method
- **GET**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### status code
- **200**

#### body
- JSON
```
{
	"containerType" : [
		{
			typeCode : Number, // 0
			name : String, // 12oz 玻璃杯
			version : Number,
			icon : {
				"1x": "https://app.goodtogo.tw/images/icon/00_1x/:token",
				"2x": "https://app.goodtogo.tw/images/icon/00_2x/:token",
				"3x": "https://app.goodtogo.tw/images/icon/00_3x/:token"
			}
		}, ...
	],
    "containerDict": {
        "1": "12oz 玻璃杯",...
    }
}
```

### Error Code -
- Others : Remember 'jti' and contact me

---
## '/containers/get/toDelivery' - 待配送或配送中的箱子清單
### Request - 
#### method
- **GET**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### status code
- **200**

#### body
- JSON
```
{
    "toDelivery": [
        {
            "boxID": 1,
            "boxTime": "2017-11-05T15:05:37.456Z",
            "typeList": [
                "12oz 玻璃杯"
            ],
            "containerList": {
                "12oz 玻璃杯": [
                    1,...
                ]
            },
            "isDelivering": false,
            "containerOverview": [
                {
                    "containerType": "12oz 玻璃杯",
                    "amount": 1
                },...
            ],
            "destinationStore": Number // store ID, if is delivering
        },...
    ]
}
```

### Error Code -
- Others : Remember 'jti' and contact me

---
## '/containers/get/deliveryHistory' - 配送成功的歷史清單
### Request - 
#### method
- **GET**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### status code
- **200**

#### body
- JSON
```
{
    "pastDelivery": [
        {
            "boxID": 1,
            "boxTime": "2017-11-05T15:05:37.456Z",
            "typeList": [
                "12oz 玻璃杯"
            ],
            "containerList": {
                "12oz 玻璃杯": [
                    1,...
                ]
            },
            "destinationStore": Number // store ID
        },...
    ]
}
```

### Error Code -
- Others : Remember 'jti' and contact me

---
## '/containers/delivery/:boxid/:storeid' - 配送箱子到指定店面
### Request - 
#### method
- **POST**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### status code
- **200**

#### body
- JSON
```
{ type : 'DeliveryMessage', message : 'Delivery succeeded'}
```

### Error Code -
- **404** "Can't Find The Box" : The box ID is wrong
- **403** "Container not available" : Container has marked as not available
- **404** "No container found." : Container ID invalid
- **403** "Container conflict" : Container is not ready for rent.
- Others : Remember 'jti' and contact me

---
## '/containers/cancelDelivery/:boxid' - 取消配送箱子
### Request - 
#### method
- **POST**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### status code
- **200**

#### body
- JSON
```
{ type : 'CancelDeliveryMessage', message : 'CancelDelivery succeeded'}
```

### Error Code -
- **404** "Can't Find The Box" : The box ID is wrong
- **403** "Container not available" : Container has marked as not available
- **404** "No container found." : Container ID invalid
- **403** "Container conflict" : Container is not ready for rent.
- Others : Remember 'jti' and contact me

---
## '/containers/sign/:boxid' - 店家簽收箱子
### Request - 
#### method
- **POST**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### status code
- **200**

#### body
- JSON
```
{ type : 'SignMessage', message : 'Sign succeed'}
```

### Error Code -
- **404** "Box is not found" : The box ID is wrong
- **401** "Box not belone to the store which user's store" : As the msg says
- **403** "Container not available" : Container has marked as not available
- **404** "No container found." : Container ID invalid
- **403** "Container conflict" : Container is not ready for rent.
- Others : Remember 'jti' and contact me

---
## '/containers/rent/:containerid' - 租借容器
### Request - 
#### method
- **POST**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)
 :::warning
JWT 的 payload 應該要另外加上 {'orderTime': Date.now()}
:::
- userApiKey // apiKey you get by [/getUser](https://hackmd.io/s/BkTWYMhR-#‘storesgetuserid’-商店取得使用者資訊-始得租借)

### Response -
#### type
- **JSON**

#### status code
- **200**

#### body
- JSON
```
{ type : 'borrowContainerMessage', message : 'Borrow succeeded.'}
```

### Error Code -
- **401** "Invalid Request" : Can't get userApiKey
- **401** "Missing Time" : Payload of JWT didn't contain 'orderTime'
- **403** "Container not available" : Container has marked as not available
- **404** "No container found." : Container ID invalid
- **403** "Container conflict" : Container is not ready for rent.
- Others : Remember 'jti' and contact me

---
## '/containers/return/:containerid' - 歸還容器
### Request - 
#### method
- **POST**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)
 :::warning
JWT 的 payload 應該要另外加上 {'orderTime': Date.now()}
:::

### Response -
#### type
- **JSON**

#### status code
- **200**

#### body
- JSON
```
{ type : 'returnContainerMessage', message : 'Return succeeded.'}
```

### Error Code -
- **401** "Missing Time" : Payload of JWT didn't contain 'orderTime'
- **500** "Container not available" : Unexpected error, Container has marked as not available
- **404** "No container found." : Container ID invalid
- **403** "Container has not rented." : This container is not rented
- **500** "No user found." : Unexpected error. Remember 'reqID' and contact me
- Others : Remember 'jti' and contact me

---
## '/containers/readyToClean/:containerid' - 回收容器
### Request - 
#### method
- **POST**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)
 :::warning
JWT 的 payload 應該要另外加上 {'orderTime': Date.now()}
:::

### Response -
#### type
- **JSON**

#### status code
- **200**

#### body
- JSON
```
{ type : 'readyToCleanMessage', message : 'ReadyToClean succeeded.'}
```

### Error Code -
- **401** "Missing Time" : Payload of JWT didn't contain 'orderTime'
- **500** "Container not available" : Unexpected error, Container has marked as not available
- **404** "No container found." : Container ID invalid
- **500** "No user found." : Unexpected error. Remember 'reqID' and contact me
- Others : Remember 'jti' and contact me

---
## '/containers/cleanStation/box' - 容器裝箱
### Request - 
#### method
- **POST**

#### body
- JSON
```
{
    boxId : String, // "1"
    containerList : [
        Number, // 1
    ]
}
```

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### status code
- **200**

#### body
- JSON
```
{ type : 'BoxingMessage', message : 'Boxing succeed'}
```

### Error Code -
- **401** "Req body incomplete" : Request body is incomplete
- **401** "Box is already exist" : The box ID is already exist
- **500** "Container not available" : Unexpected error, Container has marked as not available
- **404** "No container found." : Container ID invalid
- **500** "No user found." : Unexpected error. Remember 'reqID' and contact me
- Others : Remember 'jti' and contact me

---
## '/containers/cleanStation/unbox/:boxid' - 容器取消裝箱
### Request - 
#### method
- **POST**

#### headers
- [JWT Auth & Security](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===?#jwt)

### Response -
#### type
- **JSON**

#### status code
- **200**

#### body
- JSON
```
{ type : 'UnboxingMessage', message : 'Unboxing succeed'}
```

### Error Code -
- **401** "Box is already exist" : The box ID is already exist
- **500** "Container not available" : Unexpected error, Container has marked as not available
- **404** "No container found." : Container ID invalid
- **500** "No user found." : Unexpected error. Remember 'reqID' and contact me
- Others : Remember 'jti' and contact me

---
## '/images/:storeid/:token' - 取得店家照片
### Request - 
#### method
- **GET**

#### url
- [Token Security Control](https://hackmd.io/AwYwTApgZiBGEFoDMwCsBGBAWdBDKCAnLLFghLEmLkrOgBwAmj6QA===#token-control)
:::success
You can get complete url from [/stores/list](https://hackmd.io/s/BkTWYMhR-#‘storeslist’-取得所有商店資訊)
:::

### Response -
#### type
- **image/jpeg**

#### status code
- **200**

### Error Code -
- **404** "No Image found" : Contact me
- Others : Contact me

---
## '/images/icon/:id/:token' - 取得容器照片
### Request - 
#### method
- **GET**

#### url
- [Token Security Control](https://hackmd.io/s/BkTWYMhR-#‘usersdata’-使用者使用狀態及記錄)
:::success
You can get complete url [/containers/get/list](https://hackmd.io/s/BkTWYMhR-#‘containersgetlist’-所有容器對應到的類別名稱) or [/stores/status](https://hackmd.io/s/BkTWYMhR-#‘storesstatus’-取得商店庫存狀態)
:::

### Response -
#### type
- **image/png**

#### status code
- **200**

### Error Code -
- **404** "No Image found" : Contact me
- Others : Contact me

---
# § Reference
- [JWT](https://jwt.io/introduction/)