// Router for /conf/:conf/form

var express = require('express');
var router = express.Router({ mergeParams: true });

var mongoose = require('mongoose');
var Conf = mongoose.model('Conf');
var Form = mongoose.model('Form');
var User = mongoose.model('User');
var Registrant = mongoose.model('Registrant');

var helpers = require('../helpers');

function checkFormPerm(conf, form, uid, level) {
  return new Promise((resolve, reject) => {
    Form.findOne({
      conf: conf,
      name: form,
    }).exec((err, form) => {
      if(err) reject(err);
      else if(!form) resolve(false);
      else {
        switch(level) {
          case "viewer":
            if(form.viewers.indexOf(uid) != -1) return resolve(true);
            /* falls through */

          case "moderator":
            if(form.moderators.indexOf(uid) != -1) return resolve(true);
            /* falls through */

          case "admin":
            if(form.admins.indexOf(uid) != -1) return resolve(true);

            return resolve(false);
            break;

          default:
            return reject(new Error("No such permission level"));
        }
      }
    });
  });
}

/**
 * List all
 */

router.get('/all',
  helpers.hasPerms(['form.list']),
  (req, res, next) => {
    Form.find({
      conf: req.params.conf
    }, {
      name: 1,
      title: 1,
      status: 1,
      admins: 1,
      moderators: 1,
      viewers: 1,
      _id: 0,
    }).lean().exec((err, doc) => err ? next(err) : res.send(doc));
  });

/**
 * Creation
 */

router.post('/',
  helpers.hasPerms(['form.creation']),
  helpers.hasFields(['id', 'title']),
  (req, res, next) => {
    Form.findOne({
      conf: req.params.conf,
      name: req.body.id,
    }).exec((err, doc) => {
      if(err) return next(err);
      else if(doc) return res.send({ error: "DuplicatedId" });
      else {
        var targetForm = new Form({
          conf: req.params.conf,
          name: req.body.id,
          title: req.body.title,
          admins: [ req.user ],
        });
        
        targetForm.save((err) => {
          if(err) return next(err);
          else return res.send({ id: targetForm.name });
        });
      }
    });
  });

/**
 * Content
 */
router.route('/:form')
.get((req, res, next) => {
  Form.findOne({
    conf: req.params.conf,
    name: req.params.form
  }).lean().exec((err, doc) => {
    if(err) return next(err);
    else if(!doc)
      return res.sendStatus(404);
    else {
      var role = 'applicant';
      if(doc.viewers.indexOf(req.user) != -1) role = 'viewer';
      if(doc.moderators.indexOf(req.user) != -1) role = 'moderator';
      if(doc.admins.indexOf(req.user) != -1) role = 'admin';

      return res.send({
        content: doc.content,
        status: doc.status,
        title: doc.title,
        indicators: doc.indicators,
        meta: doc.meta,
        role,
      });
    }
  });
});

router.route('/:form/content')
.post(
  helpers.hasFields(['content', 'title', 'indicators', 'meta']),
  (req, res, next) => {
    Form.findOneAndUpdate({
      conf: req.params.conf,
      name: req.params.form,
      status: { $ne: 'archived' },
      admins: req.user,
    }, {
      content: req.body.content,
      indicators: req.body.indicators,
      meta: req.body.meta,
      title: req.body.title,
    }).exec((err, doc) => {
      if(err) return next(err);
      else if(!doc) return res.sendStatus(404);
      else return res.send({ msg: 'OperationSuccessful' });
    });
  }
);

/**
 * Submissions
 */
router.get('/:form/submissions',
  (req, res, next) => {
    Form.findOne({
      conf: req.params.conf,
      name: req.params.form,
    }).exec((err, form) => {
      if(err) return next(err);
      else if(!form) return res.sendStatus(404);
      
      // Check for permission

      if(form.admins.indexOf(req.user) == -1
         && form.moderators.indexOf(req.user) == -1
         && form.viewers.indexOf(req.user) == -1) return res.sendStatus(403);

      let keywords = [];

      let proj = form.content.reduce((prev, e, i) => {
        if(e.keyword) {
          keywords.push({ id: i, field: e });
          prev[`submission.${i}`] = true;
        }

        return prev;
      }, {
        _id: false,
        user: true,
        internalStatus: true,
        status: true,
        locked: true,
      });

      Registrant.find({
        conf: req.params.conf,
        form: req.params.form
      }, proj).lean().exec((err, rdoc) => {
        if(err) return next(err);
        else {
          rdoc.forEach((e) => {
            if(!e.submission) e.submission = {};
          });

          var idList = rdoc.map(e => e.user);

          User.find({
            _id: { $in: idList },
          }, {
            realname: true,
            schoolName: true,
          }).exec((err, udoc) => {
            if(err) return next(err);
            else {
              var umap = {};
              udoc.forEach(e => {
                umap[e._id] = e;
              });
              rdoc.forEach(e => e.profile = umap[e.user]);
              return res.send({ registrants: rdoc, keywords: keywords });
            }
          });

        }
      });
    });
  });

