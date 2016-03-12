// Router for /group

var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var Counter = mongoose.model('Counter');
var Group = mongoose.model('Group');
var User = mongoose.model('User');

var helpers = require('./helpers');

function newGroup(title, owner, cb) {
  Counter.getNext("group", function(err, id) {
    if(err) return cb(err, null);

    var grp = new Group({
      _id: id,
      title: title,
      owner: owner,
      admins: [],
      members: [owner],
    });
    grp.save(function(err, doc) {
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
 * Create a new group
 */
router.post('/', helpers.root, helpers.hasFields(['title', 'owner']), (req, res, next) => {
  User.findById(req.body.owner).exec((err, user) => {
    if(err) return next(err);
    else if(!user) return res.sendStatus(400);

    function cb(err, id) {
      if(err) next(err);
      else if(id) {
        res.send({
          msg: "OperationSuccessful",
          id: id
        });
      } else newGroup(req.body.title, req.body.owner, cb)
    }; 
    newGroup(req.body.title, req.body.owner, cb);
  });
});

/**
 * Delete a existing group
 */
router.delete('/:id(\\d+)', helpers.root, (req, res, next) => {
  //TODO: Fill logic here
});

/**
 * Get group info
 */
router.get('/:group(\\d+)', helpers.loggedin, (req, res, next) => {
  Group.findById(req.params.group).exec((err, docGrp) => {
    if(err) return next(err);
    else if(!docGrp) return res.send({ error: "NoSuchGroup" });
    else return res.send({ group: docGrp.toObject() });
  });
});

/**
 * Add member
 */
router.post('/:group(\\d+)/members', helpers.groupOwner, helpers.hasFields(['member']), (req, res, next) => {
  User.findById(req.body.owner).exec((err, doc) => {
    if(doc) {
      //TODO: check for integer
      req.group.members.addToSet(req.body.member);
      req.group.save();
      return res.send({ msg: "OperationSuccessful" });
    } else {
      return res.send({ error: "NoSuchUser" });
    }
  });
});

/**
 * Remove member
 */
router.delete('/:group(\\d+)/members/:member(\\d+)', helpers.groupOwner, (req, res, next) => {
  if(req.group.members.indexOf(req.params.member) == -1) return res.sendStatus(400);
  else {
    req.group.members.pull(req.params.member);
    req.group.save();
    return res.send({ msg: "OperationSuccessful" });
  }
});

/**
 * Transfer owner
 */
router.post('/:group(\\d+)/settings/owner', helpers.groupOwner, helpers.hasFields(['owner']), (req, res, next) => {
  User.findById(req.body.owner).exec((err, doc) => {
    if(doc) {
      req.group.owner = req.body.owner;
      req.group.save();
      return res.send({ msg: "OperationSuccessful" });
    } else {
      return res.send({ error: "NoSuchUser" });
    }
  });
});

module.exports = router;
