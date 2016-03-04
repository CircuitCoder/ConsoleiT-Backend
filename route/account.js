// Router for /account

var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var User = mongoose.model('User');

var passport = require('passport');
var mailer = require('../mailer');

router.post('/login', function(req, res, next) {
  if(req.user) return res.send({ error: "InvalidCondition" });
  else if(!req.body) return res.sendStatus(400);
  else {
    passport.authenticate('local', function(err, user) {
      if(err) return next(err);
      else if(!user) return res.send({error: 'CredentialRejected'});
      else {
        req.login(user, function(err) {
          if(err) {
            return next(err);
          } else {
            return res.send({ user });
          }
        });
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
            mailer('new_user', doc.email, {
              realname: doc.realname,
              passwd: passwd
            }, function(err, info) {
              if(err) return next(err);
              else return res.send({
                msg: "RegisterationEmailSent"
              });
            });
          }
        });
      }
    });
  }
});

router.get('/logout', function(req, res, next) {
  if(!req.user) return res.send({ error: "InvalidCondition" });
  else {
    req.logout();
    res.send({
      msg: "OperationSuccessful"
    });
  }
});

router.get('/restore', function(req, res, next) {
  if(req.user) {
    res.send({ user: req.user })
  } else {
    res.send({ error: "NotLoggedIn" });
  }
});

module.exports = router;