router.route('/:form/submission/:user(\\d+)')
.get((req, res, next) => {
  new Promise((resolve, reject) => {
    if(req.params.user == req.user) return resolve(true);
    else return checkFormPerm(req.params.conf, req.params.form, req.user, 'viewer').then(resolve).catch(reject);
  }).then(result => {
    if(!result) res.sendStatus(403);
    else {
      let projection = {
        _id: false,
        user: true,
        internalStatus: true,
        submission: true,
        locked: true,
      };

      //TODO: show status to user after archive
      if(req.params.user != req.user) {
        projection.status = true;
      }

      Registrant.findOne({
        conf: req.params.conf,
        form: req.params.form,
        user: req.params.user
      }, projection).lean().exec((err, doc) => {
        if(err) return next(err);
        else if(!doc) return res.send({ submission: {}, locked: false, new: true}); // Indicates that it is not saved
        else return res.send(doc);
      });
    }
  }).catch(e => next(e));
})
.post(
  helpers.hasFields(['content']),
  (req, res, next) => {
    new Promise((resolve, reject) => {
      Form.findOne({
        conf: req.params.conf,
        name: req.params.form,
      }).exec((err, form) => {
        if(err) return reject(err);
        else if(!form)
          return res.sendStatus(404);
        else {
          if(form.admins.indexOf(req.user) != -1) return resolve({
            role: 'admin',
            formOpen: form.status == 'open'
          });
          else if(req.params.user == req.user) return resolve({
            role: 'user',
            formOpen: form.status == 'open'
          });
          else return resolve(false);
        }
      });
    }).then(result => {
      if(!result) res.sendStatus(403);
      else {
        Registrant.findOne({
          conf: req.params.conf,
          form: req.params.form,
          user: req.params.user
        }).exec((err, doc) => {
          if(err) return next(err);
          else if(!doc) {
            if(result.formOpen) {
              doc = new Registrant({
                conf: req.params.conf,
                form: req.params.form,
                user: req.params.user,
                //TODO: sanitize
                submission: req.body.content,
              })
            } else {
              //TODO: closed form
              return res.sendStatus(403);
            }
          } else {
            if(doc.locked && result.role == 'user')
              return res.sendStatus(403);
            else 
              doc.submission = req.body.content;
          }

          doc.save((err) => {
            if(err) return next(err);
            else return res.send({ msg: "OperationSuccessful" });
          });
        });
      }
    }).catch(e => next(e));
  });

router.route('/:form/submission/:user/lock')
.put((req, res, next) => {
  checkFormPerm(req.params.conf, req.params.form, req.user, 'moderator').then(result => {
    if(!result) return res.sendStatus(403);
    else {
      Registrant.findOneAndUpdate({
        conf: req.params.conf,
        form: req.params.form,
        user: req.params.user,
      }, {
        $set: { locked: true }
      }).exec((err, doc) => {
        if(err) return next(err);
        else if(!doc) res.sendStatus(404);
        else res.send({ msg: "OperationSuccessful" });
      });
    }
  });
})
.delete((req, res, next) => {
  checkFormPerm(req.params.conf, req.params.form, req.user, 'moderator').then(result => {
    if(!result) return res.sendStatus(403);
    else {
      Registrant.findOneAndUpdate({
        conf: req.params.conf,
        form: req.params.form,
        user: req.params.user,
      }, {
        $set: { locked: false }
      }).exec((err, doc) => {
        if(err) return next(err);
        else if(!doc) res.sendStatus(404);
        else res.send({ msg: "OperationSuccessful" });
      });
    }
  });
});

