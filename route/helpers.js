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
 * Requires a request parameter: group
 * Addes a new field into the request object: the group mongoose object
 */
module.exports.groupOwner = (req, res, next) => {
  if(!req.user) return res.send({ error: "NotLoggedIn" });
  else Group.findById(req.params.group).exec((err, doc) => {
    if(err) return next(err);
    else if(doc) {
      if(doc.owner == req.user._id) {
        req.group = doc;
        return next();
      }
      else return res.send({ error: "PermissionDenied" });
    } else return res.send({ error: "NoSuchGroup" });
  });
};
