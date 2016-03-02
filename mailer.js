var nodemailer = require('nodemailer');
var config = require('./config');
var mustache = require('mustache');
var fs = require('fs');

var transporter = nodemailer.createTransport(config.mailer.transport, config.mailer.defaults);

function getTemplate(id) {
  return fs.readFileSync(__dirname + '/mail/' + config.mailer.tmpls[id].file, 'utf8').toString('utf8');
}

module.exports = function(id, to, data, cb) {
  if(!id in config.mailer.tmpls) return cb("No such template");
  else {
    var content = mustache.render(getTemplate(id), data);
    console.log(content);
    transporter.sendMail({
      to: to,
      subject: config.mailer.tmpls[id].title,
      html: content
    }, cb);
  }
}
