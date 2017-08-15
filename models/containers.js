var Container = require('../models/DB/containerDB'); // load up the user model

var containers = {
  redirect: function(req, res) {
    debug("Redirect to official website.");
    res.writeHead(301,{Location: 'http://goodtogo.tw'});
    res.end();
  },
  borrow: function(req, res, next) {
  //   var newcontainer = req.body;
  //   data.push(newcontainer); // Spoof a DB call
  //   res.json(newcontainer);
    var id = req.params.id;
    process.nextTick(function() {
    Container.findOne({ 'container.ID' :  id }, function(err, container) {
        if (err)
            return next(err);
        if (!container)
            res.status(404).json({ type:'containerMessage', message: 'No container found.'});
        container.status = 'borrowed';
        container.conbineTo = req.body.;
        container.save(function (err, updatedContainer) {
          if (err) return handleError(err);
          res.status(200).json({ type:'containerMessage', message: 'Borrow succeeded.'});
        });
    });
    });
  },
  return: function(req, res) {
  //   var newcontainer = req.body;
  //   data.push(newcontainer); // Spoof a DB call
  //   res.json(newcontainer);
  },
  add: function(req, res) {
    var newcontainer = req.body;
    data.push(newcontainer); // Spoof a DB call
    res.json(newcontainer);
  }
  // getAll: function(req, res) {
  //   var allcontainers = data; // Spoof a DB call
  //   res.json(allcontainers);
  // },

  // getOne: function(req, res) {
  //   var id = req.params.id;
  //   var container = data[0]; // Spoof a DB call
  //   res.json(container);
  // },

  // create: function(req, res) {
  //   var newcontainer = req.body;
  //   data.push(newcontainer); // Spoof a DB call
  //   res.json(newcontainer);
  // },

  // update: function(req, res) {
  //   var updatecontainer = req.body;
  //   var id = req.params.id;
  //   data[id] = updatecontainer // Spoof a DB call
  //   res.json(updatecontainer);
  // },

  // delete: function(req, res) {
  //   var id = req.params.id;
  //   data.splice(id, 1) // Spoof a DB call
  //   res.json(true);
  // }
};

var data = [{
  name: 'container 1',
  id: '1'
}, {
  name: 'container 2',
  id: '2'
}, {
  name: 'container 3',
  id: '3'
}];

module.exports = containers;