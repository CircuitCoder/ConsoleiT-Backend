var express = require('express');
var router = express.Router();

var account = require('./account');

router.use('/account', account);

router.use('/', function(req, res, next) {
  res.sendStatus(404);
});

module.exports = router;
