var mongoose = require('mongoose');

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

module.exports = GroupSchema;