router.route('/:form/submission/:user/note')
.get((req, res, next) => {
  checkFormPerm(req.params.conf, req.params.form, req.user, 'moderator').then(result => {
    if(!result) return res.sendStatus(403);
    else {
      Registrant.findOne({
        conf: req.params.conf,
        form: req.params.form,
        user: req.params.user,
      }, {
        note: 1
      }).exec((err, doc) => {
        if(err) return next(err);
        else if(!doc) res.sendStatus(403);
        else return res.send({ note: doc.note });
      });
    }
  });
})
.post(
  (req, res, next) => {
    if(typeof req.body.note != 'string') return res.sendStatus(400);
    checkFormPerm(req.params.conf, req.params.form, req.user, 'moderator').then(result => {
      if(!result) return res.sendStatus(403);
      else {
        Registrant.findOneAndUpdate({
          conf: req.params.conf,
          form: req.params.form,
          user: req.params.user,
        }, {
          $set: { note: req.body.note }
        }).exec((err, doc) => {
          if(err) return next(err);
          else res.send({ msg: "OperationSuccessful" });
        });
      }
    });
  });

/* Group action */
router.route('/:form/perform/:action')
.post(
  helpers.hasFields(['applicants']),
  (req, res, next) => {

  if(req.params.action === 'payment') {
    checkFormPerm(req.params.conf, req.params.form, req.user, 'admin').then(result => {
      // TODO: prevent action on form without payment setup
      if(!result) return res.sendStatus(403);
      Registrant.update({
        conf: req.params.conf,
        form: req.params.form,
        user: { $in: req.body.applicants }, // TODO: sanitize
      }, {
        $set: {
          'internalStatus.payment': true,
        }
      }, {
        multi: true
      }).exec((err, doc) => {
        if(err) return next(err);
        else return res.send({
          msg: 'OperationSuccessful'
        });
      });
    });
  } else {
    return res.sendStatus(404);
  }
})


/**
 * Opening, closeing and archiving
 */

const actionStatusMap = {
  close: 'closed',
  open: 'open',
};

router.put('/:form/settings/:action(close|open)',
  (req, res, next) => {
    Form.findOneAndUpdate({
      conf: req.params.conf,
      name: req.params.form,
      admins: req.user,
      status: { $ne: 'archived' },
    }, {
      $set: {
        status: actionStatusMap[req.params.action],
      }
    }).exec((err, doc) => {
      if(err) return next(err);
      else if(!doc) return res.sendStatus(404);
      else return res.send({ msg: "OperationSuccessful" });
    });
  });

router.put('/:form/settings/archive',
  (req, res, next) => {
    //TODO: archive data
    Form.findOneAndUpdate({
      conf: req.params.conf,
      name: req.params.form,
      status: { $ne: 'archived' },
      admins: req.user,
    }, {
      $set: {
        status: 'archived',
      }
    }).exec((err, doc) => {
      if(err) return next(err);
      else if(!doc) return res.sendStatus(404);
      else return res.send({ msg: "OperationSuccessful" });
    });
  });

router.delete('/:form',
  (req, res, next) => {
    Form.remove({
      conf: req.params.conf,
      name: req.params.form,
      status: 'pending',
      admins: req.user,
    }).exec((err, wres) => {
      if(err) return next(err);
      else if(wres.result.n === 0) return res.sendStatus(404);
      else return res.send({ msg: "OperationSuccessful" });
    });
  });

/**
 * Settings
 */
router.post('/:form/settings/permissions',
  helpers.hasPerms(['form.permission']),
  helpers.hasFields(['viewers', 'moderators', 'admins']),
  (req, res, next) => {
    //TODO: lint the input
    
    Form.findOneAndUpdate({
      conf: req.params.conf,
      name: req.params.form,
    }, {
      $set: {
        viewers: req.body.viewers,
        moderators: req.body.moderators,
        admins: req.body.admins,
      }
    }).exec((err, doc) => {
      if(err) return next(err);
      else if(!doc) return res.sendStatus(404);
      else return res.send({ msg: "OperationSuccessful" });
    });
  });

//TODO: finish the following APIs
// Hooks
router.post('/:form/settings/hooks', (req, res, next) => res.sendStatus(501));
// Meta-data for submissions
router.post('/:form/settings/meta', (req, res, next) => res.sendStatus(501));

module.exports = router;
