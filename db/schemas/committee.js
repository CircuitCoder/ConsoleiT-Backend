var mongoose = require('mongoose');

/**
 * Note: These are active committees
 */
var CommitteeSchema = mongoose.Schema({
  conf: Number,
  name: String,
  title: String,
  daises: { type: [Number], default: [] },
  admins: { type: [Number], default: [] },
  desc: { type: String, default: "" },

  seats: {
    type: [{
      id: String,
      title: String,
      count: Number,
      group: String,
    }],
    default: [],
  }
})

module.exports = CommitteeSchema;
