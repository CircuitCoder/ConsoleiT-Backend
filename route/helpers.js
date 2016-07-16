'use strict';

// Helpers for routing

var mongoose = require('mongoose');
var Group = mongoose.model('Group');
var Conf = mongoose.model('Conf');

function getParam(req, name) {
  var result;
  if(req.params && name in req.params) result = req.params[name];
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
};

/** 
 * Middleware for logined-only operation
 */
module.exports.loggedin = (req, res, next) => {
  if(!req.user) return res.send({ error: "NotLoggedIn" });
  else return next();
};

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
};

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
        if(doc.owner == req.user) {
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
    for(let i = 0; i < fields.length; ++i) {
      if(!(fields[i] in req.body)) return res.sendStatus(400);
      else if(req.body[fields[i]] === undefined) return res.sendStatus(400);
      else if(req.body[fields[i]] === null) return res.sendStatus(400);
      else if(req.body[fields[i]] === "") return res.sendStatus(400);
    }
    return next();
  };
};

/**
 * Middleware for checking if the current user has a specified set of permission
 * Requires a request parameter or field: conf
 * If both are present, the parameter is used
 * TODO: More tests
 */
module.exports.hasPerms = (perms, except) => {
  return (req, res, next) => {
    if(except && except(req)) return next();
    else if(!req.user) return res.send({ error: "NotLoggedIn" });
    else {
      const conf = getParam(req, "conf");
      Conf.findById(conf, {
        roles: true,
        members: { $elemMatch: { _id: req.user } },
      }).lean().exec((err, doc) => {
        if(err) return next(err);
        else if(!doc) return res.sendStatus(400);
        else if(!doc.members) return res.send({ error: "PermissionDenied" });

        const roleId = doc.members[0].role;
        const role = doc.roles.filter( e => e._id == roleId )[0];

        let reason;

        if(perms.every(_e => {
          let e = _e;
          if(typeof _e === "function") e = _e(req);

          const permBase = role.perm;
          const segs = e.split('.');
          for(let i = 0; i <= segs.length; ++i) {
            if(i == segs.length) return true;
            else if(permBase.all) return true;
            else if(permBase[segs[i]]) permBase = permBase[segs[i]];
            else {
              reason = e;
              return false;
            }
          }
        })) return next();
        else return res.sendStatus({ error: "PermissionDenied", perm: reason });
      });
    }
  };
};

/**
 * Middleware for checking if the requested conference exists
 * Requires a requiest parameter or field: conf
 * If both are present, the parameter is used
 */
module.exports.confExists = (req, res, next) => {
  var conf = getParam(req, 'conf');
  Conf.findById(conf).select('_id').exec((err, doc) => {
    if(err) return next(err);
    else if(doc) return next();
    else return res.sendStatus({ error: "NoSuchConf" });
  });
};

/**
 * Middleware for converting parameters or fields from hyphen to camel
 */
module.exports.toCamel = (params, fields) => {
  return (req, res, next) => {
    if(params) params.forEach( e => {
      if(e in req.params) req.params[e] = req.params[e].replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    });

    if(fields) fields.forEach( e => {
      if(e in req.body) req.body[e] = req.body[e].replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    });

    next();
  };
};

/**
 * Middleware for converting parameters or fields to lower case
 */
module.exports.toLower = (params, fields) => {
  return (req, res, next) => {
    if(params) params.forEach( e => {
      if(e in req.params) req.params[e] = req.params[e].toLowerCase();
    });

    if(fields) fields.forEach( e => {
      if(e in req.body) req.body[e] = req.body[e].toLowerCase();
    });

    next();
  };
};
