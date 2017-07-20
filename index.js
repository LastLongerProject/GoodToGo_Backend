var server = require("./serverWithRouter");
var requestHandlers = require("./requestHandlers");

server.start(requestHandlers);