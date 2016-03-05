var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');

var User = mongoose.model('User');

var strategy = new LocalStrategy({
  usernameField: 'email',
  passwordField: 'passwd'
}, function(email, passwd, done) {
  User.findOne({ email: email }).exec(function(err, user) {
    if(err) return done(err);
    else if(!user || !user.validatePasswd(passwd)) return done(null, false);
    else return done(null, {
      id: user._id,
      email: user.email,
      realname: user.realname,
      isRoot: user.isRoot
    });
  });
});

module.exports = strategy;
