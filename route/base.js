var express = require('express');
var router = express.Router();

var config = require('../config');

var account = require('./account');
var group = require('./group');
var conf = require('./conf');
var user = require('./user');
var testing = require('./testing');

router.use('/account', account);
router.use('/group', group);
router.use('/conf', conf);
router.use('/user', user);

if(config.develop.testing) router.use('/testing', testing);

router.get('/generate_204', function(req, res, next) {
  res.status(204).send("ConsoleiT API up and running.");
})
router.use('/', function(req, res, next) {
  res.sendStatus(404);
});

module.exports = router;
