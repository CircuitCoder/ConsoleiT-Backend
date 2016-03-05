var mongoose = require('mongoose');
var config = require('../config');
var crypto = require('crypto');

mongoose.connect(config.db.uri);

mongoose.connection.on('error', console.error.bind(console, 'connection error: '));

/* Settings and internal storage */

var counters = [{
  id: "user",
  init: 0
}, {
  id: "group",
  init: 0
}, {
  id: "conf",
  init: 0
}]

var CounterSchema = mongoose.Schema({
  _id: String,
  value: Number
});

CounterSchema.statics.getNext = function(id, cb) {
  this.findByIdAndUpdate(id, { $inc: { value: 1 } }, {
    new: true
  }, function(err, doc) {
    if(err) cb(err);
    else cb(false, doc.value);
  });
}

var Counter = mongoose.model('Counter', CounterSchema);

counters.forEach(function(e) {
  Counter.findById(e.id).exec(function(err, doc) {
    if(err) throw err;
    else if(!doc) {
      console.log("Inserting new counter: %s...", e.id);
      Counter.collection.insert({
        _id: e.id,
        value: e.init
      }, function(err, docs) {
        if(err) throw err;
        else console.log("Success.");
      });
    }
  });
});

/* User */

var UserSchema = mongoose.Schema({
  _id: Number,
  email: String,
  passwd: String,
  realname: String
});

UserSchema.methods.validatePasswd = function(passwd) {
  if(!passwd) return false;
  else {
    const hash = crypto.createHmac('sha256', config.auth.secret).update(passwd + this.email).digest('hex');
    return hash == this.passwd;
  }
}

UserSchema.methods.setPasswd = function(passwd) {
  const hash = crypto.createHmac('sha256', config.auth.secret).update(passwd + this.email).digest('hex');
  this.passwd = hash;
}

UserSchema.methods.initPasswd = function() {
  var token = crypto.randomBytes(16).toString('hex');
  this.setPasswd(token);
  return token;
}

mongoose.model('User', UserSchema);
