var mongoose = require('mongoose');

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
  perm: { }
}, {
  _id: 4,
  title: '会务总监',
  perm: { }
}, {
  _id: 5,
  title: '技术总监',
  perm: { all: true }
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

  /* Is the conference pinned */
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

  members: [{
    _id: Number,
    role: Number
  }],

  /* Status fields for participants */
  participantStatus: {
    type: [{
      name: String,
      type: { type: String, enum: ['Number', 'Boolean', 'String'], }
    }],
    default: [],
  },
});

ConfSchema.options.toObject = {
  versionKey: false
}

module.exports = ConfSchema;
