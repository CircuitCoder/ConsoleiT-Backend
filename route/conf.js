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
    { "pinned": true },
    { "members._id": req.user._id },
    { "registrants.academicZh._id": req.user._id },
    { "registrants.academicEn._id": req.user._id },
    { "registrants.participant._id": req.user._id },
  ]}).select("title status pinned").lean().exec((err, docs) => {
    if(err) return next(err);
    else return res.send({ confs: docs });
  });
});

router.get('/available', helpers.loggedin, (req, res, next) => {
  Conf.find({ status: { $gt: 0 } }).select("title status").lean().exec((err, docs) => {
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
  Conf.findById(req.params.conf).select("title desc group members roles status").lean().exec((err, conf) => {
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

router.post('/:conf(\\d+)',
  helpers.hasPerms(["settings"]),
  helpers.hasFields(["settings"]),
  (req, res, next) => {
    var updateMap = {};
    ["title", "desc", "status"].forEach((e) => {
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
 */

router.post('/:conf(\\d+)/:type/form',
  helpers.toCamel(['type']),
  helpers.hasPerms([(req) => 'form.' + req.params.type +'.modify']),
  helpers.hasFields(['form']),
  (req, res, next) => {
    //TODO: lint the input
    
    var updateMap = {};
    updateMap['forms.' + req.params.type] = JSON.stringify(req.body.form);
    Conf.findByIdAndUpdate(req.params.conf, { $set: updateMap }).exec((err, doc) => {
      if(err) return next(err);
      else return res.send({
        msg: "OperationSuccessful"
      });
    });
});

router.get('/:conf(\\d+)/:type/form',
  helpers.toCamel(['type']),
  helpers.loggedin,
  (req, res, next) => {
    Conf.findById(req.params.conf).select('forms').lean().exec((err, doc) => {
      if(err) return next(err);
      else if(req.params.type in doc.forms) return res.send(doc.forms[req.params.type]);
    });
  });

router.post('/:conf(\\d+)/:type/:member(\\d+)',
  helpers.toCamel(['type']),
  helpers.loggedin,
  helpers.confExists,
  helpers.hasPerms([(req) => `registrant.${req.params.type}.modify`], (req) => {
    if(req.user && req.params.member == req.user._id) {
      req.isSelf = true;
      return true;
    } else return false;
  }),
  helpers.hasFields(['content']),
  (req, res, next) => {
    var restr = {};
    var update = {};
    restr._id = req.params.conf;
    if(req.isSelf) restr[`registrants.${req.params.type}`] = { $elemMatch: { _id: req.params.member, locked: { $in: [null, false] } } };
    else restr[`registrants.${req.params.type}._id`] = req.params.member;
    update[`registrants.${req.params.type}.$.submission`] = JSON.stringify(req.body.content);
    Conf.findOneAndUpdate(restr, update).exec((err, doc) => {
      if(err) return next(err);
      else if(doc) return res.send({ msg: "OperationSuccessful" });
      else {
        var pushSpec = {};
        pushSpec["registrants." + req.params.type] = {
          _id: req.params.member,
          submission: JSON.stringify(req.body.content),
          status: 1
        }

        var pushRestr = {
          _id: req.params.conf,
        }
        pushRestr[`registrants.${req.params.type}._id`] = { $ne: req.params.member };

        Conf.findOneAndUpdate(pushRestr, { $push: pushSpec})
          .exec((err, doc) => {
            if(err) return next(err);
            else if(doc) return res.send({ msg: "OperationSuccessful" });
            else return res.send({ error: "DocumentLocked" }); // Already has the document, and it's locked
          });
      }
    });
  });

router.get('/:conf(\\d+)/:type/:member(\\d+)',
  helpers.toCamel(['type']),
  helpers.hasPerms([(req) => `registrant.${req.params.type}.view`], (req) => req.user && req.params.member == req.user._id ),
  (req, res, next) => {
    var restr = {};
    var proj = {};
    restr._id = req.params.conf;
    restr[`registrants.${req.params.type}._id`] = req.params.member;
    proj[`registrants.${req.params.type}.$`] = 1;
    Conf.findOne(restr, proj).lean().exec((err, doc) => {
      if(err) return next(err);
      // If the current user is the requested user, then it's possible that the conf doesn't exist
      else if(doc && doc.registrants[req.params.type] && doc.registrants[req.params.type].length > 0) return res.send(doc.registrants[req.params.type][0]);
      else return res.send({});
    });
  });

router.put('/:conf(\\d+)/:type/:member(\\d+)/lock',
  helpers.toCamel(['type']),
  helpers.hasPerms([(req) => `registrant.${req.params.type}.admin`]),
  (req, res, next) => {
    var restr = {};
    var update = {};
    restr._id = req.params.conf;
    restr[`registrants.${req.params.type}._id`] = req.params.member;
    update[`registrants.${req.params.type}.$.locked`] = true;
    Conf.findOneAndUpdate(restr, update).exec((err, doc) => {
      if(err) return next(err);
      else return res.send({ msg: "OperationSuccessful" });
    });
  })

router.delete('/:conf(\\d+)/:type/:member(\\d+)/lock',
  helpers.toCamel(['type']),
  helpers.hasPerms([(req) => `registrant.${req.params.type}.admin`]),
  (req, res, next) => {
    var restr = {};
    var update = {};
    restr._id = req.params.conf;
    restr[`registrants.${req.params.type}._id`] = req.params.member;
    update[`registrants.${req.params.type}.$.locked`] = false;
    Conf.findOneAndUpdate(restr, update).exec((err, doc) => {
      if(err) return next(err);
      else return res.send({ msg: "OperationSuccessful" });
    });
  })

router.delete('/:conf(\\d+)/:type/:member(\\d+)',
  helpers.toCamel(['type']),
  helpers.root,
  (req, res, next) => {
    var update = {
      $pull: { }
    }

    update['$pull'][`registrants.${req.params.type}`] = { id: req.params.member };

    Conf.findByIdAndUpdate(req.params.conf, update).exec((err, doc) => {
      if(err) return next(err);
      else return res.send({ msg: "OperationSuccessful" });
    });
  })


router.get('/:conf(\\d+)/:type',
  helpers.toCamel(['type']),
  helpers.loggedin,
  helpers.confExists,
  (req, res, next) => {
    Conf.findById(req.params.conf).select(`registrants.${req.params.type}._id registrants.${req.params.type}.status`).lean().exec((err, doc) => {
      if(err) return next(err);
      //TODO: check for conf status
      else return res.send(doc.registrants[req.params.type].filter( e => e.status == 2 ));
    });
  });

router.get('/:conf(\\d+)/:type/all',
  helpers.toCamel(['type']),
  helpers.hasPerms([(req) => `form.${req.params.type}.view`]),
  (req, res, next) => {
    Conf.findById(req.params.conf).select(`registrants.${req.params.type}._id registrants.${req.params.type}.status registrants.${req.params.type}.locked`).lean().exec((err, doc) => {
      if(err) return next(err);
      else {
        User.find({ _id: { $in: doc.registrants[req.params.type] }}).select("email realname").lean().exec((err, users) => {
          if(err) return next(err);
          else return res.send({
            list: doc.registrants[req.params.type],
            members: users
          });
        });
      }
    });
  })

module.exports = router;
