define({
  "name": "GoodToGo_backend",
  "version": "1.0.0",
  "description": "API doc for https://app.goodtogo.tw",
  "title": "API Doc",
  "url": "https://app.goodtogo.tw",
  "header": {
    "title": "Auth",
    "content": "<h1>§ Auth Method &amp; Security</h1>\n<h2>| Default</h2>\n<h3>Headers</h3>\n<ul>\n<li>reqID : random text ( suggestion -&gt; String that encode with 'hex', length = 10 )</li>\n<li>reqTime : Time.now();</li>\n</ul>\n<h3>Error Code</h3>\n<ul>\n<li>A001 ~ A002</li>\n</ul>\n<h2>| JWT</h2>\n<h3>Headers</h3>\n<ul>\n<li>Authorization (A JWT string, encode using Secret key : // secretKey you get by signup or login. Shouldn't contain 'Bearer ' in string)</li>\n</ul>\n<blockquote>\n<p>JWT payload should contain :</p>\n<ul>\n<li>jti : random text ( suggestion -&gt; encode with 'hex', length = 10 )</li>\n<li>iat : Time.now();</li>\n<li>exp : Time.now(); plus 3 days</li>\n</ul>\n</blockquote>\n<ul>\n<li>ApiKey</li>\n</ul>\n<blockquote>\n<p>You can get ApiKey by signup or login</p>\n</blockquote>\n<h3>Error Code</h3>\n<ul>\n<li>B001 ~ B008</li>\n</ul>\n<h2>| Token Control</h2>\n<h3>Url</h3>\n<ul>\n<li>The url you get from &quot;/stores/list&quot;</li>\n</ul>\n<h3>Error Code</h3>\n<ul>\n<li>C001 ~ C003</li>\n</ul>\n<h2>| LINE</h2>\n<h3>Headers</h3>\n<ul>\n<li>line-id</li>\n</ul>\n<h3>Error Code</h3>\n<ul>\n<li>B001 ~ B004</li>\n</ul>\n"
  },
  "footer": {
    "title": "Error reference",
    "content": "<h1>§ Error Message</h1>\n<p><strong>ALL Message is sended by JSON</strong></p>\n<pre><code>Default Format of Error Message\n{\n    code: String, // ex.A001\n    type : String, // Error Type\n    message : String // Message Content\n    [,extra data...] // Some Error Response will Contain Extra key-value Pair\n}\n</code></pre>\n<ul>\n<li>Global Error - <code>type: globalError</code>\n<ul>\n<li><strong>Z001</strong> - <code>status : 404</code> - Not Found</li>\n<li><strong>Z002</strong> - <code>status : ???</code> - Plz contact me ASAP</li>\n<li><strong>Z003</strong> - <code>status : 500</code> - Server Error, Plz contact me ASAP</li>\n</ul>\n</li>\n<li>A series - <code>type : validatingDefault</code>\n<ul>\n<li><strong>A001</strong> - <code>status : 401, msg : Req Invalid</code> - Missing <code>hashID</code> or <code>reqTime</code> in headers</li>\n<li><strong>A002</strong> - <code>status : 401, msg : Req Expired</code> - <code>reqTime</code> is not acceptable</li>\n</ul>\n</li>\n<li>B series - <code>type : validatingUser</code>\n<ul>\n<li><strong>B001</strong> - <code>status : 401, msg : JWT or ApiKey undefined</code> - Missing <code>authorization</code> or <code>apikey</code> in headers</li>\n<li><strong>B002</strong> - <code>status : 401, msg : User not Found</code> - <code>apikey</code> is wrong</li>\n<li><strong>B003</strong> - <code>status : 401, msg : User has logout</code> - As msg says</li>\n<li><strong>B004</strong> - <code>status : 401, msg : User has Banned</code> - As msg says</li>\n<li><strong>B005</strong> - <code>status : 401, msg : JWT Invalid</code> - Wrong encoding of <code>authorization</code> or User has logined on other device</li>\n<li><strong>B006</strong> - <code>status : 401, msg : JWT Payload Invalid</code> - Missing <code>jti</code> or <code>iat</code> or <code>exp</code> in <code>authorization</code>'s payload</li>\n<li><strong>B007</strong> - <code>status : 401, msg : JWT Expired</code> - <code>iat</code> or <code>exp</code> is not acceptable</li>\n<li><strong>B008</strong> - <code>status : 401, msg : Not Authorized for this URI</code> - As msg says</li>\n</ul>\n</li>\n<li>C series - <code>type : validatingToken</code>\n<ul>\n<li><strong>C001</strong> - <code>status : 401, msg : Token Invalid</code> - Token in URL can't be decoded, Plz contact me ASAP</li>\n<li><strong>C002</strong> - <code>status : 401, msg : Token Payload Invalid</code> - Payload in Token in URL not complete, Plz contact me ASAP</li>\n<li><strong>C003</strong> - <code>status : 401, msg : Token Expired</code> - You should use the newest URL given by server, hint: <code>Recall req with no-cache header can avoid to get the old url stored in cache</code></li>\n</ul>\n</li>\n<li>D series -\n<ul>\n<li><strong>D001</strong> - <code>status : 401, type : signupMessage, msg : Content not Complete</code> - Missing <code>phone</code> or <code>password</code> in body</li>\n<li><strong>D002</strong> - <code>status : 401, type : signupMessage, msg : That phone is already taken</code> - This phone has been register</li>\n<li><strong>D003</strong> - <code>status : 401, type : signupMessage, msg : Role structure invalid</code> - As msg says</li>\n<li><strong>D004</strong> - <code>status : 401, type : loginMessage, msg : Content not Complete</code> - Missing <code>phone</code> or <code>password</code> in body</li>\n<li><strong>D005</strong> - <code>status : 401, type : loginMessage, msg : No user found</code> - This <code>phone</code> has not registered yet</li>\n<li><strong>D006</strong> - <code>status : 401, type : loginMessage, msg : Wrong password</code> - As msg says</li>\n<li><strong>D007</strong> - <code>status : 401, type : chanPassMessage, msg : Content not Complete</code> - Missing <code>oriPassword</code> or <code>newPassword</code> in body</li>\n<li><strong>D008</strong> - <code>status : 401, type : chanPassMessage, msg : Wrong password</code> - <code>oriPassword</code> is wrong</li>\n<li><strong>D009</strong> - <code>status : 401, type : signupMessage/forgotPassMessage, msg : Phone is not valid</code></li>\n<li><strong>D010</strong> - <code>status : 401, type : signupMessage/forgotPassMessage, msg : Verification Code expired</code></li>\n<li><strong>D011</strong> - <code>status : 401, type : signupMessage/forgotPassMessage, msg : Verification Code isn't correct</code></li>\n<li><strong>D012</strong> - <code>status : 401, type : forgotPassMessage, msg : Content not Complete - Missing phone or password in body</code></li>\n<li><strong>D013</strong> - <code>status : 401, type : forgotPassMessage, msg : No User Found</code></li>\n<li><strong>E001</strong> - <code>status : 403, type : userSearchingError, msg : No User: [09XXXXXXXX] Found</code> - This <code>phone</code> has not been register\n<blockquote>\n<p>Extra Key-Value :\n<code>data : String // &quot;09XXXXXXXX&quot;</code></p>\n</blockquote>\n</li>\n<li><strong>E002</strong> - <code>status : 403, type : layoffError, msg : Don't lay off yourself</code> - As msg says</li>\n<li><strong>E003</strong> - <code>status : 403, type : changeOpeningTimeError, msg : Data format invalid</code> - Req body invalid</li>\n</ul>\n</li>\n<li>F series - <code>type : [:action]Message</code>\n<ul>\n<li><strong>F001</strong> - <code>status : 403, msg : [:action] Error</code> - The changing state of containers are not acceptable\n<blockquote>\n<p>Extra Key-Value :\n<code>stateExplanation : a Array of String, // ['delivering', ...]</code>\n<code>listExplanation : a Array of String, // [&quot;containerID&quot;,...]</code>\n<code>errorList : a Array of Array(3)</code></p>\n</blockquote>\n</li>\n<li><strong>F002</strong> - <code>status : 403, msg : No container found</code> - The container is not Legal\n<blockquote>\n<p>Extra Key-Value :\n<code>data : String // Container ID</code></p>\n</blockquote>\n</li>\n<li><strong>F003</strong> - <code>status : 403, msg : Container not available</code> - The container has marked as unavailable\n<blockquote>\n<p>Extra Key-Value :\n<code>data : String // Container ID</code></p>\n</blockquote>\n</li>\n<li><strong>F004</strong> - <code>status : 403, msg : No user found</code> - DB unexpected conflict, Plz contact me ASAP</li>\n<li><strong>F005</strong> - <code>status : 403, msg : User has Banned</code> - The user has banned by admin or account subscription is expirated</li>\n<li><strong>F006</strong> - <code>status : 403, msg : Missing Order Time</code> - JWT payload missing <code>orderTime</code></li>\n<li><strong>F007</strong> - <code>status : 403, msg : Can't Find The Box</code> - The box ID is wrong</li>\n<li><strong>F008</strong> - <code>status : 403, msg : Box is not belong to user's store</code> - As msg says</li>\n<li><strong>F009</strong> - <code>status : 403, msg : Invalid Rent Request</code> - Missing <code>userapikey</code> in headers</li>\n<li><strong>F010</strong> - <code>status : 403, msg : Container not belone to user's store</code> - As msg says</li>\n<li><strong>F011</strong> - <code>status : 403, msg : Boxing req body incomplete</code> - Missing <code>containerList</code> or <code>boxId</code> in request body</li>\n<li><strong>F012</strong> - <code>status : 403, msg : Box is already exist</code> - The box you request is in used</li>\n<li><strong>F013</strong> - <code>status : 403, msg : Rent Request Expired</code> - UserApiKey expired, tell user to search users phone again (call '/getUser' API again)</li>\n</ul>\n</li>\n<li>G series - <code>type : readImgERR</code>\n<ul>\n<li><strong>G001</strong> - <code>status : 500, msg : No Image found</code> - Server Can't Load IMG, Plz contact me ASAP\n<blockquote>\n<p>Extra Key-Value :\n<code>data : Object</code></p>\n</blockquote>\n</li>\n</ul>\n</li>\n</ul>\n"
  },
  "sampleUrl": false,
  "defaultVersion": "0.0.0",
  "apidoc": "0.3.0",
  "generator": {
    "name": "apidoc",
    "time": "2019-04-19T08:53:57.690Z",
    "url": "http://apidocjs.com",
    "version": "0.17.7"
  }
});
