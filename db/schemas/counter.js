var mongoose = require('mongoose');

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

CounterSchema.statics.counters = counters;

module.exports = CounterSchema;
