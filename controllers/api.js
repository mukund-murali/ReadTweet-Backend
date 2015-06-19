var secrets = require('../config/secrets');
var querystring = require('querystring');
var validator = require('validator');
var async = require('async');
var cheerio = require('cheerio');
var request = require('request');
var Twit = require('twit');
var _ = require('lodash');

/**
 * GET /api
 * List of API examples.
 */
exports.getApi = function(req, res) {
  res.render('api/index', {
    title: 'API Examples'
  });
};


/**
 * GET /api/scraping
 * Web scraping example using Cheerio library.
 */
exports.getScraping = function(req, res, next) {
  request.get('https://news.ycombinator.com/', function(err, request, body) {
    if (err) return next(err);
    var $ = cheerio.load(body);
    var links = [];
    $('.title a[href^="http"], a[href^="https"]').each(function() {
      links.push($(this));
    });
    res.render('api/scraping', {
      title: 'Web Scraping',
      links: links
    });
  });
};

/*
{"created_at":"Fri Jun 19 11:51:24 +0000 2015","id":611863851240271872,"id_str":"611863851240271872",
"text":"Eton Expands Into Online Courses With EtonX Join Venture http:\/\/t.co\/0jIh1DCykl by @riptari",
"source":"\u003ca href=\"http:\/\/10up.com\" rel=\"nofollow\"\u003e10up Publish Tweet\u003c\/a\u003e",
"truncated":false,"in_reply_to_status_id":null,"in_reply_to_status_id_str":null,"in_reply_to_user_id":null,
"in_reply_to_user_id_str":null,"in_reply_to_screen_name":null,
"user":
  {"id":816653,"id_str":"816653","name":"TechCrunch","screen_name":"TechCrunch","location":"San Francisco, CA",
  "description":"Breaking technology news, analysis, and opinions from TechCrunch. The number one guide for all things tech.",
  "url":"http:\/\/t.co\/b5Oyx12qGG",
  "entities":{"url":{"urls":[{"url":"http:\/\/t.co\/b5Oyx12qGG","expanded_url":"http:\/\/techcrunch.com","display_url":"techcrunch.com",
  "indices":[0,22]}]},"description":{"urls":[]}},"protected":false,"followers_count":5262846,"friends_count":687,
  "listed_count":97922,"created_at":"Wed Mar 07 01:27:09 +0000 2007",
  "favourites_count":652,"utc_offset":-25200,"time_zone":"Pacific Time (US & Canada)","geo_enabled":true,
  "verified":true,"statuses_count":102104,"lang":"en","contributors_enabled":false,"is_translator":false,
  "is_translation_enabled":true,"profile_background_color":"149500",
  "profile_background_image_url":"http:\/\/pbs.twimg.com\/profile_background_images\/542331481398317056\/81Rbm71g.png",
  "profile_background_image_url_https":"https:\/\/pbs.twimg.com\/profile_background_images\/542331481398317056\/81Rbm71g.png",
  "profile_background_tile":false,"profile_image_url":"http:\/\/pbs.twimg.com\/profile_images\/469171480832380928\/rkZR1jIh_normal.png",
  "profile_image_url_https":"https:\/\/pbs.twimg.com\/profile_images\/469171480832380928\/rkZR1jIh_normal.png",
  "profile_banner_url":"https:\/\/pbs.twimg.com\/profile_banners\/816653\/1431096993","profile_link_color":"097000",
  "profile_sidebar_border_color":"FFFFFF","profile_sidebar_fill_color":"DDFFCC","profile_text_color":"222222",
  "profile_use_background_image":true,"default_profile":false,"default_profile_image":false,"following":true,
  "follow_request_sent":false,"notifications":false},"geo":null,"coordinates":null,"place":null,"contributors":null,
  "is_quote_status":false,"retweet_count":1,"favorite_count":0,
  "entities":{"hashtags":[],"symbols":[],"user_mentions":[{"screen_name":"riptari","name":"Natasha","id":15734027,
  "id_str":"15734027","indices":[83,91]}],"urls":[{"url":"http:\/\/t.co\/0jIh1DCykl",
  "expanded_url":"http:\/\/tcrn.ch\/1MRJ8SH","display_url":"tcrn.ch\/1MRJ8SH","indices":[57,79]}]},
"favorited":false,"retweeted":false,"possibly_sensitive":false,"possibly_sensitive_appealable":false,"lang":"en"}

*/

/**
 * GET /api/twitter
 * Twiter API example.
 */
exports.getTwitter = function(req, res, next) {
  var token = _.find(req.user.tokens, { kind: 'twitter' });
  var T = new Twit({
    consumer_key: secrets.twitter.consumerKey,
    consumer_secret: secrets.twitter.consumerSecret,
    access_token: token.accessToken,
    access_token_secret: token.tokenSecret
  });
  T.get('statuses/home_timeline', function(err, reply) {
    if (err) return next(err);
    res.render('api/twitter', {
      title: 'Tweets',
      tweets: reply
    });
  });
};

/**
 * POST /api/twitter
 * Post a tweet.
 */
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
