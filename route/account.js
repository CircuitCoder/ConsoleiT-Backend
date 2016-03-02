// Router for /account

var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var User = mongoose.model('User');

var passport = require('passport');

router.post('/login', function(req, res, next) {
  if(!req.body) res.sendStatus(400);
  else {
    passport.authenticate('local', function(err, user) {
      if(err) return next(err);
      else if(!user) return res.send({error: 'CredentialRejected'});
      else {
        res.sendStatus(200);
      }
    })(req, res, next);
  }
});

router.post('/register', function(req, res, next) {
  if(!req.body || !req.body.realname || !req.body.email) res.sendStatus(400);
  else {
    User.findOne({email: req.body.email}).exec(function(err, doc) {
      if(err) return next(err);
      else if(doc) return res.send({error: 'DuplicatedEmail'});
      else {
        var user = new User({
          email: req.body.email,
          realname: req.body.realname
        });
        var passwd = user.initPasswd();
        user.save(function(err, doc) {
          if(err) next(err);
          else {
            //TODO: Send email
            console.log(passwd);
            return res.sendStatus(200);
          }
        });
      }
    });
  }
});

module.exports = router;
