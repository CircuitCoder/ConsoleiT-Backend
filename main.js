var yaml = require('js-yaml');
var fs = require('fs');
var path = require('path');

var config = yaml.load(fs.readFileSync(__dirname + '/config.yml'));

var express = require('express');
var bodyParser = require('body-parser');
var routes = require('./route/base');

var dbc = require('./db/schema');

var app = express();
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(routes);
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.sendStatus(500);
});

app.listen(config.port, function() {
  console.log("Server started at port " + config.port );
});
