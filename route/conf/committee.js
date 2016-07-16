// Router for /conf/:conf/committee

var express = require('express');
var router = express.Router({ mergeParams: true });

var mongoose = require('mongoose');
var Conf = mongoose.model('Conf');
var User = mongoose.model('User');
var Committee = mongoose.model('Committee');
var Participant = mongoose.model('Participant');

var helpers = require('../helpers');
var mailer = require('../../mailer');


function binaryRepl(res) {
  return (err) => {
    if(err) return next(err);
    else return res.send({ msg: 'OperationSuccessful' })
  }
}

function checkCommPerm(conf, comm, uid) {
  return new Promise((resolve, reject) => {
    Committee.findOne({
      conf: conf,
      name: comm,
    }, {
      daises: true,
      admins: true,
    }).lean().exec((err, doc) => {
      if(err) return next(err);
      else if(!doc) return reject('NotFound');
      else if(doc.admins.indexOf(uid) === -1
              && doc.admins.indexOf(uid) === -1) return reject('PermissionDenied');
      else resolve();
    });
  });
}

/**
 * Creation & update
 */

router.post('/',
  helpers.hasPerms(['committee.manipulate']),
  helpers.hasFields(['id', 'title']),
  (req, res, next) => {
    Committee.count({
      conf: req.params.conf,
      name: req.body.id,
    }).exec((err, count) => {
      if(err) return next(err);
      else if(count != 0) return res.send({ error: "DuplicatedId" });
      else {
        const comm = new Committee({
          conf: req.params.conf,
          name: req.body.id,
          title: req.body.title,
          admins: [req.user],
          daises: [],
        })
        
        comm.save(binaryRepl(res));
      }
    });
  });

router.post('/:comm/title',
  helpers.hasPerms(['committee.manipulate']),
  helpers.hasFields(['title']),
  (req, res, next) => {
    Committee.update({
      conf: req.params.conf,
      name: req.params.comm,
    }, {
      $set: { title: req.body.title },
    }).exec((err, res) => {
      if(err) return next(err);
      else if(res.n === 0) return res.sendStatus(404);
      else return res.send({ msg: "OperationSuccessful" });
    });
  });

router.post('/:comm/:role(admins|diases)',
  helpers.hasPerms(['committee.manipulate']),
  helpers.hasFields(['uids']),
  (req, res, next) => {
    Committee.update({
      conf: req.params.conf,
      name: req.params.comm,
    }, {
      $set: { [req.params.role]: req.body.uids },
    }).exec(binaryRepl(res));
  });

router.post('/:comm/desc',
  helpers.hasFields(['desc']),
  (req, res, next) => {
    Committee.update({
      conf: req.params.conf,
      name: req.params.comm,

      // TODO: optimize
      $or: [
        { daises: req.user },
        { admins: req.user },
      ],
    }, {
      desc: req.body.desc,
    }).exec(binaryRepl(res));
  });

/**
 * Listing & fetching
 */

router.get('/all',
  helpers.hasPerms(['committee.list']),
  (req, res, next) => {
    Committee.find({
      conf: req.params.conf,
    }, {
      title: true,
      name: true,
      conf: true,
    }).lean().exec((err, docs) => {
      if(err) return next(err);
      else return res.send(docs);
    });
  });

router.get('/:comm', (req, res, next) => {
  Committee.findOne({
    conf: req.params.conf,
    name: req.params.comm,
  }).lean().exec((err, comm) => {
    if(err) return err;
    else if(!comm) return res.sendStatus(404);
    else {
      User.find({
        _id: { $in: comm.daises },
      }, {
        email: true,
        realname: true,
      }).lean().exec((err, users) => {
        if(err) return next(err);
        else {
          comm.daisProfiles = users;
          return res.send(comm);
        }
      });
    }
  });
});

/**
 * Participants
 */

router.get('/:comm/participants', (req, res, next) => {
  checkCommPerm(req.params.conf, req.params.comm, req.user).then(() => {
    Participant.find({
      /*
      conf: req.params.conf,
      committee: req.params.comm,
     */
      conf: '1',
      committee: 'meow',
    }).lean().exec((err, parts) => {
      if(err) return next(err);
      else User.find({ _id: { $in: parts.map(part => part.user) }}, {
        _id: true,
        realname: true,
        schoolName: true,
        email: true,
      }).lean().exec((err, users) => {
        if(err) return next(err);
        else {
          const map = new Map();
          for(let u of users)
            map.set(u._id, u);
          for(let p of parts)
            p.profile = map.get(p.user);

          return res.send(parts);
        }
      });
    });
  }).catch(e => {
    if(e === 'NotFound') return res.sendStatus(404);
    else if(e === 'PermissionDenied') return res.sendStatus(403);
    else return res.sendStatus(500);
  });
});

router.post('/:comm/participants',
  helpers.hasPerms(['committee.manipulate']),
  helpers.hasFields(['participants']),
  (req, res, next) => {
    const bulk = Participant.collection.initializeUnorderedBulkOp();

    req.body.participants.forEach(e => {
      bulk.find({
        conf: parseInt(req.params.conf),
        committee: req.params.comm,

        user: e.user,
      }).upsert().updateOne({
        $set: {
          group: e.group,
        }
      });
    });

    bulk.execute(binaryRepl(res));
  });

router.post('/:comm/seats',
  helpers.hasFields(['seats']),
  (req, res, next) => {
    Committee.update({
      conf: req.params.conf,
      name: req.params.comm,
    }, {
      $set: { seats: req.body.seats }
    }).exec(binaryRepl(res));
  });

module.exports = router;
