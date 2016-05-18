// Router for /account

var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Counter = mongoose.model('Counter');

var passport = require('passport');
var mailer = require('../mailer');
var config = require('../config');

var helpers = require('./helpers');

function newUser(email, realname, cb) {
  Counter.getNext("user", (err, id) => {
    if(err) return cb(err, null);

    var user = new User({
      _id: id,
      email: email,
      realname: realname,
      isRoot: (id == 1) // The first registered user is root for default
    });
    var passwd = user.initPasswd();
    user.save((err, doc) => {
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

router.post('/login', helpers.hasFields(['email', 'passwd']), helpers.toLower(null, ['email']) ,(req, res, next) => {
  if(req.user) return res.send({ error: "InvalidCondition" });
  else {
    passport.authenticate('local', (err, user) => {
      if(err) return next(err);
      else if(!user) return res.send({error: 'CredentialRejected'});
      else if(!user.initialized) {
        // Request initialization
        return res.send({
          error: "InitializationRequired",
          schoolList: config.app.schools,
        });
      } else {
        req.login(user._id, (err) => {
          if(err) {
            return next(err);
          } else {
            return res.send({ user: user.toObject() });
          }
        });
      }
    })(req, res, next);
  }
});

router.post('/initialize',
  helpers.hasFields(['email', 'passwd', 'schoolName', 'schoolType', 'graduationYear']),
  helpers.toLower(null, ['email']),
  (req, res, next) => {
    if(req.user) return res.send({ error: "InvalidCondition" });

    // Using standard passport authentication here
    // Because this interface will only be called once
    passport.authenticate('local', (err, user) => {
      if(err) return next(err);
      else if(!user) return res.send({ error: 'CredentialRejected' });
      else if(user.initialized) res.send({ error: "InvalidCondition" });
      else {
        // Initialize
        user.initialized = true;
        user.schoolName = req.body.schoolName;
        user.schoolType = req.body.schoolType;
        user.graduationYear = req.body.graduationYear;
        user.save((err) => {
          if(err) return next(err);
          else req.login(user._id, (err) => {
            if(err) {
              return next(err);
            } else {
              return res.send({ user: user.toObject() });
            }
          });
        });
      }
    })(req, res, next);
  });

router.post('/register', helpers.hasFields(['realname', 'email']), helpers.toLower(null, ['email']), (req, res, next) => {
  User.findOne({email: req.body.email}).exec((err, doc) => {
    if(err) return next(err);
    else if(doc) return res.send({error: 'DuplicatedEmail'});
    else {
      function cb(err, passwd) {
        if(err) return next(err);
        if(passwd) {
          mailer('new_user', req.body.email, {
            realname: req.body.realname,
            passwd: passwd
          }, (err, info) => {
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

router.get('/logout', (req, res, next) => {
  if(!req.user) return res.send({ error: "InvalidCondition" });
  else {
    req.logout();
    res.send({
      msg: "OperationSuccessful"
    });
  }
});

router.get('/restore', (req, res, next) => {
  if(req.user) {
    User.findById(req.user).exec((err, doc) => {
      if(err) return next(err);
      else res.send({ user: doc.toObject() });
    });
  } else {
    res.send({ error: "NotLoggedIn" });
  }
});

router.post('/settings/passwd', helpers.loggedin, helpers.hasFields(['passwd', 'oripasswd']), (req, res, next) => {
  User.findById(req.user._id).exec((err, doc) => {
    if(err) return next(err);
    else if(!doc) return res.sendStatus(500);
    else {
      //TODO: check passwd format
      if(doc.validatePasswd(req.body.oripasswd)) {
        doc.setPasswd(req.body.passwd);
        doc.save((err) => {
          if(err) return next(err);
          else return res.send({ msg: "OperationSuccessful" });
        });
      } else {
        return res.send({ error: "PasswdMismatch" });
      }
    }
  });
});

router.post('/settings/passwd/reset/request', helpers.hasFields(['email']), (req, res, next) => {
  User.findOne({
    email: req.body.email
  }).exec((err, doc) => {
    if(err) return next(err);
    else if(!doc) return res.send({ error: "NoSuchUser" });
    else {
      var token = doc.generateToken();
      doc.save();

      mailer('reset_passwd_request', req.body.email, {
        realname: doc.realname,
        url: config.url.backend + '/account/settings/passwd/reset/' + doc._id + '/' + token,
      }, (err, info) => {
        if(err) return next(err);
        else return res.send({
          msg: "ResetPasswdRequestEmailSent"
        });
      });
    }
  });
});

router.get('/settings/passwd/reset/:id(\\d+)/:token', (req, res, next) => {
  User.findById(req.params.id).exec((err, doc) => {
    if(err) return next(err);
    else if(!doc) return res.send({ error: "NoSuchUser" });
    else {
      if(doc.validateToken(req.params.token)) {
        var passwd = doc.initPasswd();
        doc.save();
        mailer('reset_passwd', doc.email, {
          realname: doc.realname,
          passwd: passwd
        }, (err, info) => {
          if(err) return next(err);
          else return res.redirect(config.url.frontend + '/login?msg=ResetSent');
        });
      } else res.sendStatus(403);
    }
  });
});

module.exports = router;
