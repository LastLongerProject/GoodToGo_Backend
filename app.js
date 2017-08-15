var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var storeList = require('./routes/getStores');
var config = require('./config/config')

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

// Connect to MongoDB
// var mongo = require('mongodb');
// var monk = require('monk');
// var db = monk(config.dbUrl);

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

var mongoose = require('mongoose');
var passport = require('passport');
mongoose.connect(config.dbUrl);
app.use(passport.initialize());
app.set('passport', passport);
var user = require('./routes/user/index.js');
require('./models/passport')(passport); // pass passport for configuration

// Allow router to access db
// app.use(function(req,res,next){
//   req.db = db;
//   next();
// });

app.use('/', index);
app.use('/getStores', storeList);
app.use('/user', user);

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

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
