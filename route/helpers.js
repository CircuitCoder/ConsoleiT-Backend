// Helpers for routing

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
