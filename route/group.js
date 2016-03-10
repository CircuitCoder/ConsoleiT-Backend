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
router.post('/', helpers.root, (req, res, next) => {
  if(!req.body || !req.body.title || !req.body.owner) res.sendStatus(400);
  else {
    User.findById(req.body.owner).exec((err, user) => {
      if(err) return next(err);
      else if(!user) return res.sendStatus(400);

      function cb(err, id) {
        if(err) next(err);
        else if(id) {

          user.groups.push(id);
          user.save((err) => {
            if(err) return next(err);
            else {
              res.send({
                msg: "OperationSuccessful",
                id: id
              });
            }
          });

        } else newGroup(req.body.title, req.body.owner, cb)
      }; 
      newGroup(req.body.title, req.body.owner, cb);
    });
  }
});

/**
 * Delete a existing group
 */
router.delete('/:id(\\d+)', helpers.root, (req, res, next) => {
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
router.post('/:group(\\d+)/members', helpers.groupOwner, (req, res, next) => {
});

/**
 * Remove member
 */
router.delete('/:group(\\d+)/members/:member(\\d+)', helpers.groupOwner, (req, res, next) => {
});

/**
 * Transfer owner
 */
router.post('/:group(\\d+)/settings/owner', helpers.groupOwner, (req, res, next) => {
  if(!req.body || !req.body.owner) return res.sendStatus(400);
  else {
    //TODO: logic
    console.log(req.group);
    res.sendStatus(200);
  }
});

module.exports = router;
