var express = require('express');
var router = express.Router();

var account = require('./account');
var group = require('./group');
var conf = require('./conf');

router.use('/account', account);
router.use('/group', group);
router.use('/conf', conf);

router.use('/', function(req, res, next) {
  res.sendStatus(404);
});

module.exports = router;
