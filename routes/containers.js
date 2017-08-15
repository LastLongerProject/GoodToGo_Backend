var express = require('express');
var router = express.Router();

var containers = require('../models/containers.js');

// router.get('/', containers.getAll);
// router.get('borrow/:id', containers.getOne);
// router.post('/', containers.create);
// router.put('/:id', containers.update);
// router.delete('/:id', containers.delete);

router.post('/:id', containers.redirect);
router.post('borrow/:id', containers.borrow);
router.post('return/:id', containers.return);
router.post('add/:id', containers.return);

module.exports = router;