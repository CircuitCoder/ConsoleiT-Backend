// Router for /account

var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Counter = mongoose.model('Counter');

var passport = require('passport');
var mailer = require('../mailer');

var helpers = require('./helpers');

function newUser(email, realname, cb) {
  Counter.getNext("user", function(err, id) {
    if(err) return cb(err, null);

    var user = new User({
      _id: id,
      email: email,
      realname: realname,
      isRoot: (id == 1) // The first registered user is root for default
    });
    var passwd = user.initPasswd();
    user.save(function(err, doc) {
      if(err) {
        if(err.code == 11000) {
          // Duplicated key
          return cb(false, null);
        } else return cb(err, null);
      }
      else return cb(false, passwd);
    });
  });
}

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

router.post('/register', helpers.hasFields(['realname', 'email']), function(req, res, next) {
  User.findOne({email: req.body.email}).exec(function(err, doc) {
    if(err) return next(err);
    else if(doc) return res.send({error: 'DuplicatedEmail'});
    else {
      function cb(err, passwd) {
        if(err) return next(err);
        if(passwd) {
          mailer('new_user', req.body.email, {
            realname: req.body.realname,
            passwd: passwd
          }, function(err, info) {
            if(err) return next(err);
            else return res.send({
              msg: "RegisterationEmailSent"
            });
          });
        } else {
          // Try again
          newUser(req.body.email, req.body.realname, cb);
        }
      }
      newUser(req.body.email, req.body.realname, cb);
    }
  });
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
