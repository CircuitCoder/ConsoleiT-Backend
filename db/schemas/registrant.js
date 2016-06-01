var mongoose = require('mongoose');

/**
 * Note: These are active registrant records
 * Records for archived forms should be stored in another collection, readonly, indexed for fast-lookup
 */
var RegistrantSchema = mongoose.Schema({
  conf: Number,
  form: String,

  user: Number,

  status: Object, // Key -> Value map
  submission: {type: Object, default: {}},
  fromGroup: {type: Number, default: -1}, // -1 indicates a individual registrant

  locked: {type: Boolean, default: false},
  note: {type: String, default: ""},
});

module.exports = RegistrantSchema;
