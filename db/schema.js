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

  /* Personal info */

  /**
   * Possible value for gender:
   * - male
   * - female
   * - unknown
   * Or other custom value
   */ 
  gender: {
    type: String,
    default: "unknown"
  },
  phone: String,
  qq: String,

  /**
   * Type of identification document 
   * (this is considering about users who don't have a Chinese National ID):
   * 1: National ID
   * 2: Passport
   * 3: Home Return Permit (HK/Macao) or Taiwan compatriot permit
   */
  IDType: Number,
  IDNumber: String,

  /**
   * Type of school:
   * 1: Junior high (Secondary school, middle school)
   * 2: High school (Senior high)
   * 3: University
   * 4: others (does not calculate grade)
   */
  schoolType: Number,
  schoolName: String,
  yearEnrolled: Number, //Grade is calculated

  /**
   * This field is for experiences not included in participation records
   */
  experiences: {
    type: [{
      /**
       * Name of the conference
       */
      conf: String, 

      /**
       * Level of the conference.
       * Possible values:
       * 1: International
       * 2: National
       * 3: Provincial
       * 4: Municipal (city)
       * 5: Discrict/County
       * 6: Interscholar
       * 7: Internal (school)
       */
      level: {
        type: Number, 
        enum: [1,2,3,4,5,6,7],
      },

      /**
       * String repersentation of awards won in that specific conference
       */
      awards: String,
    }],
    default: []
  }
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

/* Registrant */

/**
 * Note: These are active registrant records
 * Records for archived forms should be stored in another collection, readonly, indexed for fast-lookup
 */
var RegistrantSchema = {
  conf: Number,
  form: String,

  user: Number,

  status: String,
  submission: String,
  fromGroup: {type: Number, default: -1}, // -1 indicates a individual registrant

  locked: {type: Boolean, default: false},
  note: {type: String, default: ""},
}

mongoose.model('Registrant', RegistrantSchema);

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


var ConfSchema = mongoose.Schema({
  _id: Number,
  title: String,
  desc: String,
  group: Number,

  stages: [{
    name: String,
    links: Object,
  }],
  currentStage: String,
  available: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },

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

  forms: [{
    _id: String,
    title: String,

    /* Form content */
    content: { type: String, default: [] },

    /* Status */
    status: {
      type: String,
      enum: ['pending', 'open', 'closed', 'archived'],
      default: 'pending'
    },

    /* Permissions */
    viewers: { type: [Number], default: [] },
    moderators: { type: [Number], default: [] },
    admins: { type: [Number], default: [] },

    /* Automatic Hooks */
    openOn: {
      type: [String],
      default: [],
    },
    closedOn: {
      type: [String],
      default: [],
    },
    /* Otherwise archived */

    /* Possible status for submissions */
    submissionStatus: [String],
  }],

  members: [{
    _id: Number,
    role: Number
  }],

  comm: [{
    _id: Number,
    title: String
  }],
});

ConfSchema.options.toObject = {
  versionKey: false
}

mongoose.model('Conf', ConfSchema);

module.exports = mongoose.connection;
