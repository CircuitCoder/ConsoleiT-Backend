var mongoose = require('mongoose');
var config = require('../config');

mongoose.connect(config.db.uri);

mongoose.connection.on('error', console.error.bind(console, 'connection error: '));

/* Settings and internal storage */

var CounterSchema = require('./schemas/counter');
var SettingSchema = require('./schemas/setting');

var Counter = mongoose.model('Counter', CounterSchema);
var Setting = mongoose.model('Setting', SettingSchema);

/**
 * Initialize counter
 */

Counter.counters.forEach(function(e) {
  Counter.findById(e.id).exec(function(err, doc) {
    if(err) throw err;
    else if(!doc) {
      console.log("Inserting new counter: %s...", e.id);
      Counter.collection.insert({
        _id: e.id,
        value: e.init
      }, function(err, docs) {
        if(err) throw err;
        else console.log("Success.");
      });
    }
  });
});

/* User & Group */

var UserSchema = require('./schemas/user');
var GroupSchema = require('./schemas/group');

mongoose.model('User', UserSchema);
mongoose.model('Group', GroupSchema);

/* Conference related */

var RegistrantSchema = require('./schemas/registrant');
var CommitteeSchema = require('./schemas/committee');
var ParticipantSchema = require('./schemas/participant');
var FormSchema = require('./schemas/form');
var ConfSchema = require('./schemas/conf');

mongoose.model('Registrant', RegistrantSchema);
mongoose.model('Committee', CommitteeSchema);
mongoose.model('Participant', ParticipantSchema);
mongoose.model('Form', FormSchema);
mongoose.model('Conf', ConfSchema);

module.exports = mongoose.connection;
