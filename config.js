var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');

var config = yaml.load(fs.readFileSync(__dirname + '/config.yml'));

module.exports = config;
