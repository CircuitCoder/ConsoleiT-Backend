#!/usr/bin/env node
var db = require('../db/schema');
var mongoose = require('mongoose');

var fs = require('fs');

var Conf = mongoose.model('Conf');
var User = mongoose.model('User');

console.log(process.argv);

Conf.findById(process.argv[2],"registrants forms").lean().exec((err, doc) => {
  if(err) throw err;
  var target = process.argv[3];
  var ids = doc.registrants[target].map(e => e._id);

  User.find({
    _id: {$in: ids}
  }, {
    _id: true,
    realname: true
  }).lean().exec((err, users) => {
    if(err) throw err;
    var userMap = {};
    users.forEach(e => {
      userMap[e._id] = e.realname;
    });

    var sub = doc.registrants[target].map(e => ({ name: userMap[e._id], sub: JSON.parse(e.submission)}));
    var form = JSON.parse(doc.forms[target]);

    var result = "<meta charset=\"utf-8\"><body style='padding: 0px 40px'>";

    sub.forEach(e => {
      result += "<div style='padding-top: 40px'>";
      result += `<h1>${e.name}</h1>`;
      form.forEach((f, i) => {
        result += "<div style='height: 16px'></div>";
        if(f.type == "title") result += `<h2 style="font-family: HiraginoSansGB, MicrosoftYaHei, sans-serif">${f.title}</h2>`;
        else {
          result += `<h3 style="font-family: 'Hiragino Sans GB', MicrosoftYaHei, sans-serif">${f.title}</h3>`;
          
          result += "<div style='padding-left: 20px'>";
          if(!e.sub[i] || e.sub[i] === "") {
            result += "<i style='opcity: .4'>空</i>";
          } else {
            if(f.type == "checkbox") {
              result += '<ol>';
              Object.keys(e.sub[i]).map(g => e.sub[i][g]).forEach(g => {
                if(g) result += `<li>${g}</li>`;
              });
              result += '</ol>';
            } else {
              var csub = e.sub[i];
              result += csub.split("\n").map(h => `<p>${h}</p>`).join("");
            }
          }
          result += "</div>";
        }
      });
      result += "</div><hr>";
    });
    result += '</body>';

    console.log(result);
    process.exit();
  });
});
