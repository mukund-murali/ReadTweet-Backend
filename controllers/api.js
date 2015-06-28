var secrets = require('../config/secrets');
var querystring = require('querystring');
var validator = require('validator');
var async = require('async');
var cheerio = require('cheerio');
var request = require('request');
var Twit = require('twit');
var _ = require('lodash');

var twitterUtils = require('../utils/twitterUtils');

exports.getTwitter = function(req, res, next) {
  var sinceId = undefined;
  var maxId = undefined;
  twitterUtils.getRelevantTweetsFromTwitter(req.user, sinceId, maxId, function(err, relevantTweets, allTweets) {
    if (err) return next(err);
    res.render('api/twitter', {
      title: 'Dashboard',
      tweets: allTweets,
      relevantTweets: relevantTweets
    });
  });
};

exports.postTwitter = function(req, res, next) {
  req.assert('tweet', 'Tweet cannot be empty.').notEmpty();
  var errors = req.validationErrors();
  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/api/twitter');
  }
  var token = _.find(req.user.tokens, { kind: 'twitter' });
  var T = new Twit({
    consumer_key: secrets.twitter.consumerKey,
    consumer_secret: secrets.twitter.consumerSecret,
    access_token: token.accessToken,
    access_token_secret: token.tokenSecret
  });
  T.post('statuses/update', { status: req.body.tweet }, function(err, data, response) {
    if (err) return next(err);
    req.flash('success', { msg: 'Tweet has been posted.'});
    res.redirect('/api/twitter');
  });
};
