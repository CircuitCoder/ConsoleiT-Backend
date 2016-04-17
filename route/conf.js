// Router for /conf

var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var Conf = mongoose.model('Conf');
var Counter = mongoose.model('Counter');
var Group = mongoose.model('Group');
var Registrant = mongoose.model('Registrant');
var User = mongoose.model('User');

var helpers = require('./helpers');

var form = require('./conf/form');

function newConf(title, group, uid, cb) {
  Counter.getNext("conf", function(err, id) {
    if(err) return cb(err, null);

    var conf = new Conf({
      _id: id,
      title,
      group,

      forms: [],
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
  Registrant.distinct('conf', { user: req.user._id }).exec((err, activeReg) => {
    Conf.find({$or: [
      { _id: { $in: activeReg } },
      { pinned: true },
      { "members._id": req.user._id },
    ]}).select("title stages currentStage pinned").lean().exec((err, docs) => {
      if(err) return next(err);
      else return res.send({ confs: docs });
    });
  });
});

router.get('/available', helpers.loggedin, (req, res, next) => {
  Conf.find({ available: true }).select("title stages currentStage").lean().exec((err, docs) => {
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
  Conf.findById(req.params.conf, {
    title: true,
    desc: true,
    group: true,
    members: true,
    roles: true,
    stages: true,
    currentStage: true,
    forms: true, // TODO: use projection if possible
  }).lean().exec((err, conf) => {
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
        }), new Promise((resolve, reject) => {
          Registrant.distinct("form", { conf: req.params.conf, user: req.user._id }).exec((err, forms) => {
            if(err) reject(err);
            else resolve(forms);
          });
        })
      ]).then((results) => {
        //TODO: optimize
        var forms = [];
        conf.forms.forEach(e => {
          var role = null;
          if(e.admins.indexOf(req.user._id) != -1) role = 'admin';
          else if(e.moderators.indexOf(req.user._id) != -1) role = 'moderator';
          else if(e.viewers.indexOf(req.user._id) != -1) role = 'viewer';
          else if(results[2].indexOf(e) != -1) role = 'applicant';

          if(role) forms.push({ name: e._id, title: e.title, role });
        });

        conf.forms = undefined;

        return res.send({
          conf: conf,
          members: results[0],
          group: results[1],
          forms: forms
        });
      }, (reason) => {
        return next(reason);
      }).catch((e) => {
        return next(e);
      });
    }
  });
});

router.post('/:conf(\\d+)',
  helpers.hasPerms(["settings"]),
  helpers.hasFields(["settings"]),
  (req, res, next) => {
    var updateMap = {};
    ["title", "desc", "currentStage", "stages"].forEach((e) => {
      if(e in req.body.settings) updateMap[e] = req.body.settings[e];
    });
    Conf.findByIdAndUpdate(req.params.conf, {$set: updateMap}).exec((err, doc) => {
      if(err) next(err);
      else res.send({
        msg: "OperationSuccessful",
      });
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
 * Using sub-router
 */

router.use('/:conf(\\d+)/form', helpers.loggedin, form);

module.exports = router;
