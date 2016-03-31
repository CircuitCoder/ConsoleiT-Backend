var express = require('express');
var router = express.Router();

var mailer = require('../mailer');

var mailData = {
  realname: "刘晓义",
  passwd: "ActuallyNoPassword",
  url: "SomeURLHere"
}

router.get('/mail/:mailType', (req, res, next) => {
  res.send(mailer(req.params.mailType, null, mailData, null));
});

module.exports = router;
