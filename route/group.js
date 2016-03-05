// Router for /group

var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var Counter = mongoose.model('Counter');
var Group = mongoose.model('Group');

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
router.get('/:id(\\d+)', helpers.loggedin, (req, res, next) => {
});

module.exports = router;
