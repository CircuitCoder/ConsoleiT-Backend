// Helpers for routing

var mongoose = require('mongoose');
var Group = mongoose.model('Group');

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
    var group;
    if(req.params.group) group = req.params.group;
    else if(req.body && req.body.group) group = req.body.group;

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
