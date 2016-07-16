var mongoose = require('mongoose');

/**
 * Note: These are participants for active committees
 */
var ParticipantSchema = mongoose.Schema({
  conf: Number,
  committee: String,
  user: Number,

  group: String,
  status: Object, // Key -> Value map
});

module.exports = ParticipantSchema;
