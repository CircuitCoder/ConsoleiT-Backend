// Router for /account

var express = require('express');
var router = express.Router();

var exampleUser = {
  realname: "ConsoleiT User #1",
  email: "someone@example.com",
};

router.post('/login', function(req, res, next) {
  if(!req.body) res.sendStatus(400);
  else {
    if(req.body.email == 'someone@example.com' && req.body.passwd == 'consoleit')
      res.send({user: exampleUser});
    else res.send({error: 'CredentialRejected'});
  }
});

router.post('/register', function(req, res, next) {
  res.sendStatus(501);
});

module.exports = router;
