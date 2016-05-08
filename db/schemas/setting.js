var mongoose = require('mongoose');

var SettingSchema = mongoose.Schema({
  _id: String,
  value: {} // Any
});

SettingSchema.statics.get = (id, cb) => {
  return Setting.findById(id).lean().exec(cb);
};

SettingSchema.statics.set = (id, value, cb) => {
  return Setting.findByIdAndUpdate(id, {$set: { value } }, { upsert: true, new: true }).exec((err, doc) => {
    if(err) return cb(err, null);
    else return cb(false, doc.value);
  });
};

module.exports = SettingSchema;
