var config = require('./config');
var dbc = require('./db/schema');

var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var routes = require('./route/base');

var strategy = require('./auth.js');
var passport = require('passport');

passport.use(strategy);

var app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(routes);
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.sendStatus(500);
});

app.listen(config.webserver.port, function() {
  console.log("Server started at port " + config.webserver.port );
});
