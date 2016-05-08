var mongoose = require('mongoose');

var FormSchema = mongoose.Schema({
  name: String,
  title: String,

  /* Belongs to */
  conf: Number,
  
  /* Belongs to, for the entire conference if null */
  committee: String,

  /* Form content */
  content: Object,

  /* Status */
  status: {
    type: String,
    enum: ['pending', 'open', 'closed', 'archived'],
    default: 'pending'
  },

  /* For a certain committee? */
  committee: String,

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
  registrantStatus: {
    type: [{
      name: String,
      type: { type: String, enum: ['Number', 'Boolean', 'String'], }
    }],
    default: [],
  },
});

module.exports = FormSchema;
