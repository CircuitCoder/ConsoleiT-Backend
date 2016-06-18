const nodemailer = require('nodemailer');
const config = require('./config');
const mustache = require('mustache');
const fs = require('fs');
const crypto = require('crypto');
const juice = require('juice');

const transporter = nodemailer.createTransport(config.mailer.transport, config.mailer.defaults);

function getTemplate(id) {
  return fs.readFileSync(`${__dirname}/mail/tmpls/${config.mailer.tmpls[id].file}`, 'utf8').toString('utf8');
}

/* Get images */
const images = {};
config.mailer.images.forEach(e => {
  images[e.key] = {
    filename: e.file,
    content: fs.readFileSync(`${__dirname}/mail/images/${e.file}`),
    cid: 'ci.img.' + e.key,
    file: e.file,
  }
});

class ImageGenerator {
  constructor(store) {
    this.store = store;
    this.registered = [];
  }

  generate(name, classnames = []) {
    if(!(name in this.store)) {
      // TODO: logging
      return '';
    } else {
      this.registered.push(name);
      return `<img class="${classnames.join(' ')}" src="cid:${this.store[name].cid}"></img>`;
    }
  }

  finish() {
    return this.registered.map(e => ({
      filename: this.store[e].filename,
      content: this.store[e].content,
      cid: this.store[e].cid,
    }));
  }
}

function imageBind(generator) {
  return () => (text) => generator.generate(text);
}

module.exports = function(id, to, data, cb) {
  if(!id in config.mailer.tmpls) return cb("No such template");
  else {
    const randstr = crypto.randomBytes(16).toString('hex');
    const gen = new ImageGenerator(images);
    const content = juice(mustache.render(getTemplate(id), { randstr, data, image: imageBind(gen) }));

    if(to) // For testing
      transporter.sendMail({
        to: to,
        subject: config.mailer.tmpls[id].title,
        html: content,
        attachments: gen.finish(),
      }, cb);

    return content;
  }
}

