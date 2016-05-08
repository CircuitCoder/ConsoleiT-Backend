var mongoose = require('mongoose');

/**
 * Note: These are participants for active committees
 */
var ParticipantSchema = mongoose.Schema({
  conf: Number,
  committee: String,

  seat: String,
  status: Object, // Key -> Value map
});

module.exports = ParticipantSchema;
