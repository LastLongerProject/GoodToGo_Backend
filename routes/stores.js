var express = require('express');
var router = express.Router();
var fs = require("fs");

var debug = require('debug')('goodtogo_backend:stores');
var validateRequest = require('../models/validateRequest');
var Container = require('../models/DB/containerDB');
var User = require('../models/DB/userDB');

var type;
fs.readFile("./assets/json/containerType.json", 'utf8', function (err, data) {
    if (err) throw err;
    type = JSON.parse(data);
});

/* GET Store list json. */
router.get('/list', function(req, res, next) {
    var obj;
	fs.readFile("./assets/json/stores.json", 'utf8', function (err, data) {
		if (err) throw err;
		obj = JSON.parse(data);
		res.json(obj);
	});
});

router.get('/status', validateRequest, function(dbStore, req, res, next) {
	var resJson = {
		containers : [
			{
				typeCode : 0,
				type : type.type[0],
				amount : 0
			},
			{
				typeCode : 1,
				type : type.type[1],
				amount : 0
			}
		]
	};
	process.nextTick(function() {
		Container.find({ 'container.conbineTo' : dbStore.user.phone }, function(err, container) {
			if (err)
				return next(err);
			if (typeof container !== 'undefined'){
				for (i in container){
					if (container[i].container.statusCode !== 1) debug("Something Wrong :" + container[i]);
					else if (container[i].container.typeCode === 0) resJson['containers'][0]['amount']++ ;
					else if (container[i].container.typeCode === 1) resJson['containers'][1]['amount']++ ;
				}
			}
			res.json(resJson);
		});
	});
});

router.get('/getUser/:id', validateRequest, function(dbStore, req, res, next) {
	var id = req.params.id;
	process.nextTick(function() {
		User.findOne({ 'user.phone' : new RegExp( id.toString() +'$', "i") }, function(err, user) {
			if (err)
				return next(err);
			if (typeof user !== 'undefined'){
				if (user.role.typeCode === 'customer') {
					res.status(200).json({'phone' : user.user.phone, 'apiKey': user.user.apiKey});
				} else {
					res.status(401).json({"type" : "userSearchingError", "message" : "User role is not customer"});
				}
			} else {
				res.status(401).json({"type" : "userSearchingError", "message" : "No User Finded"});
			}
		});
	});
});

module.exports = router;