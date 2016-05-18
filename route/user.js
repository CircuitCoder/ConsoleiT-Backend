// Routes for /user

var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Group = mongoose.model('Group');

var helpers = require('./helpers');
var config = require('../config');

router.route('/:id(\\d+)')
.get(
  helpers.loggedin,
  (req, res, next) => {
    Promise.all([
      new Promise((resolve, reject) => {
        User.findById(req.params.id, {
          realname: true,
          gender: true,
          desc: true,
          schoolType: true,
          schoolName: true,
          graduationYear: true,
          experiences: true,
        }).lean().exec((err, doc) => {
          if(err) return reject(err);
          else return resolve(doc);
        });
      }),
      new Promise((resolve, reject) => {
        Group.find({
          $or: [
            { owner: req.params.id },
            { admins: req.params.id },
            { members: req.params.id },
          ]
        }, {
          _id: true,
          title: true,
        }).lean().exec((err, doc) => {
          if(err) return reject(err);
          else return resolve(doc);
        });
      })
      //TODO: Recorded experiences
    ]).then((results) => {
      if(!results[0]) return res.sendStatus(404);
      else return res.send({
        user: results[0],
        groups: results[1],
      });
    }, (reason) => {
      return next(reason);
    }).catch(e => next(e));
  })
.post(
  helpers.loggedin,
  (req, res, next) => (req.params.id == req.user ? next() : res.sendStatus(403)),
  helpers.hasFields(['user']),
  (req, res, next) => {
    var filtered = {};
    ['realname', 'desc', 'gender', 'phone', 'schoolType', 'schoolName', 'graduationYear', 'experiences'].forEach(function(e) {
      if(e in req.body.user && req.body.user[e] != null && req.body.user[e] != undefined) {
        filtered[e] = req.body.user[e];
      }
    });
    User.findByIdAndUpdate(req.params.id, {
      $set: filtered,
    }).exec((err, doc) => {
      if(err) return next(err);
      else return res.send({ msg: "OperationSuccessful" });
    });
  });

router.get('/:id/self',
  helpers.loggedin,
  (req, res, next) => (req.params.id == req.user ? next() : res.sendStatus(403)),
  (req, res, next) => {
    User.findById(req.params.id).lean().exec((err, doc) => {
      // Include possible school names in the response
      if(err) return next(err);
      else {
        doc.meta = {
          schoolList: config.app.schools
        };
        return res.send(doc);
      }
    });
  });

module.exports = router;
