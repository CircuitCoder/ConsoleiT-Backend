var nodemailer = require('nodemailer');
var config = require('./config');
var mustache = require('mustache');
var fs = require('fs');
var crypto = require('crypto');

var transporter = nodemailer.createTransport(config.mailer.transport, config.mailer.defaults);

function getTemplate(id) {
  return fs.readFileSync(`${__dirname}/mail/tmpls/${config.mailer.tmpls[id].file}`, 'utf8').toString('utf8');
}

/* Get images */
var image = {}
config.mailer.images.forEach(e => {
  var file = fs.readFileSync(`${__dirname}/mail/images/${e.file}`).toString('base64');
  var type;
  if(e.type) type = e.type;
  else {
    var extension = e.file.split('.').pop();
    switch(extension) {
      case 'svg': type = 'image/svg+xml'; break;
      case 'jpg': type = 'image/jpg'; break;
      case 'png': type = 'image/png'; break;
      default: type = 'image/' + extension; break;
    }
  }
  image[e.key] = 'data:' + type + ';base64,' + file;
});

module.exports = function(id, to, data, cb) {
  if(!id in config.mailer.tmpls) return cb("No such template");
  else {
    var content = mustache.render(getTemplate(id), {data, image});
    if(to) // For testing
      transporter.sendMail({
        to: to,
        subject: config.mailer.tmpls[id].title,
        html: content
      }, cb);

    return content;
  }
}
