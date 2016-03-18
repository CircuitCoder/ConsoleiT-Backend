// Router for /conf

var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var Conf = mongoose.model('Conf');
var Counter = mongoose.model('Counter');
var Group = mongoose.model('Group');
var User = mongoose.model('User');

var helpers = require('./helpers');

function newConf(title, group, uid, cb) {
  Counter.getNext("conf", function(err, id) {
    if(err) return cb(err, null);

    var conf = new Conf({
      _id: id,
      title,
      group,
      members: [{
        _id: uid,
        role: 1
      }]
    });
    conf.save(function(err, doc) {
      if(err) {
        if(err.code == 11000) {
          // Duplicated key
          return cb(false, null);
        } else return cb(err, null);
      }
      else return cb(false, id);
    });
  });
}

/**
 * Listing
 */

router.get('/', helpers.loggedin, (req, res, next) => {
  Conf.find({$or: [
    { "members._id": req.user._id },
    { "academicMembers._id": req.user._id },
    { "participants._id": req.user._id }
  ]}).select("title").lean().exec((err, docs) => {
    if(err) return next(err);
    else return res.send({ confs: docs });
  });
});

router.get('/available', helpers.loggedin, (req, res, next) => {
  Conf.find({ status: { $gt: 0 } }).select("title").lean().exec((err, docs) => {
    if(err) return next(err);
    else res.send({ confs: docs });
  });
});

/**
 * Creation
 */

router.post('/', helpers.hasFields(['title', 'group']), helpers.groupOwner, (req, res, next) => {
  function cb(err, id) {
    if(err) next(err);
    else if(id) {
      res.send({
        msg: "OperationSuccessful",
        id: id
      });
    } else newConf(req.body.title, req.body.group, req.user._id, cb)
  }; 
  newConf(req.body.title, req.body.group, req.user._id, cb);
});

/**
 * Data
 */

router.get('/:conf(\\d+)', helpers.loggedin, (req, res, next) => {
  Conf.findById(req.params.conf).select("title group members roles status").lean().exec((err, conf) => {
    if(err) return next(err);
    else {
      Promise.all([
        new Promise((resolve, reject) => {
          if(!conf.members) resolve([]);
          else User.find({ _id: { $in: conf.members.map((e) => e._id) }}).select("realname email").lean().exec((err, users) => {
            if(err) reject(err);
            else resolve(users);
          });
        }), new Promise((resolve, reject) => {
          Group.findById(conf.group).select("title").lean().exec((err, group) => {
            if(err) reject(err);
            else resolve(group);
          });
        })
      ]).then((results) => {
        res.send({
          conf: conf,
          members: results[0],
          group: results[1]
        });
      }, (reason) => {
        next(reason);
      });
    }
  });
});

/**
 * Member and roles
 */

router.post('/:conf(\\d+)/members/:member(\\d+)',
  helpers.hasPerms(['members.modify']),
  helpers.hasFields(['role']),
  (req, res, next) => {
    User.findById(req.params.member).exec((err, doc) => {
      if(err) next(err);
      else if(doc) {
        Conf.findOneAndUpdate({
          _id: req.params.conf,
          'members._id': req.params.member,
        }, {
          'members.$.role': req.body.role,
        }).exec((err, doc) => {
          if(err) return next(err);
          else if(doc) return res.send({ msg: 'OperationSuccessful' });
          else {
            Conf.findByIdAndUpdate(req.params.conf, { $push: { members: { _id: req.params.member, role: req.body.role }}})
              .exec((err, doc) => {
                if(err) return next(err);
                else return res.send({ msg: 'OperationSuccessful' });
              });
          }
        });
      } else {
        res.sendStatus(400);
      }
    });
  });

router.delete('/:conf(\\d+)/members/:member(\\d+)',
  helpers.hasPerms(['members.modify']),
  (req, res, next) => {
    Conf.findByIdAndUpdate(req.params.conf, { $pull: { members: { $elemMatch: { _id: req.params.member }}}})
      .exec((err, doc) => {
        if(err) return next(err);
        else return res.send({ msg: 'OperationSuccessful' });
      });
  });

/**
 * Forms and applications
 */

router.post('/:conf(\\d+)/academic/form',
  helpers.hasPerms(['form.academic.modify']),
  helpers.hasFields(['form']),
  (req, res, next) => {
    //TODO: lint the input
    
    Conf.findByIdAndUpdate(req.params.conf, { $set: { academicForm: JSON.stringify(req.body.form) } }).exec((err, doc) => {
      if(err) return next(err);
      else return res.send({
        msg: "OperationSuccessful"
      });
    });
});

router.post('/:conf(\\d+)/participants/form',
  helpers.hasPerms(['form.participant.edit']),
  helpers.hasFields(['form']),
  (req, res, next) => {
    Conf.findByIdAndUpdate(req.params.conf, { $set: { participantForm : JSON.stringify(req.body.form) } }).exec((err, doc) => {
      if(err) return next(err);
      else return res.send({
        msg: "OperationSuccessful"
      });
    });
  });

router.get('/:conf(\\d+)/academic/form',
  helpers.loggedin,
  (req, res, next) => {
    Conf.findById(req.params.conf).select('academicForm').lean().exec((err, doc) => {
      if(err) return next(err);
      else return res.send(doc.academicForm);
    });
  });

router.post('/:conf(\\d+)/academic/:member(\\d+)',
  helpers.loggedin,
  helpers.confExists,
  helpers.hasPerms(['form.academic.view.modify'], (req) => req.user && req.params.member == req.user._id ),
  helpers.hasFields(['content']),
  (req, res, next) => {
    Conf.findOneAndUpdate({
      _id: req.params.conf,
      'academicMembers._id': req.params.member,
    }, {
      'academicMembers.$.submission': JSON.stringify(req.body.content)
    }).exec((err, doc) => {
      if(err) return next(err);
      else if(doc) return res.send({ msg: "OperationSuccessful" });
      else {
        Conf.findByIdAndUpdate(req.params.conf, { $push: { academicMembers: { _id: req.params.member, submission: JSON.stringify(req.body.content) }}})
          .exec((err, doc) => {
            if(err) return next(err);
            else return res.send({ msg: "OperationSuccessful" });
          });
      }
    });
  });

router.get('/:conf(\\d+)/academic/:member(\\d+)',
  helpers.hasPerms(['form.academic.view'], (req) => req.user && req.params.member == req.user._id ),
  (req, res, next) => {
    Conf.findById(req.params.conf, { 'academicMembers._id': req.params.member, academicMembers: true }).exec((err, doc) => {
      if(err) return next(err);

      // If the current user is the requested user, then it's possible that the conf doesn't exist
      else if(doc && doc.academicMembers) return res.send(doc.academicMembers[0]);
      else return res.send({ error: "NoSuchMember" });
    });
  });

router.get('/:conf(\\d+)/academic',
  helpers.loggedin,
  helpers.confExists,
  (req, res, next) => {
    Conf.findById(req.params.conf).select('academicMembers._id').exec((err, doc) => {
      if(err) return next(err);
      //TODO: check for conf status
      else return res.send(doc.toObject());
    });
  });

module.exports = router;
