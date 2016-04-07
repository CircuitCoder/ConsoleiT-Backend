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
}];

var CounterSchema = mongoose.Schema({
  _id: String,
  value: Number
});

CounterSchema.statics.getNext = function(id, cb) {
  this.findByIdAndUpdate(id, { $inc: { value: 1 } }, {
    new: true
  }, function(err, doc) {
    if(err) cb(err);
    else if(doc == null) cb(new Error("Now such counter"));
    else cb(false, doc.value);
  });
};

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

var SettingSchema = mongoose.Schema({
  _id: String,
  value: {} // Any
});

SettingSchema.statics.get = (id, cb) => {
  return Setting.findById(id).lean().exec(cb);
};

SettingSchema.statics.set = (id, value, cb) => {
  return Setting.findByIdAndUpdate(id, {$set: { value } }, { upsert: true, new: true }).exec((err, doc) => {
    if(err) return cb(err, null);
    else return cb(false, doc.value);
  });
};

var Setting = mongoose.model('Setting', SettingSchema);

/* User */

var UserSchema = mongoose.Schema({
  _id: Number,
  email: String,
  passwd: String,
  realname: String,
  resetToken: String,
  isRoot: Boolean,
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

UserSchema.methods.generateToken = function() {
  var token = crypto.randomBytes(48).toString('hex');
  this.resetToken = token;
  return token;
}

UserSchema.methods.validateToken = function(token) {
  if(this.resetToken && this.resetToken == token) {
    this.resetToken = undefined;
    return true;
  } else return false;
}

UserSchema.options.toObject = {
  versionKey: false,
  transform: (doc, ret, options) => {
    delete ret.passwd;
  }
}

mongoose.model('User', UserSchema);

/* Group */

var GroupSchema = mongoose.Schema({
  _id: Number,
  title: String,

  /* UID fields */
  owner: Number,
  admins: [Number],
  members: [Number],
});

GroupSchema.options.toObject = {
  versionKey: false
}

mongoose.model('Group', GroupSchema);

/* Conference */

var defaultRoles = [{
  _id: 1,
  title: '秘书长',
  perm: { all: true }
}, {
  _id: 2,
  title: '副秘书长',
  perm: { all: true }
}, {
  _id: 3,
  title: '学术总监',
  perm: {
    form: {
      academicZh: { all: true },
      academicEn: { all: true }
    },
    registrant: {
      academicZh: { view: true },
      academicEn: { view: true }
    }
  }
}, {
  _id: 4,
  title: '会务总监',
  perm: {
    form: {
      participant: { all: true }
    },
    registrant: {
      participant: { view: true }
    }
  }
}, {
  _id: 5,
  title: '技术总监',
  perm: {
    all: true
  }
}];

var registrantDesc = {
  _id: Number,

  /**
   * Status for academic team members:
   *
   * 1: registered
   * 2: assigned
   * 3: rejected
   *
   * Status for participants:
   * TBD
   */
  status: Number,
  submission: Number,
  comm: Number,
  fromGroup: {type: Number, default: -1}, // -1 indicates a individual registrant
  locked: {type: Boolean, default: false},
}

var ConfSchema = mongoose.Schema({
  _id: Number,
  title: String,
  desc: String,
  group: Number,
  status: {
    /**
     * Status for this conference
     * Possible values:
     * 0 Initialized
     *
     * 1 Academic registeration in process
     * 2 Pending applicants registeration
     * 3 Pending academic tests
     * 4 Before conference
     *
     * -1 Conference finished
     * -2 Conference abandoned
     */
    type: Number,
    default: 0
  },
  pinned: {
    type: Boolean,
    default: false
  },

  roles: {
    type: [{
      _id: Number,
      title: String,
      perm: {}
    }],
    default: defaultRoles
  },

  forms: {
    type: {
      academicZh: String,
      academicEn: String,
      participant: String,
    },
    default: {
      academicZh: "[]",
      academicEn: "[]",
      participant: "[]",
    }
  },

  members: [{
    _id: Number,
    role: Number
  }],

  comm: [{
    _id: Number,
    title: String
  }],

  registrants: {
    type: {
      academicZh: [registrantDesc],
      academicEn: [registrantDesc],
      participant: [registrantDesc],
    },
    default: {
      academicZh: [],
      academicEn: [],
      participant: []
    }
  }
});

ConfSchema.options.toObject = {
  versionKey: false
}

mongoose.model('Conf', ConfSchema);
