// Router for /conf

var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var Conf = mongoose.model('Conf');
var Counter = mongoose.model('Counter');
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

router.post('/:conf(\\d+)/form/:form(academic|participant)', helpers.hasPerms(['form.academic.modify']), (req, res, next) => {
  res.sendStatus(200);
});

module.exports = router;
