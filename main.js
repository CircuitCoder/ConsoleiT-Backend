var config = require('./config');
var dbc = require('./db/schema');

var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var cors = require('cors');
var routes = require('./route/base');

var strategy = require('./auth.js');
var passport = require('passport');

passport.use(strategy);
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

var app = express();

app.use(bodyParser.json());
app.use(cors());

app.use(session({
  secret: config.auth.secret,
  resave: true,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(routes);

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.sendStatus(500);
});

app.listen(config.webserver.port, function() {
  console.log("Server started at port " + config.webserver.port );
});
