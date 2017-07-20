var fs = require("fs");
var obj;

fs.readFile("./dev/json/stores.json", 'utf8', function (err, data) {
    if (err) throw err;
    obj = JSON.parse(data);
});

function getStores(request, response) {
    console.log("Request handler 'start' was called.");
    
	response.json(obj);
}

function upload(request, response) {
	console.log("Request handler 'upload' was called.");
}

function show(request, response) {
	console.log("Request handler 'show' was called.");
	fs.readFile("./tmp/test.png", "binary", function(error, file) {
	if(error) {
    	response.writeHead(500, {"Content-Type": "text/plain"});
    	response.write(error + "\n");
    	response.end();
    } else {
		response.writeHead(200, {"Content-Type": "image/png"});
		response.write(file, "binary");
    	response.end();
    }
  });
}

exports.getStores = getStores;
exports.upload = upload;
exports.show = show;