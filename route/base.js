var express = require('express');
var router = express.Router();

var config = require('../config');

var account = require('./account');
var group = require('./group');
var conf = require('./conf');
var testing = require('./testing');

router.use('/account', account);
router.use('/group', group);
router.use('/conf', conf);

if(config.develope.testing) router.use('/testing', testing);

router.use('/', function(req, res, next) {
  res.sendStatus(404);
});

module.exports = router;
