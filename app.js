/**
 * Module dependencies.
 */
var express = require('express');
var cookieParser = require('cookie-parser');
var compress = require('compression');
var favicon = require('serve-favicon');
var session = require('express-session');
var bodyParser = require('body-parser');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var lusca = require('lusca');
var methodOverride = require('method-override');
var multer  = require('multer');

var _ = require('lodash');
var MongoStore = require('connect-mongo')(session);
var flash = require('express-flash');
var path = require('path');
var mongoose = require('mongoose');
var passport = require('passport');
var expressValidator = require('express-validator');
var connectAssets = require('connect-assets');

/**
 * Controllers (route handlers).
 */
var homeController = require('./controllers/home');
var userController = require('./controllers/user');
var apiController = require('./controllers/api');
var contactController = require('./controllers/contact');
var twitterController = require('./controllers/twitter');

/**
 * API keys and Passport configuration.
 */
var secrets = require('./config/secrets');
var passportConf = require('./config/passport');

/**
 * Create Express server.
 */
 
var app = express();

/**
 * Connect to MongoDB.
 */
mongoose.connect(secrets.db);
mongoose.connection.on('error', function() {
  console.error('MongoDB Connection Error. Please make sure that MongoDB is running.');
});

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(compress());
app.use(connectAssets({
  paths: [path.join(__dirname, 'public/css'), path.join(__dirname, 'public/js')]
}));
app.use(logger('dev'));
app.use(favicon(path.join(__dirname, 'public/favicon.png')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer({ dest: path.join(__dirname, 'uploads') }));
app.use(expressValidator());
app.use(methodOverride());
app.use(cookieParser());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: secrets.sessionSecret,
  store: new MongoStore({ url: secrets.db, autoReconnect: true })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
// app.use(lusca({
//   csrf: true,
//   xframe: 'SAMEORIGIN',
//   xssProtection: true
// }));
app.use(function(req, res, next) {
  res.locals.user = req.user;
  next();
});
app.use(function(req, res, next) {
  if (/api/i.test(req.path)) req.session.returnTo = req.path;
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

/**
 * Primary app routes.
 */
app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.get('/account', passportConf.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConf.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConf.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConf.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConf.isAuthenticated, userController.getOauthUnlink);

app.get('/api', apiController.getApi);
app.get('/api/scraping', apiController.getScraping);
app.get('/api/twitter', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getTwitter);
app.post('/api/twitter', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.postTwitter);
app.get('/keywords', twitterController.getKeywords);

/**
 * OAuth authentication routes. (Sign in)
 */
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/login' }), function(req, res) {
  res.redirect(req.session.returnTo || '/');
});

/**
 * My API
 */
var signedInRouter = express.Router();

signedInRouter.use(function(req, res, next) {
    console.log('SignedInMiddleware');
    if (!req.user) {
      // call is from a device. populate this value from the params sent.
      User.findOne({twitter: req.query.user_id}, function(err, existingUser) {
        if (err || existingUser == null) {
          res.status(403).send({reason: 'notSignedIn'});
          return;
        }
        req.user = existingUser;
        next();
      });
    } else {
      next();
    }
});

var TweetModel = require('./models/Tweet');
var UserKeywordModel = require('./models/UserKeyword');
var User = require('./models/User');

var twitterUtils = require('./utils/twitterUtils');

signedInRouter.route('/tweets')
  .get(function(req, res) {
    var deviceId = req.query.device_id;
    var twitterUserId = req.query.user_id;
    var sinceTweetId = req.query.since_tweet_id;
    var user = req.user;
  
    twitterUtils.getRelevantTweetsFromTwitter(user, sinceTweetId, function(err, relevantTweets, allTweets) {
      if (err) return res.send(err);
      var respJSON = {
        tweets: allTweets,
        relevantTweets: relevantTweets
      };
      res.json(respJSON);
    });
  });

signedInRouter.route('/tweets/ignore/:tweet_id')
  .post(function(req, res) {
    var tweetId = req.params.tweet_id;
    var user = req.user;
    twitterUtils.markTweetIgnored(tweetId, user, res);
  });

signedInRouter.route('/tweets/consume/:tweet_id')
  .post(function(req, res) {
    var tweetId = req.params.tweet_id;
    var user = req.user;
    twitterUtils.markTweetConsumed(tweetId, user, res);
  });

signedInRouter.route('/tweets/interested/:tweet_id')
  .post(function(req, res) {
    var tweetId = req.params.tweet_id;
    var user = req.user;
    twitterUtils.markTweetInterested(tweetId, user, res);
  });


var userManagementUtils = require('./utils/userManagement');

var router = express.Router();
router.route('/login/')
  .post(function(req, res) {
    var userId = req.body.user_id;
    var username = req.body.username;
    var authToken = req.body.auth_token;
    var authTokenSecret = req.body.auth_token_secret;
    userManagementUtils.login(userId, username, authToken, authTokenSecret, req, res);
  });
app.use('/api/v1', router);
app.use('/api/v2', signedInRouter);

// END of My API

/**
 * Error Handler.
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
app.listen(app.get('port'), function() {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;
