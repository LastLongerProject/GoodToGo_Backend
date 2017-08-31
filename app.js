var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var debug = require('debug')('goodtogo_backend:app');
var debugError = require('debug')('goodtogo_backend:appERR');

var index = require('./routes/index');
var loggingDefault = require('./routes/loggingDefault');
var stores = require('./routes/stores');
var users = require('./routes/users');
var containers = require('./routes/containers');
var config = require('./config/config');

var app = express();

// GA
var ua = require('universal-analytics');
var visitor = ua(config.GA_TRACKING_ID, {https: true});
function GAtrigger(req, res, next) {
	visitor.set('ua', req.headers['user-agent']);
	visitor.pageview(req.url, function (err) {
		if (err !== null){
      console.log('Failed to trigger GA: ' + err);
		}
	});
	next();
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('short'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(GAtrigger); // Trigger Google Analytics
app.use(passport.initialize());
app.set('passport', passport);

debug.log = console.log.bind(console);
mongoose.Promise = global.Promise;
mongoose.connect(config.dbUrl,config.dbOptions, function(err){
  if (err) next(err);
  debug('DB connect succeed');
});
require('./models/userQuery'); // pass passport for configuration

app.all('/*', loggingDefault);

app.use('/', index);
app.use('/stores', stores);
app.use('/getStores', function(req, res){debug("Redirect to store.");res.writeHead(301,{Location: 'https://app.goodtogo.tw/stores/list'});res.end();});
app.use('/users', users);
app.use('/containers', containers);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  if (typeof err.status === 'undefined'){
    debugError(err.message);
    res.status(500);
    res.json({type: 'globalError', message: 'Unexpect Error. Please contact network administrator with following data: ' + JSON.stringify(req)});
  } else {
    res.status(err.status);
    res.json({type: 'globalError', message: err.message});
  }
});

module.exports = app;
