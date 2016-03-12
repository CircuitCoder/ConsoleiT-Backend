// Helpers for routing

var mongoose = require('mongoose');
var Group = mongoose.model('Group');
var Conf = mongoose.model('Conf');

function getParam(req, name) {
  var result;
  if(name in req.params) result = req.params[name];
  else if(req.body && name in req.body) result = req.body[name];
  return result;
}

/**
 * Middelware for root-only operations
 */
module.exports.root = (req, res, next) => {
  if(!req.user) return res.send({ error: "NotLoggedIn" });
  else if(req.user.isRoot) return next();
  else return res.send({ error: "PermissionDenied" });
}

/** 
 * Middleware for logined-only operation
 */
module.exports.loggedin = (req, res, next) => {
  if(!req.user) return res.send({ error: "NotLoggedIn" });
  else return next();
}

/**
 * Generate a middleware to block access from users whose access level is lower than a specified value
 * Implies the route requires a logged-in user
 * @param {Number} value The lowest acceptable level
 */
module.exports.AL = (value) => {
  return function(req, res, next) {
    if(!req.user) return res.send({ error: "NotLoggedIn" });
    else if(req.user.accessLevel < value) return res.send({ error: "PermissionDenied" });
    else return next();
  };
}

/**
 * Middleware for group owner
 * Requires a request parameter or field: group; If both are present, the parameter is used
 * Addes a new field into the request object: the group mongoose object
 */
module.exports.groupOwner = (req, res, next) => {
  if(!req.user) return res.send({ error: "NotLoggedIn" });
  else {
    var group = getParam(req, 'group');

    Group.findById(group).exec((err, doc) => {
      if(err) return next(err);
      else if(doc) {
        if(doc.owner == req.user._id) {
          req.group = doc;
          return next();
        }
        else return res.send({ error: "PermissionDenied" });
      } else return res.send({ error: "NoSuchGroup" });
    });
  }
};

/**
 * Middleware for checking whether a body field is present
 * @param {String[]} fields The required fields
 * @returns {Function} The generated middleware
 */
module.exports.hasFields = (fields) => {
  return (req, res, next) => {
    if(!req.body) return res.sendStatus(400);
    Promise.all(fields.map((e) => {
      return new Promise((resolve, reject) => {
        if(e in req.body) resolve();
        else reject();
      });
    })).then((results) => {
      return next();
    }, (reason) => {
      return res.sendStatus(400);
    });
  }
}

/**
 * Middleware for checking if the current user has a specified set of permission
 * Requires a request parameter or field: conf
 * If both are present, the parameter is used
 * TODO: More tests
 */
module.exports.hasPerms = (perms) => {
  return (req, res, next) => {
    if(!req.user) return res.send({ error: "NotLoggedIn" });
    else {
      var conf = getParam(req, "conf");
      Conf.findById(conf, {
        roles: true,
        members: { $elemMatch: { _id: req.user._id } },
      }).lean().exec((err, doc) => {
        if(err) return next(err);
        else if(!doc) return res.sendStatus(400);
        else if(!doc.members) return res.send({ error: "PermissionDenied" });

        var roleId = doc.members[0].role;
        var role = doc.roles.filter( e => e._id == roleId )[0];

        Promise.all(perms.map((e) => {
          return (resolve, reject) => {
            var permBase = role.perm;
            var segs = e.split('.');
            for(var i = 0; i <= segs.length; ++i) {
              if(i == segs.length) return resolve();
              else if(permBase.all) return resolve();
              else if(permBase[segs[i]]) permBase = permBase[seg[i]];
              else return reject(e);
            }
          };
        })).then((results) => {
          return next();
        }, (reason) => {
          return res.sendStatus({ error: "PermissionDenied", perm: reason });
        });
      });
    }
  }
};
