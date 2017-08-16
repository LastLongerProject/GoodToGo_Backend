var express = require('express');
var router = express.Router();

var debug = require('debug')('goodtogo_backend:containers');
var Container = require('../models/DB/containerDB'); // load up the user model
var User = require('../models/DB/userDB'); // load up the user model
var validateRequest = require('../models/validateRequest');
var fs = require('fs');

var status = ['cleaned', 'readyToUse', 'borrowed', 'returned', 'notClean'];

var typeCode;
fs.readFile("./assets/json/containerType.json", 'utf8', function (err, data) {
    if (err) throw err;
    typeCode = JSON.parse(data);
});

router.get('/:id', function(req, res) {
    debug("Redirect to official website.");
    res.writeHead(301,{Location: 'http://goodtogo.tw'});
    res.end();
});

router.get('/borrow/:id', validateRequest, function(dbUser, req, res, next) {
	var key = req.headers['storeapikey'];
	if (!key){
		res.status(401);
	    res.json({
	      "status": 401,
	      "message": "Invalid Request"
	    });
    	return;
	}
	var id = req.params.id;
	validateRequest(req, res, function(dbStore) {
		process.nextTick(function() {
		    Container.findOne({ 'container.ID' : id }, function(err, container) {
		        if (err)
		            return next(err);
		        if (!container)
		            return res.status(404).json({ type:'borrowContainerMessage', message: 'No container found.'});
		        container.container.statusCode = 2;
		        container.container.conbineTo = dbUser.user.phone;
		        container.save(function (err, updatedContainer) {
		        	if (err) return handleError(err);
		        });
			    dbUser.role.customer.history.push({
				    'containerID' : id,
				    'typeCode'    : container.container.typeCode,
				    'storeID'     : dbStore.role.clerk.storeID,
				    'returned'    : false
				});
			    dbUser.save(function (err, updatedUser) {
			        if (err) return handleError(err);
			    	res.status(200).json({ type:'borrowContainerMessage', message: 'Borrow succeeded.'});
			    });
		    });
	    });
	} , key);
});

router.get('/return/:id', function(req, res, next) {
	var id = req.params.id;
	process.nextTick(function() {
		Container.findOne({ 'container.ID' : id }, function(err, container) {
		    if (err)
		        return next(err);
		    if (!container)
		        return res.status(404).json({ type:'returnContainerMessage', message: 'No container found.'});
		    User.findOne({ 'user.phone' : container.container.conbineTo }, function(err, user) {
			    if (err)
			        return next(err);
			    if (!user)
			        return res.status(404).json({ type:'returnContainerMessage', message: 'No user found.'});
			    var historyData = user.role.customer.history;

			    	console.log(historyData.length);
			    for (i = 0; i < historyData.length; i++) {
			    	console.log(typeof historyData[i].containerID);
			    	console.log(typeof id);
			    	console.log(historyData[i].containerID === id);

			    	console.log(historyData[i].returned === false);
			    	console.log(historyData[i].containerID === id && (historyData[i].returned === false));

			    	if (historyData[i].containerID.toString() === id && historyData[i].returned === false) {
			    		historyData[i].returned = true;
			    		historyData[i].returnTime = Date.now();
			    		console.log(historyData[i]);
			    		break;
			    	}
			    }
			    console.log(historyData);
			    user.role.customer.history = historyData;
				user.save(function (err, updateduser) {
					if (err) throw err;
				});
			    container.container.statusCode = 3;
			    container.container.conbineTo = null;
			    container.save(function (err, updatedContainer) {
			       	if (err) throw err;
				});
				res.status(200).json({ type: 'returnContainerMessage', message: 'Return succeeded' });
			});
		});
	});
});

router.post('/add/:id', function(req, res, next) {
	containerData = req.body['container'];
	if (!containerData){
		res.status(401);
	    res.json({
	      "status": 401,
	      "message": "Invalid Request"
	    });
    	return;
	}
	var id = req.params.id;
	process.nextTick(function() {
        Container.findOne({'container.ID': id }, function(err, container) {
            if (err)
                return next(err);
            if (container) {
                return res.status(404).json({ type:'addContainerMessage', message: 'That ID is already exist.' });
            } else {
                var newContainer       = new Container();
                newContainer.container.ID         = id;
                newContainer.container.typeCode   = containerData.typeCode;
                newContainer.container.statusCode = 0;
                newContainer.container.conbineTo  = null;                
                newContainer.save(function(err) { // save the container
                    if (err)
                        throw err;
                    res.status(200).json({ type: 'addContainerMessage', message: 'Add succeeded' });
                });
            }
        });
    });
});

module.exports = router;