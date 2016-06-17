var mongoose = require('mongoose');

var FormSchema = mongoose.Schema({
  name: String,
  title: String,

  /* Belongs to */
  conf: Number,
  
  /* Belongs to, for the entire conference if null */
  committee: String,

  /* Form content */
  content: { type: [mongoose.Schema.Types.Mixed], default: [] },

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

  /* Possible indicators for submissions */
  indicators: {
    type: [{
      name: String,
      type: { type: String, enum: ['Number', 'Boolean', 'String'] },
    }],
    default: [],
  },

  keywords: { type: [Number], default: [] },

  meta: {
    type: {
      payment: { type: Boolean, default: false },
    },
    default: {
      payment: false,
    }
  },
});

FormSchema.options.toObject = {
  versionKey: false
}

module.exports = FormSchema;
