var nodemailer = require('nodemailer');
var config = require('./config');
var mustache = require('mustache');
var fs = require('fs');
var crypto = require('crypto');
var juice = require('juice');

var transporter = nodemailer.createTransport(config.mailer.transport, config.mailer.defaults);

function getTemplate(id) {
  return fs.readFileSync(`${__dirname}/mail/tmpls/${config.mailer.tmpls[id].file}`, 'utf8').toString('utf8');
}

/* Get images */
var image = {
  base64: {},
  raw: {},
}
config.mailer.images.forEach(e => {
  var file = fs.readFileSync(`${__dirname}/mail/images/${e.file}`);
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
  image.base64[e.key] = 'data:' + type + ';base64,' + file.toString('base64');
  image.raw[e.key] = file.toString('utf8');
});

module.exports = function(id, to, data, cb) {
  if(!id in config.mailer.tmpls) return cb("No such template");
  else {
    var content = juice(mustache.render(getTemplate(id), {data, image}));
    if(to) // For testing
      transporter.sendMail({
        to: to,
        subject: config.mailer.tmpls[id].title,
        html: content
      }, cb);

    return content;
  }
}
