define({ "api": [
  {
    "name": "Containers_Sign_box_id",
    "group": "Containers",
    "type": "post",
    "url": "/containers/sign/:id",
    "title": "Sign box id",
    "permission": [
      {
        "name": "clerk_manager"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"SignMessage\",\n    message: \"Sign Succeed\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F007",
            "description": "<p>status : 403, type : SignMessage, msg : Can't Find The Box</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F008",
            "description": "<p>status : 403, type : SignMessage, msg : Box is not belong to user's store</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H007",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Box update failed in changing state from {oldState} to {newState}&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H008",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Please use 'sign' api to sign the box&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_Unbox",
    "group": "Containers",
    "type": "post",
    "url": "/containers/cleanStation/unbox/:id",
    "title": "Unbox",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"UnboxingMessage\",\n    message: \"Unboxing Succeeded\",\n    oriUser: \"09xxxxxxxx\",\n    containerList: [ \n        {\n            typeName: String,\n            typeCode: Number,\n            id: Number\n        },\n        ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F007",
            "description": "<p>status : 403, type : UnboxingMessage, msg : Can't Find The Box</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H007",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Box update failed in changing state from {oldState} to {newState}&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H008",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Please use 'sign' api to sign the box&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_Undo_action",
    "group": "Containers",
    "type": "post",
    "url": "/containers/undo/:action/:id",
    "title": "Undo action to specific container",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"UndoMessage\",\n    message: \"Undo \" + action + \" Succeeded\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F002",
            "description": "<p>status : 403, type : UndoMessage, msg : No container found</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F00",
            "description": "<p>? status : 403, type : UndoMessage, msg : Container is not in that state</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_box_container",
    "group": "Containers",
    "type": "post",
    "url": "/containers/cleanStation/box",
    "title": "Box container",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phone",
            "description": "<p>Boxer's phone</p>"
          },
          {
            "group": "Parameter",
            "type": "Array",
            "optional": false,
            "field": "containerList",
            "description": "<p>Boxed containers</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "boxId",
            "description": "<p>Box's id</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"BoxingMessage\",\n    message: \"Boxing Succeeded\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F011",
            "description": "<p>status : 403, type : BoxingMessage, msg : Boxing req body invalid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F012",
            "description": "<p>status : 403, type : BoxingMessage, msg : Box is already exist</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H007",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Box update failed in changing state from {oldState} to {newState}&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H008",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Please use 'sign' api to sign the box&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_cancel_delivery",
    "group": "Containers",
    "type": "post",
    "url": "/containers/cancelDelivery/:id",
    "title": "Cancel box id delivery",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"CancelDeliveryMessage\",\n    message: \"CancelDelivery Succeed\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F007",
            "description": "<p>status : 403, type : CancelDeliveryMessage, msg : Can't Find The Box</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H007",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Box update failed in changing state from {oldState} to {newState}&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H008",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Please use 'sign' api to sign the box&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_delivery_box_to_store",
    "group": "Containers",
    "type": "post",
    "url": "/containers/delivery/:id/:store",
    "title": "Delivery box id to store",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "string",
            "optional": false,
            "field": "activity",
            "description": "<p>only pass if deliver to specific activity</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"DeliveryMessage\",\n    message: \"Delivery Succeed\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F007",
            "description": "<p>status : 403, type : DeliveryMessage, msg : Can't Find The Box</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H007",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Box update failed in changing state from {oldState} to {newState}&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H008",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Please use 'sign' api to sign the box&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_do_action_to_specific_container",
    "group": "Containers",
    "type": "get",
    "url": "/containers/challenge/:action/:id",
    "title": "Do action to specific container",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      },
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"ChallengeMessage\",\n    message: \"Can be \" + action\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F001",
            "description": "<p>status : 403, type : ChallengeMessage, msg : &quot;Can NOT be &quot; + action</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F002",
            "description": "<p>status : 403, type : ChallengeMessage, msg : No container found</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_get_challenge_token",
    "group": "Containers",
    "type": "get",
    "url": "/containers/challenge/token",
    "title": "Get challenge token",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      },
      {
        "name": "bot",
        "title": "Bot access rights needed.",
        "description": "<p>Please use bot identity to request this uri.</p>"
      },
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    uri: uri,\n    token: String\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_get_delivery_history",
    "group": "Containers",
    "type": "get",
    "url": "/containers/get/toDelivery",
    "title": "Get delivery history",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    pastDelivery:\n    [\n        { \n            \"boxID\": 1,\n            \"boxTime\": \"2017-11-05T15:05:37.456Z\",\n            \"phone\": {\n                \"delivery\": String // 配送的人\n            },\n            \"typeList\": [\n                \"12oz 玻璃杯\"\n            ],\n            \"containerList\": {\n                \"12oz 玻璃杯\": [\n                    1,...\n                ]\n            },\n            \"containerOverview\": [\n                {\n                    \"containerType\": \"12oz 玻璃杯\",\n                    \"amount\": 1\n                },...\n            ],\n            \"destinationStore\": Number // store ID \n        },\n        ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/get.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_get_list",
    "group": "Containers",
    "type": "get",
    "url": "/containers/get/list",
    "title": "Get list",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "optional": false,
            "field": "If-None-Match",
            "description": "<p>: // ‘Etag’ header value from last /stores/list response</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqID",
            "description": "<p>random text ( suggestion -&gt; String that encode with ‘hex’, length = 10 )</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqTime",
            "description": "<p>Time.now()</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    \"containerType\" : [\n        {\n            typeCode : Number, // 0\n            name : String, // 12oz 玻璃杯\n            version : Number,\n            icon : {\n                \"1x\": \"https://app.goodtogo.tw/images/icon/00_1x/:token\",\n                \"2x\": \"https://app.goodtogo.tw/images/icon/00_2x/:token\",\n                \"3x\": \"https://app.goodtogo.tw/images/icon/00_3x/:token\"\n            }\n        }, ...\n    ],\n    \"containerDict\": {\n        \"1\": \"12oz 玻璃杯\",...\n    }\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/get.js",
    "groupTitle": "Containers",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A001",
            "description": "<p>status : 401, msg : Req Invalid - Missing hashID or reqTime in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A002",
            "description": "<p>status : 401, msg : Req Expired - reqTime is not acceptable</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_get_toDelivery_list",
    "group": "Containers",
    "type": "get",
    "url": "/containers/get/toDelivery",
    "title": "Get toDelivery list",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    toDelivery:\n    [ \n        { \n            boxID: String //102457,\n            boxTime: Date // '2018-10-26T09:13:40.267Z',\n            phone: {\n                \"box\": String\n            },\n            typeList: [\n                \"12oz 玻璃杯\"\n            ],\n            containerList: {\n                \"12oz 玻璃杯\": [\n                    1,...\n                ]\n            },\n            stocking: Boolean,\n            isDelivering: Boolean,\n            containerOverview: [\n                    {\n                        \"containerType\": \"12oz 玻璃杯\",\n                        \"amount\": 1\n                    },...\n                ] \n            },\n            ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/get.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_global_used_amount",
    "group": "Containers",
    "type": "get",
    "url": "/containers/globalUsedAmount",
    "title": "Get global used amount",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \nres.text: String //amount",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers"
  },
  {
    "name": "Containers_ready_to_clean",
    "group": "Containers",
    "type": "post",
    "url": "/containers/readyToClean/:id",
    "title": "Ready to clean specific container",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"ReadyToCleanMessage\",\n    message: \"ReadyToClean Succeeded\",\n    oriUser: \"09xxxxxxxx\",\n    containerList: [ \n        {\n            typeName: String,\n            typeCode: Number,\n            id: Number\n        },\n        ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> <li>orderTime : order Time.now()</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F006",
            "description": "<p>status : 403, type : readyToCleanMessage, msg : Missing Order Time</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H007",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Box update failed in changing state from {oldState} to {newState}&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H008",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Please use 'sign' api to sign the box&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_reload_history",
    "group": "Containers",
    "type": "get",
    "url": "/containers/get/reloadHistory",
    "title": "Reload history",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      },
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    reloadHistory::\n    [\n        { \n            {\n                \"boxTime\": \"2017-11-05T15:05:37.456Z\",\n                \"typeList\": [\n                    \"12oz 玻璃杯\"\n                ],\n                \"phone\": {\n                    \"reload\": String // (清洗站)回收的人\n                },\n                \"from\": 1, // (清洗站)storeID\n                \"containerList\": {\n                    \"12oz 玻璃杯\": [\n                        1,...\n                    ]\n                },\n                \"containerOverview\": [\n                    {\n                        \"containerType\": \"12oz 玻璃杯\",\n                        \"amount\": 1\n                    },...\n                ],\n                \"cleanReload\": Boolean // if TRUE, 為乾淨回收\n            },\n            ...\n        }\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/get.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_rent_container",
    "group": "Containers",
    "type": "post",
    "url": "/containers/rent/:id",
    "title": "Rent specific container",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "userapikey",
            "description": "<p>User api key</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> <li>orderTime : order Time.now()</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"RentMessage\",\n    message: \"Rent Succeeded\",\n    oriUser: \"09xxxxxxxx\",\n    containerList: [ \n        {\n            typeName: String,\n            typeCode: Number,\n            id: Number\n        },\n        ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers",
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F006",
            "description": "<p>status : 403, type : borrowContainerMessage, msg : Missing Order Time</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F009",
            "description": "<p>status : 403, type : borrowContainerMessage, msg : Invalid Rent Request</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F010",
            "description": "<p>status : 403, type : borrowContainerMessage, msg : Container not belone to user's store</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F013",
            "description": "<p>status : 403, type : borrowContainerMessage, msg : Rent Request Expired</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H007",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Box update failed in changing state from {oldState} to {newState}&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H008",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Please use 'sign' api to sign the box&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_return_container",
    "group": "Containers",
    "type": "post",
    "url": "/containers/return/:id",
    "title": "Return specific container",
    "permission": [
      {
        "name": "bot",
        "title": "Bot access rights needed.",
        "description": "<p>Please use bot identity to request this uri.</p>"
      },
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      },
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"ReturnMessage\",\n    message: \"Return Succeeded\",\n    oriUser: \"09xxxxxxxx\",\n    containerList: [ \n        {\n            typeName: String,\n            typeCode: Number,\n            id: Number\n        },\n        ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> <li>orderTime : order Time.now()</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F006",
            "description": "<p>status : 403, type : returnContainerMessage, msg : Missing Order Time</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H007",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Box update failed in changing state from {oldState} to {newState}&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H008",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Please use 'sign' api to sign the box&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Containers_stock_specific_box",
    "group": "Containers",
    "type": "post",
    "url": "/containers/stock/:id",
    "title": "Stock specific box id",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"stockBoxMessage\",\n    message: \"StockBox Succeed\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/containers/index.js",
    "groupTitle": "Containers",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "F007",
            "description": "<p>status : 403, type : stockBoxMessage, msg : Can't Find The Box</p>"
          }
        ]
      }
    }
  },
  {
    "version": "0.0.1",
    "type": "",
    "url": "",
    "filename": "routes/doc/apidoc_version.js",
    "group": "D__GoodToGo_Project_GoodToGo_Backend_routes_doc_apidoc_version_js",
    "groupTitle": "D__GoodToGo_Project_GoodToGo_Backend_routes_doc_apidoc_version_js",
    "name": ""
  },
  {
    "name": "DeliveryList_Get_list",
    "group": "DeliveryList",
    "type": "get",
    "url": "/deliveryList/box/list",
    "title": "Box list",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n[   \n    {\n        storeID: Number\n        boxObjs: [{\n            ID: Number //boxID,\n            name: String,\n            dueDate: Date,\n            status: String,\n            action: [\n                {\n                    phone: String,\n                    boxStatus: String,\n                    timestamps: Date\n                },...\n            ],\n            deliverContent: [\n                {\n                    amount: Number,\n                    containerType: String\n                },...\n            ],\n            orderContent: [\n                {\n                    amount: Number,\n                    containerType: String\n                },...\n            ],\n            containerList: Array //boxID,\n            comment: String // If comment === \"\" means no error\n        },...]\n    },...\n]",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/deliveryList.js",
    "groupTitle": "DeliveryList",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "DeliveryList_Get_specific_status_list",
    "group": "DeliveryList",
    "type": "get",
    "url": "/deliveryList/box/list/:status",
    "title": "Specific status box list",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "description": "<p><strong>Status</strong></p> <ul> <li>Created: &quot;Created&quot;,</li> <li>Boxing: &quot;Boxing&quot;,</li> <li>Delivering: &quot;Delivering&quot;,</li> <li>Signed: &quot;Signed&quot;,</li> <li>Stocked: &quot;Stocked&quot;</li> </ul>",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n[   \n    {\n        storeID: Number\n        boxObjs: [{\n            ID: Number //boxID,\n            name: String,\n            dueDate: Date,\n            status: String,\n            action: [\n                {\n                    phone: String,\n                    boxStatus: String,\n                    timestamps: Date\n                },...\n            ],\n            deliverContent: [\n                {\n                    amount: Number,\n                    containerType: String\n                },...\n            ],\n            orderContent: [\n                {\n                    amount: Number,\n                    containerType: String\n                },...\n            ],\n            containerList: Array //boxID,\n            comment: String // If comment === \"\" means no error\n        },...]\n    },...\n]",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/deliveryList.js",
    "groupTitle": "DeliveryList",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "DeliveryList_boxing",
    "group": "DeliveryList",
    "type": "post",
    "url": "/deliveryList/box",
    "title": "Boxing",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "parameter": {
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n    phone: String,\n    boxList: [\n        {\n            boxId: String,\n            containerList: Array,\n            comment: String\n        },...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"BoxMessage\",\n    message: \"Box Succeed\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/deliveryList.js",
    "groupTitle": "DeliveryList",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H001_1",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxList must be an array)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H001_2",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (phone should in the request)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H002",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Missing info in boxList element&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H003",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxOrderContent or boxDeliverContent must be an array)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H004",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Too many request at the same time&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H005_1",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxOrderContent or boxDeliverContent must include ContainerType and amount)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H005_2",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (ContainerType and amount and should be Number)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H006",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Database save error(Please check key type is correct)&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "DeliveryList_change_state",
    "group": "DeliveryList",
    "type": "post",
    "url": "/deliveryList/changeState",
    "title": "Change state",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "description": "<p>available state changing list: Boxing -&gt; Stocked , Boxing -&gt; BoxStatus , Delivering -&gt; Boxing , Signed -&gt; Stocked , Stocked -&gt; Boxing</p>",
    "parameter": {
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n    phone: String,\n    boxList: [\n        {\n            id: String\n            newState: String, // State:['Boxing', 'Delivering', 'Signed', 'Stocked'], if you wanna sign a box, use sign api\n            [destinationStoreId]: String // only need when update Stocked to Boxing \n        },...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"ChangeStateMessage\",\n    message: \"Change state successfully\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/deliveryList.js",
    "groupTitle": "DeliveryList",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H001_1",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxList must be an array)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H001_2",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (phone should in the request)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H002",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Missing info in boxList element&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H003",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxOrderContent or boxDeliverContent must be an array)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H004",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Too many request at the same time&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H005_1",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxOrderContent or boxDeliverContent must include ContainerType and amount)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H005_2",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (ContainerType and amount and should be Number)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H006",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Database save error(Please check key type is correct)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H007",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Box update failed in changing state from {oldState} to {newState}&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H008",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Please use 'sign' api to sign the box&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "DeliveryList_create_delivery_list",
    "group": "DeliveryList",
    "type": "post",
    "url": "/deliveryList/create/:destiantionStoreId",
    "title": "Create delivery list",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "parameter": {
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n    phone: String,\n    boxList: [\n        {\n            boxName: String,\n            boxOrderContent: [\n                {\n                    containerType: String,\n                    amount: Number\n                },...\n            ]\n            dueDate: Date\n        }\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"CreateMessage\",\n    message: \"Create Succeed\",\n    boxIDs: Array\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/deliveryList.js",
    "groupTitle": "DeliveryList",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H001_1",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxList must be an array)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H001_2",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (phone should in the request)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H002",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Missing info in boxList element&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H003",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxOrderContent or boxDeliverContent must be an array)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H004",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Too many request at the same time&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H005_1",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxOrderContent or boxDeliverContent must include ContainerType and amount)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H005_2",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (ContainerType and amount and should be Number)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H006",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Database save error(Please check key type is correct)&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "DeliveryList_modify_box_info",
    "group": "DeliveryList",
    "type": "post",
    "url": "/deliveryList/modifyBoxInfo/:boxID",
    "title": "Modify box info",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "description": "<p><strong>Can modify</strong></p> <ol> <li> <p>&quot;storeID: Number&quot;</p> </li> <li> <p>&quot;dueDate: Date&quot;</p> </li> <li> <p>&quot;boxOrderContent: [{containerType, amount},...]&quot;</p> </li> <li> <p>&quot;containerList: Array<Number>&quot;</p> </li> <li> <p>&quot;comment: String&quot;</p> </li> <li> <p>&quot;boxName: String&quot;</p> </li> </ol>",
    "parameter": {
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n    <the key wanna modify> : <new value>,\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"ModifyMessage\",\n    message: \"Modify successfully\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/deliveryList.js",
    "groupTitle": "DeliveryList",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H005_4",
            "description": "<p>status : 403, type : ModifyMessage, msg : &quot;Data format invalid (Please see the data type in apidoc)&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "DeliveryList_sign",
    "group": "DeliveryList",
    "type": "post",
    "url": "/deliveryList/sign",
    "title": "Sign",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "parameter": {
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n    phone: String,\n    boxList: [\n        {\n            id: String\n        },...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"ChangeStateMessage\",\n    message: \"Change State successfully\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/deliveryList.js",
    "groupTitle": "DeliveryList",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H001_1",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxList must be an array)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H001_2",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (phone should in the request)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H002",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Missing info in boxList element&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H003",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxOrderContent or boxDeliverContent must be an array)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H004",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Too many request at the same time&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H005_1",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxOrderContent or boxDeliverContent must include ContainerType and amount)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H005_2",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (ContainerType and amount and should be Number)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H006",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Database save error(Please check key type is correct)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H007",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Box update failed in changing state from {oldState} to {newState}&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H008",
            "description": "<p>status : 403, type : ChangeStateMessage, msg : &quot;Please use 'sign' api to sign the box&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "DeliveryList_stock",
    "group": "DeliveryList",
    "type": "post",
    "url": "/deliveryList/stock",
    "title": "Create stock box",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "parameter": {
      "examples": [
        {
          "title": "Request-Example:",
          "content": "{\n    phone: String,\n    boxList: [\n        {\n            boxName: String,\n            containerList: Array,\n        },...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: \"StockMessage\",\n    message: \"Stock successfully\",\n    boxIDs: Array\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/deliveryList.js",
    "groupTitle": "DeliveryList",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H001_1",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxList must be an array)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H001_2",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (phone should in the request)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H002",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Missing info in boxList element&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H003",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxOrderContent or boxDeliverContent must be an array)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H004",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Too many request at the same time&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H005_1",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (boxOrderContent or boxDeliverContent must include ContainerType and amount)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H005_2",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Data format invalid (ContainerType and amount and should be Number)&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "H006",
            "description": "<p>status : 403, type : CreateMessage, msg : &quot;Database save error(Please check key type is correct)&quot;</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_console",
    "group": "Manage",
    "type": "get",
    "url": "/manage/console",
    "title": "Console",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_container",
    "group": "Manage",
    "type": "get",
    "url": "/manage/container",
    "title": "Get container",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    list:\n    [ \n        { \n            id: Number,\n            type: '12oz 玻璃杯',\n            totalAmount: Number,\n            toUsedAmount: Number,\n            usingAmount: Number,\n            returnedAmount: Number,\n            toCleanAmount: Number,\n            toDeliveryAmount: Number,\n            toSignAmount: Number,\n            inStorageAmount: Number,\n            lostAmount: Number \n        },\n        ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_container_detail",
    "group": "Manage",
    "type": "get",
    "url": "/manage/containerDetail?id={containerid}",
    "title": "Get container detail",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    containerID: '#3',\n    containerType: { \n        txt: '12oz 玻璃杯', \n        code: 0 \n    },\n    reuseTime: 1,\n    status: '庫存',\n    bindedUser: '09**-***-***',\n    joinedDate: Date,\n    history:\n    [ \n        { \n            tradeTime: Date,\n            action: '回收',\n            newUser: '09**-***-***',\n            oriUser: '09**-***-***',\n            comment: '' \n        },\n        ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_index",
    "group": "Manage",
    "type": "get",
    "url": "/manage/index",
    "title": "Get manage index",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    summary: {\n        userAmount: Number,\n        storeAmount: Number,\n        activityAmount: Number \n    },\n    activityHistorySummary: { \n        usedAmount: Number,\n        lostAmount: Number,\n        totalDuration: Number\n    },\n    shopRecentHistorySummary: {\n        usedAmount: Number,\n        customerLostAmount: Number,\n        totalDuration: Number,\n        quantityOfBorrowingFromDiffPlace: Number\n    },\n    shopHistorySummary: {\n        usedAmount: Number,\n        shopLostAmount: Number,\n        customerLostAmount: Number,\n        totalDuration: Number,\n        quantityOfBorrowingFromDiffPlace: Number\n    }\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_refresh_activity",
    "group": "Manage",
    "type": "patch",
    "url": "/manage/refresh/activity",
    "title": "Refresh container",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_refresh_container",
    "group": "Manage",
    "type": "patch",
    "url": "/manage/refresh/container",
    "title": "Refresh container",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_refresh_specific_container_icon",
    "group": "Manage",
    "type": "patch",
    "url": "/manage/refresh/containerIcon/:id",
    "title": "Refresh specific container icon",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    type: 'refreshContainerIcon',\n    message: 'refresh succeed',\n    data:\n    [ \n        '08@3x.png',\n        ...\n    ] \n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "403",
            "description": "<p>Response data</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_refresh_specific_store_image",
    "group": "Manage",
    "type": "patch",
    "url": "/manage/refresh/storeImg/:id",
    "title": "Refresh specific store image",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    type: 'refreshStoreImg',\n    message: 'refresh succeed',\n    data:\n    [ \n        '00000.jpg',\n        ...\n    ] \n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "optional": false,
            "field": "403",
            "description": "<p>Response data</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_refresh_store",
    "group": "Manage",
    "type": "patch",
    "url": "/manage/refresh/store",
    "title": "Refresh store",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    \"success\": true\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_shop",
    "group": "Manage",
    "type": "get",
    "url": "/manage/shop",
    "title": "Get shop",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    list:\n    [ \n        { \n            id: Number, //storeID\n            storeName: String,\n            toUsedAmount: Number,\n            todayAmount: Number,\n            weekAmount: Number,\n            weekAverage: Number },\n        ...\n        ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_shop_detail",
    "group": "Manage",
    "type": "get",
    "url": "/manage/shopDetail?id={shopid}",
    "title": "Get shop detail",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    storeName: String,\n    toUsedAmount: Number,\n    todayAmount: Number,\n    weekAmount: Number,\n    weekAmountPercentage: Float,\n    totalAmount: Number,\n    joinedDate: Date,\n    contactNickname: String,\n    contactPhone: '09XXXXXXXX',\n    weekAverage: Number,\n    shopLostAmount: Number,\n    customerLostAmount: Number,\n    history:\n    [ \n        { \n            time: Date,\n            action: '歸還',\n            content: '野餐方碗 x 2',\n            contentDetail: '野餐方碗\\n#xx01、#xx02',\n            owner: '好盒器基地',\n            by: '09xx-***-xxx' \n        },\n            ...\n    ],\n    chartData:\n    [ \n        [ '週', '數量' ],\n        [ 'Mon Dec 25 2017 16:00:00 GMT+0800 (GMT+08:00)', 8 ],\n        ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_user",
    "group": "Manage",
    "type": "get",
    "url": "/manage/user",
    "title": "Get user",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    totalUserAmount: Number,\n    totalUsageAmount: Number,\n    weeklyAverageUsage: Number,\n    totalLostAmount: Number,\n    list:\n    [ \n        { \n            id: String,\n            phone: String,\n            usingAmount: Number,\n            lostAmount: Number,\n            totalUsageAmount: Number \n        },\n        ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Manage_user_detail",
    "group": "Manage",
    "type": "get",
    "url": "/manage/userDetail?id={userid}",
    "title": "Get user detail",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    userPhone: String,\n    usingAmount: Number,\n    lostAmount: Number,\n    totalUsageAmount: Number,\n    joinedDate: Date,\n    joinedMethod: '店鋪 (方糖咖啡)',\n    recentAmount: Number,\n    recentAmountPercentage: Number,\n    weekAverage: Number,\n    averageUsingDuration: Number,\n    amountOfBorrowingFromDiffPlace: Number,\n    history:\n    [ \n        { \n            containerType: String,\n            containerID: String,\n            rentTime: Date,\n            rentPlace: String,\n            returnTime: Date,\n            returnPlace: String,\n            usingDuration: Number \n        },... \n    ] \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/manage.js",
    "groupTitle": "Manage",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Layoff_clerk",
    "group": "Stores",
    "type": "post",
    "url": "/stores/layoff/:id",
    "title": "Layoff specific id",
    "permission": [
      {
        "name": "store_manager",
        "title": "Store manager access rights needed.",
        "description": "<p>Please use store manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    type: 'LayoffMessage',\n    message: 'Layoff succeed'\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "E001",
            "description": "<p>status : 401, type : userSearchingError, msg : &quot;No User: id Found&quot;</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "E002",
            "description": "<p>status : 401, type : layoffError, msg : Don't lay off yourself</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_activities_list",
    "group": "Stores",
    "type": "get",
    "url": "/stores/activityList",
    "title": "Get activities list",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n     [\n         { \n             ID: '0',\n             name: '沒活動',\n             startAt: '2018-03-02T16:00:00.000Z',\n             endAt: '2018-03-02T16:00:00.000Z' \n         },... \n     ]\n }",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqID",
            "description": "<p>random text ( suggestion -&gt; String that encode with ‘hex’, length = 10 )</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqTime",
            "description": "<p>Time.now()</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A001",
            "description": "<p>status : 401, msg : Req Invalid - Missing hashID or reqTime in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A002",
            "description": "<p>status : 401, msg : Req Expired - reqTime is not acceptable</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_activities_list_of_specific_store",
    "group": "Stores",
    "description": "<p>still need to test</p>",
    "type": "get",
    "url": "/stores/activityList/:storeID",
    "title": "Get activities list of specific store",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n     [\"沒活動\",...]\n }",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqID",
            "description": "<p>random text ( suggestion -&gt; String that encode with ‘hex’, length = 10 )</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqTime",
            "description": "<p>Time.now()</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A001",
            "description": "<p>status : 401, msg : Req Invalid - Missing hashID or reqTime in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A002",
            "description": "<p>status : 401, msg : Req Expired - reqTime is not acceptable</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_box_to_sign",
    "group": "Stores",
    "type": "get",
    "url": "/stores/boxToSign",
    "title": "Get box to sign list",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    toSign:\n    [ \n        { \n            boxID: String,\n            boxTime: Date,\n            typeList: [Array],\n            containerList: [Object],\n            isDelivering: Boolean,\n            destinationStore: Number //storeID,\n            containerOverview: [Array] \n        },\n        ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_change_open_time",
    "group": "Stores",
    "type": "post",
    "url": "/stores/changeOpeningTime",
    "title": "Change open time",
    "permission": [
      {
        "name": "clerk_manager"
      }
    ],
    "parameter": {
      "examples": [
        {
          "title": "Request-example ",
          "content": "{\n    opening_hours: [{\n        close: {\n            time: String //ex. \"19:00\",\n            day: Number // 1\n        },\n        open: {\n            time: String //ex. \"09:00\",\n            day: Number // 1\n        },\n        _id: String\n        },\n        ...\n    ]               \n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    type: 'changeOpeningTime', \n    message: 'Change succeed' \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "E003",
            "description": "<p>status : 403, type : changeOpeningTimeError, msg : Data format invalid</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_check_unreturned",
    "group": "Stores",
    "type": "get",
    "url": "/stores/checkUnReturned",
    "title": "Check unreturned containers",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    data: Array \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_dict",
    "group": "Stores",
    "type": "get",
    "url": "/stores/dict",
    "title": "Get store dict",
    "permission": [
      {
        "name": "admin",
        "title": "Admin access rights needed.",
        "description": "<p>Please use admin identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    '0': '正興咖啡館',\n    '1': '布萊恩紅茶 (正興店)',\n    ...\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_frequent_guest_list",
    "group": "Stores",
    "type": "get",
    "url": "/stores/favorite",
    "title": "Get frequent guest list",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "    HTTP/1.1 200 \n    { \n        userList:\n        [\n            { phone: '09xxxxxxxx', times: Number },\n            ...\n        ] \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_get_user_s_apiKey",
    "group": "Stores",
    "type": "get",
    "url": "/stores/getUser/:phone",
    "title": "Get user's apiKey",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      },
      {
        "name": "bot",
        "title": "Bot access rights needed.",
        "description": "<p>Please use bot identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    phone: '09xxxxxxxx', \n    apiKey: String \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_history",
    "group": "Stores",
    "type": "get",
    "url": "/stores/history",
    "title": "Get history",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    rentHistory: { \n        amount: Number, \n        dataList: Array \n    },\n    returnHistory: { \n        amount: Number, \n        dataList: Array\n    } \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_history_by_container_type",
    "group": "Stores",
    "type": "get",
    "url": "/stores/history/byContainerType",
    "title": "Get history by container type",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    personalLostHistory: Array,\n    storeLostHistory: Array,\n    usedHistory: Array,\n    rentHistory: Array,\n    returnHistory: Array,\n    cleanReloadHistory: Array \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_history_by_customer___To_do__oriUser_storeID_",
    "group": "Stores",
    "type": "get",
    "url": "/stores/history/byCustomer",
    "title": "Get history by customer",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    totalDistinctCustomer: Number, \n    customerSummary: Object\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_list",
    "group": "Stores",
    "type": "get",
    "url": "/stores/list",
    "title": "Get store list",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n     title: 'Stores list',\n     contract_code_explanation: {\n     '0': 'Only borrowable and returnable',\n     '1': 'Only returnable',\n     '2': 'Borrowable and returnable'\n     },\n     globalAmount: 0,\n     shop_data: [{\n         id: 0,\n         name: '正興咖啡館',\n         img_info: [Object],\n         opening_hours: [Array],\n         contract: [Object],\n         location: [Object],\n         address: '台南市中西區國華街三段43號',\n         type: [Array],\n         category: Number, // (0, 1, 9) = (\"店舖\", \"活動\", \"庫存\")\n         testing: false\n     },\n     ...\n     ]\n }",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqID",
            "description": "<p>random text ( suggestion -&gt; String that encode with ‘hex’, length = 10 )</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqTime",
            "description": "<p>Time.now()</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A001",
            "description": "<p>status : 401, msg : Req Invalid - Missing hashID or reqTime in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A002",
            "description": "<p>status : 401, msg : Req Expired - reqTime is not acceptable</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_list",
    "group": "Stores",
    "type": "get",
    "url": "/stores/list/:id",
    "title": "Get store specific store info",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n     title: 'Store info',\n     contract_code_explanation: {\n     '0': 'Only borrowable and returnable',\n     '1': 'Only returnable',\n     '2': 'Borrowable and returnable'\n     },\n     globalAmount: 0,\n     shop_data: [{\n         id: 0,\n         name: '正興咖啡館',\n         img_info: [Object],\n         opening_hours: [Array],\n         contract: [Object],\n         location: [Object],\n         address: '台南市中西區國華街三段43號',\n         type: [Array],\n         category: Number, // (0, 1, 9) = (\"店舖\", \"活動\", \"庫存\")\n         testing: false\n     }]\n }",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqID",
            "description": "<p>random text ( suggestion -&gt; String that encode with ‘hex’, length = 10 )</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqTime",
            "description": "<p>Time.now()</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A001",
            "description": "<p>status : 401, msg : Req Invalid - Missing hashID or reqTime in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A002",
            "description": "<p>status : 401, msg : Req Expired - reqTime is not acceptable</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_list_JSON",
    "group": "Stores",
    "type": "get",
    "url": "/stores/list.js",
    "title": "Get store list with JSON format",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n\nvar placeid_json = [{\"placeid\":\"ChIJ8c8g8WR2bjQRsgin1zcdMsk\",\"name\":\"正興咖啡館\",\"borrow\":true,\"return\":true,\"type\":\"咖啡, 生活小物, 旅宿\"},...]",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores"
  },
  {
    "name": "Store_performance____To_do__oriUser_storeID_",
    "group": "Stores",
    "type": "get",
    "url": "/stores/performance",
    "title": "Get store performance",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_s_clerk_list",
    "group": "Stores",
    "type": "get",
    "url": "/stores/clerkList",
    "title": "Get store's clerk list",
    "permission": [
      {
        "name": "manager",
        "title": "Manager access rights needed.",
        "description": "<p>Please use manager identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    clerkList:\n    [\n        { phone: '09xxxxxxxx', name: 'Handsome', isManager: true },\n        ...\n    ]\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_s_openingTime",
    "group": "Stores",
    "type": "get",
    "url": "/stores/openingTime",
    "title": "Get store's opening time",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    opening_hours:\n    [ \n        { \n            _id: String,\n            close: { day: Number, time: String },  //0 means Sunday\n            open: { day: Number, time: String }\n        },\n        ...  // Missing day means day off\n    ],\n    isSync: true \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_s_status",
    "group": "Stores",
    "type": "get",
    "url": "/stores/status",
    "title": "Get store's status",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    containers:\n    [ \n        { typeCode: 0, name: '12oz 玻璃杯', IdList: [], amount: 0 },\n        ...    \n    ],\n    toReload:\n    [ \n        { typeCode: 0, name: '12oz 玻璃杯', IdList: [Array], amount: 5 },\n        ...\n    ],\n    todayData: { \n        rent: 0, \n        return: 0 \n    },\n    lostList: [// container ID] \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_specific_activity",
    "group": "Stores",
    "type": "get",
    "url": "/stores/activity/:activityID",
    "title": "Get specific activity",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n    ID: '0',\n    name: '沒活動',\n    startAt: '2018-03-02T16:00:00.000Z',\n    endAt: '2018-03-02T16:00:00.000Z' \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqID",
            "description": "<p>random text ( suggestion -&gt; String that encode with ‘hex’, length = 10 )</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqTime",
            "description": "<p>Time.now()</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A001",
            "description": "<p>status : 401, msg : Req Invalid - Missing hashID or reqTime in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A002",
            "description": "<p>status : 401, msg : Req Expired - reqTime is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "E005",
            "description": "<p>status : 404 type: GetActivityError, msg: activity not found, plz check id</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_unset_default_openingTime",
    "group": "Stores",
    "type": "post",
    "url": "/stores/unsetDefaultOpeningTime",
    "title": "Unset default opening time",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ }",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Store_use_amount",
    "group": "Stores",
    "type": "get",
    "url": "/stores/usedAmount",
    "title": "Get used amount",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{\n    store:\n    [ \n        { typeCode: Number, amount: Number },\n        ...\n    ],\n    total: Number \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/stores.js",
    "groupTitle": "Stores",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "AddBot",
    "group": "Users",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "type": "post",
    "url": "/users/addbot",
    "title": "Add bot",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "botName",
            "description": "<p>bot name.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "scopeID",
            "description": "<p>scope id.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n     type: 'signupMessage',\n     message: 'Authentication succeeded',\n     keys: {\n         apiKey: String,\n         secretKey: String\n     } \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D001",
            "description": "<p>status : 401, type : signupMessage, msg : Content not Complete - Missing phone or password in body</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D003",
            "description": "<p>status : 401, type : signupMessage, msg : Role structure invalid</p>"
          }
        ]
      }
    }
  },
  {
    "name": "CreateBotKey",
    "group": "Users",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "type": "post",
    "url": "/users/createBotKey",
    "title": "Create new key pair for bot",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "bot",
            "description": "<p>bot name.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n     type: 'signupMessage',\n     message: 'Authentication succeeded',\n     keys: {\n         apiKey: String,\n         secretKey: String\n     } \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Data",
    "group": "Users",
    "type": "get",
    "url": "/users/data",
    "title": "Get user data",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "    HTTP/1.1 200 \n    {\n\t        usingAmount : 0,\n\t        data : [\n\t\t    {\n\t\t\t    container : String, // #001\n\t\t\t    time : Date\n\t\t\t    returned : Boolean\n\t\t\t    type : String // 12oz 玻璃杯\n\t\t\t    store : String // 正興咖啡館\n\t\t\t    returnTime : Date // If returned == true\n\t\t    }, ...\n\t        ],\n\t        globalAmount : Number\n     }",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "DataByToken",
    "group": "Users",
    "type": "get",
    "url": "/users/data/:token",
    "title": "Get user data by token",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "    HTTP/1.1 200 \n    {\n\t        usingAmount : 0,\n\t        data : [\n\t\t    {\n\t\t\t    container : String, // #001\n\t\t\t    time : Date\n\t\t\t    returned : Boolean\n\t\t\t    type : String // 12oz 玻璃杯\n\t\t\t    store : String // 正興咖啡館\n\t\t\t    returnTime : Date // If returned == true\n\t\t    }, ...\n\t        ],\n\t        globalAmount : Number\n     }",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Forgot_Password",
    "group": "Users",
    "type": "post",
    "url": "/users/forgotpassword",
    "title": "Forgot password (step 1)",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phone",
            "description": "<p>phone of the User.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 205 Need Verification Code\n{ \n     type: 'forgotPassMessage',\n     message: 'Send Again With Verification Code' \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqID",
            "description": "<p>random text ( suggestion -&gt; String that encode with ‘hex’, length = 10 )</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqTime",
            "description": "<p>Time.now()</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A001",
            "description": "<p>status : 401, msg : Req Invalid - Missing hashID or reqTime in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A002",
            "description": "<p>status : 401, msg : Req Expired - reqTime is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D009",
            "description": "<p>status : 401, type : forgotPassMessage, msg : Phone is not valid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D010",
            "description": "<p>status : 401, type : forgotPassMessage, msg : Verification Code expired</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D011",
            "description": "<p>status : 401, type : forgotPassMessage, msg : Verification Code isn't correct</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D012",
            "description": "<p>status : 401, type : forgotPassMessage, msg : Content not Complete - Missing phone or password in body</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D013",
            "description": "<p>status : 401, type : forgotPassMessage, msg : No User Found</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Forgot_Password__add_verification_code_",
    "group": "Users",
    "type": "post",
    "url": "/users/forgotpassword",
    "title": "Forgot password (step 2)",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phone",
            "description": "<p>phone of the User.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "new_password",
            "description": "<p>new password of the User.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "verification",
            "description": "<p>code from sms</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 Signup Successfully\n{ \n     type: 'forgotPassMessage',\n     message: 'Authentication succeeded' \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqID",
            "description": "<p>random text ( suggestion -&gt; String that encode with ‘hex’, length = 10 )</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqTime",
            "description": "<p>Time.now()</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A001",
            "description": "<p>status : 401, msg : Req Invalid - Missing hashID or reqTime in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A002",
            "description": "<p>status : 401, msg : Req Expired - reqTime is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D009",
            "description": "<p>status : 401, type : forgotPassMessage, msg : Phone is not valid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D010",
            "description": "<p>status : 401, type : forgotPassMessage, msg : Verification Code expired</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D011",
            "description": "<p>status : 401, type : forgotPassMessage, msg : Verification Code isn't correct</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D012",
            "description": "<p>status : 401, type : forgotPassMessage, msg : Content not Complete - Missing phone or password in body</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D013",
            "description": "<p>status : 401, type : forgotPassMessage, msg : No User Found</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Login",
    "group": "Users",
    "type": "post",
    "url": "/users/login",
    "title": "User login",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phone",
            "description": "<p>phone of the User.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>password of the User.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 Login Successfully (res.header.authorization)\n{ \n     **Decoded JWT**\n     payload = {\n         \"roles\": {\n             \"typeList\": [ //the list with ids that you can use\n                 \"admin\"\n             ],\n         \"admin\": {\n             \"stationID\": Number,\n             \"manager\": Boolean,\n             \"apiKey\": String,\n             \"secretKey\": String\n         } // ids' info will store in its own object\n     } \n }",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqID",
            "description": "<p>random text ( suggestion -&gt; String that encode with ‘hex’, length = 10 )</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqTime",
            "description": "<p>Time.now()</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A001",
            "description": "<p>status : 401, msg : Req Invalid - Missing hashID or reqTime in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A002",
            "description": "<p>status : 401, msg : Req Expired - reqTime is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D004",
            "description": "<p>status : 401, type : loginMessage, msg : Content not Complete - Missing phone or password in body</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D005",
            "description": "<p>status : 401, type : loginMessage, msg : No user found</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D006",
            "description": "<p>status : 401, type : loginMessage, msg : Wrong password</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Logout",
    "group": "Users",
    "type": "post",
    "url": "/users/logout",
    "title": "User logout",
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 Signup Successfully\n{ \n     type: 'logoutMessage',\n     message: 'Logout succeeded' \n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "Others",
            "description": "<p>Remember ‘jti’ and contact me</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    }
  },
  {
    "name": "ModifyPassword",
    "group": "Users",
    "permission": [
      {
        "name": "admin_clerk",
        "title": "Admin/Clerk access rights needed.",
        "description": "<p>Please use admin/clerk identity to request this uri.</p>"
      }
    ],
    "type": "post",
    "url": "/users/modifypassword",
    "title": "Modify user's password",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "oripassword",
            "description": "<p>original password of the user.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "newpassword",
            "description": "<p>new password of the user.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 Signup Successfully\n{ \n     type: 'chanPassMessage',\n     message: 'Change succeeded' \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D007",
            "description": "<p>status : 401, type : chanPassMessage, msg : Content not Complete - Missing phone or password in body</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D008",
            "description": "<p>status : 401, type : chanPassMessage, msg : Wrong password</p>"
          }
        ]
      }
    }
  },
  {
    "name": "SignUp",
    "group": "Users",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "type": "post",
    "url": "/users/signup",
    "title": "Sign up for new user (step 1)",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phone",
            "description": "<p>phone of the User.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>password of the User.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 205 Need Verification Code\n{ \n     type: 'signupMessage',\n     message: 'Send Again With Verification Code' \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqID",
            "description": "<p>random text ( suggestion -&gt; String that encode with ‘hex’, length = 10 )</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqTime",
            "description": "<p>Time.now()</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A001",
            "description": "<p>status : 401, msg : Req Invalid - Missing hashID or reqTime in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A002",
            "description": "<p>status : 401, msg : Req Expired - reqTime is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D001",
            "description": "<p>status : 401, type : signupMessage, msg : Content not Complete - Missing phone or password in body</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D002",
            "description": "<p>status : 401, type : signupMessage, msg : That phone is already taken - This phone has been register</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D003",
            "description": "<p>status : 401, type : signupMessage, msg : Role structure invalid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D009",
            "description": "<p>status : 401, type : signupMessage, msg : Phone is not valid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D010",
            "description": "<p>status : 401, type : signupMessage, msg : Verification Code expired</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D011",
            "description": "<p>status : 401, type : signupMessage, msg : Verification Code isn't correct</p>"
          }
        ]
      }
    }
  },
  {
    "name": "SignUp_Activity",
    "group": "Users",
    "permission": [
      {
        "name": "admin_clerk",
        "title": "Admin/Clerk access rights needed.",
        "description": "<p>Please use admin/clerk identity to request this uri.</p>"
      }
    ],
    "type": "post",
    "url": "/users/signup/activity",
    "title": "Sign up for customer from activity",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phone",
            "description": "<p>phone of the User.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>password of the User.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 Signup Successfully\n{ \n     type: 'signupMessage',\n     message: 'Authentication succeeded' \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D001",
            "description": "<p>status : 401, type : signupMessage, msg : Content not Complete - Missing phone or password in body</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D002",
            "description": "<p>status : 401, type : signupMessage, msg : That phone is already taken - This phone has been register</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D003",
            "description": "<p>status : 401, type : signupMessage, msg : Role structure invalid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D009",
            "description": "<p>status : 401, type : signupMessage, msg : Phone is not valid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D010",
            "description": "<p>status : 401, type : signupMessage, msg : Verification Code expired</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D011",
            "description": "<p>status : 401, type : signupMessage, msg : Verification Code isn't correct</p>"
          }
        ]
      }
    }
  },
  {
    "name": "SignUp_Clerk",
    "group": "Users",
    "permission": [
      {
        "name": "manager",
        "title": "Manager access rights needed.",
        "description": "<p>Please use manager identity to request this uri.</p>"
      }
    ],
    "type": "post",
    "url": "/users/signup/clerk",
    "title": "Sign up for new clerk",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phone",
            "description": "<p>phone of the User.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>password of the User.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 Signup Successfully\n{ \n     type: 'signupMessage',\n     message: 'Authentication succeeded' \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D001",
            "description": "<p>status : 401, type : signupMessage, msg : Content not Complete - Missing phone or password in body</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D002",
            "description": "<p>status : 401, type : signupMessage, msg : That phone is already taken - This phone has been register</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D003",
            "description": "<p>status : 401, type : signupMessage, msg : Role structure invalid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D009",
            "description": "<p>status : 401, type : signupMessage, msg : Phone is not valid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D010",
            "description": "<p>status : 401, type : signupMessage, msg : Verification Code expired</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D011",
            "description": "<p>status : 401, type : signupMessage, msg : Verification Code isn't correct</p>"
          }
        ]
      }
    }
  },
  {
    "name": "SignUp_Manager",
    "group": "Users",
    "permission": [
      {
        "name": "admin_manager",
        "title": "Admin manager access rights needed.",
        "description": "<p>Please use admin manager identity to request this uri.</p>"
      }
    ],
    "type": "post",
    "url": "/users/signup/storeManager",
    "title": "Sign up for new store manager",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phone",
            "description": "<p>phone of the User.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>password of the User.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "storeID",
            "description": "<p>store of the store manager.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 Signup Successfully\n{ \n     type: 'signupMessage',\n     message: 'Authentication succeeded' \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D001",
            "description": "<p>status : 401, type : signupMessage, msg : Content not Complete - Missing phone or password in body</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D002",
            "description": "<p>status : 401, type : signupMessage, msg : That phone is already taken - This phone has been register</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D003",
            "description": "<p>status : 401, type : signupMessage, msg : Role structure invalid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D009",
            "description": "<p>status : 401, type : signupMessage, msg : Phone is not valid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D010",
            "description": "<p>status : 401, type : signupMessage, msg : Verification Code expired</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D011",
            "description": "<p>status : 401, type : signupMessage, msg : Verification Code isn't correct</p>"
          }
        ]
      }
    }
  },
  {
    "name": "SignUp_Root",
    "group": "Users",
    "permission": [
      {
        "name": "admin_clerk",
        "title": "Admin/Clerk access rights needed.",
        "description": "<p>Please use admin/clerk identity to request this uri.</p>"
      }
    ],
    "type": "post",
    "url": "/users/signup/root",
    "title": "Sign up for customer from admin or clerk",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phone",
            "description": "<p>phone of the User.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>password of the User.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 Signup Successfully\n{ \n     type: 'signupMessage',\n     message: 'Authentication succeeded' \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D001",
            "description": "<p>status : 401, type : signupMessage, msg : Content not Complete - Missing phone or password in body</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D002",
            "description": "<p>status : 401, type : signupMessage, msg : That phone is already taken - This phone has been register</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D003",
            "description": "<p>status : 401, type : signupMessage, msg : Role structure invalid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D009",
            "description": "<p>status : 401, type : signupMessage, msg : Phone is not valid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D010",
            "description": "<p>status : 401, type : signupMessage, msg : Verification Code expired</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D011",
            "description": "<p>status : 401, type : signupMessage, msg : Verification Code isn't correct</p>"
          }
        ]
      }
    }
  },
  {
    "name": "SignUp__add_verification_code_",
    "group": "Users",
    "permission": [
      {
        "name": "clerk",
        "title": "Clerk access rights needed.",
        "description": "<p>Please use clerk identity to request this uri.</p>"
      }
    ],
    "type": "post",
    "url": "/users/signup",
    "title": "Sign up for new user (step 2)",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "phone",
            "description": "<p>phone of the User.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "password",
            "description": "<p>password of the User.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "verification",
            "description": "<p>code from sms</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 Signup Successfully\n{ \n     type: 'signupMessage',\n     message: 'Authentication succeeded' \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqID",
            "description": "<p>random text ( suggestion -&gt; String that encode with ‘hex’, length = 10 )</p>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "reqTime",
            "description": "<p>Time.now()</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A001",
            "description": "<p>status : 401, msg : Req Invalid - Missing hashID or reqTime in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "A002",
            "description": "<p>status : 401, msg : Req Expired - reqTime is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D001",
            "description": "<p>status : 401, type : signupMessage, msg : Content not Complete - Missing phone or password in body</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D002",
            "description": "<p>status : 401, type : signupMessage, msg : That phone is already taken - This phone has been register</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D003",
            "description": "<p>status : 401, type : signupMessage, msg : Role structure invalid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D009",
            "description": "<p>status : 401, type : signupMessage, msg : Phone is not valid</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D010",
            "description": "<p>status : 401, type : signupMessage, msg : Verification Code expired</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D011",
            "description": "<p>status : 401, type : signupMessage, msg : Verification Code isn't correct</p>"
          }
        ]
      }
    }
  },
  {
    "name": "Subscribe_SNS_service",
    "group": "Users",
    "type": "post",
    "url": "/users/subscribeSNS",
    "title": "Subscribe SNS service",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "deviceToken",
            "description": "<p>Token of the device.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "appType",
            "description": "<p>customer or shop.</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "system",
            "description": "<p>The system what the user use (ios | android).</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 \n{ \n     type: 'subscribeMessage',\n     message: 'Subscribe succeeded',\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "routes/users.js",
    "groupTitle": "Users",
    "header": {
      "fields": {
        "Header": [
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "Authorization",
            "description": "<p>A JWT string, encode using Secret key : // secretKey you get by login. Shouldn’t contain 'Bearer ’ in string</p> <p>JWT payload should contain:</p> <ul> <li>jti : random text ( suggestion -&gt; encode with ‘hex’, length = 10 )</li> <li>iat : Time.now();</li> <li>epx : Time.now(); plus 3 days</li> </ul>"
          },
          {
            "group": "Header",
            "type": "String",
            "optional": false,
            "field": "ApiKey",
            "description": "<p>You can get ApiKey by signup or login</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 4xx": [
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B001",
            "description": "<p>status : 401, msg : JWT or ApiKey undefined - Missing authorization or apikey in headers</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B002",
            "description": "<p>status : 401, msg : User not Found - apikey is wrong</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B003",
            "description": "<p>status : 401, msg : User has logout - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B004",
            "description": "<p>status : 401, msg : User has Banned - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B005",
            "description": "<p>status : 401, msg : JWT Invalid - Wrong encoding of authorization or User has logined on other device</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B006",
            "description": "<p>status : 401, msg : JWT Payload Invalid - Missing jti or iat or exp in authorization's payload</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B007",
            "description": "<p>status : 401, msg : JWT Expired - iat or exp is not acceptable</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "B008",
            "description": "<p>status : 401, msg : Not Authorized for this URI - As msg says</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D009",
            "description": "<p>status : 401, type : subscribeMessage, msg : Content not Complete</p>"
          },
          {
            "group": "Error 4xx",
            "type": "String",
            "optional": false,
            "field": "D010",
            "description": "<p>status : 401, type : subscribeMessage, msg : Content invalid - appType or sysyem is wrong</p>"
          }
        ]
      }
    }
  }
] });
