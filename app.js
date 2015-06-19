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
var router = express.Router();

var Bear = require('./models/bear');

// middleware to use for all requests
router.use(function(req, res, next) {
    console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
});

router.get('/', function(req, res) {
    res.json({ message: 'Welcome to our api!' });   
});

var TweetModel = require('./models/Tweet');
var UserKeywordModel = require('./models/UserKeyword');

var markIgnored = function(keyword, user) {
  UserKeywordModel.findOne({keyword: keyword, userId: user._id}, function(err, doc) {
    if (err || doc === null) {
      // we have never seen the keyword for this user yet.
      // In this case, we assume that the keyword is relevant.
      var obj = new UserKeywordModel();
      obj.userId = user._id;
      obj.keyword = keyword;
      obj.occurence = 1;
      obj.ignored = 1;
      obj.save();
      return;
    }
    doc.occurence += 1;
    doc.ignored += 1;  
    doc.save();
  });
}

var markConsumed = function(keyword, user) {
  UserKeywordModel.findOne({keyword: keyword, userId: user._id}, function(err, doc) {
    if (err || doc === null) {
      // we have never seen the keyword for this user yet.
      // In this case, we assume that the keyword is relevant.
      var obj = new UserKeywordModel();
      obj.userId = user._id;
      obj.keyword = keyword;
      obj.occurence = 1;
      obj.ignored = 0;
      obj.save();
      return;
    }
    doc.occurence += 1;
    doc.save();
  });
}

var markTweetIgnored = function(tweetId, user) {
  TweetModel.findOne({ tweetId: tweetId }, function (err, doc) {
    if (err || doc === null) {
      return;
    }
    keywords = doc.keywords;  
    for (var i = 0; i < keywords.length; i++) {
      var keyword = keywords[i];
      markIgnored(keyword, user);
    }
  });
}

var markTweetConsumed = function(tweetId, user) {
  TweetModel.findOne({ tweetId: tweetId }, function (err, doc) {
    if (err || doc === null) {
      return;
    }
    keywords = doc.keywords;  
    for (var i = 0; i < keywords.length; i++) {
      var keyword = keywords[i];
      markConsumed(keyword, user);
    }
  });
}

router.route('/tweets/ignore/:tweet_id')
  .post(function(req, res) {
    var tweetId = req.params.tweet_id;
    var user = req.user;
    markTweetIgnored(tweetId, user);
    res.json({ message: 'Tweet ignored!' });
  });

router.route('/tweets/consume/:tweet_id')
  .post(function(req, res) {
    var tweetId = req.params.tweet_id;
    var user = req.user;
    markTweetConsumed(tweetId, user);
    res.json({ message: 'Tweet consumed!' });
  });

router.route('/bears')
    // create a bear (accessed at POST http://localhost:8080/api/v1/bears)
    .post(function(req, res) {
        var bear = new Bear();
        bear.name = req.body.name;
        bear.save(function(err) {
            if (err)
                res.send(err);
            res.json({ message: 'Bear created!' });
        })
      })
      // get all the bears (accessed at GET http://localhost:8080/api/v1/bears)
      .get(function(req, res) {
          Bear.find(function(err, bears) {
              if (err)
                  res.send(err);
              res.json(bears);
          });
      });

router.route('/bears/:bear_id')

    // get the bear with that id (accessed at GET http://localhost:8080/api/bears/:bear_id)
    .get(function(req, res) {
        Bear.findById(req.params.bear_id, function(err, bear) {
            if (err)
                res.send(err);
            res.json(bear);
        });
    })
    // update the bear with this id (accessed at PUT http://localhost:8080/api/bears/:bear_id)
    .put(function(req, res) {

        // use our bear model to find the bear we want
        Bear.findById(req.params.bear_id, function(err, bear) {

            if (err)
                res.send(err);

            bear.name = req.body.name;  // update the bears info

            // save the bear
            bear.save(function(err) {
                if (err)
                    res.send(err);

                res.json({ message: 'Bear updated!' });
            });

        });
    })
    // delete the bear with this id (accessed at DELETE http://localhost:8080/api/bears/:bear_id)
    .delete(function(req, res) {
        Bear.remove({
            _id: req.params.bear_id
        }, function(err, bear) {
            if (err)
                res.send(err);

            res.json({ message: 'Successfully deleted' });
        });
    });

app.use('/api/v1', router);

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
