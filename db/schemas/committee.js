var mongoose = require('mongoose');

/**
 * Note: These are active committees
 */
var CommitteeSchema = mongoose.Schema({
  conf: Number,
  name: String,
  title: String,
  dias: { type: [Number], default: [] },

  seats: {
    type: [{
      title: String,
      count: Number,
    }],
    default: [],
  }
})

module.exports = CommitteeSchema;
