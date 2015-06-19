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
  "entities":{"url":{"urls":[{"url":"http:\/\/t.co\/b5Oyx12qGG","expanded_url":"http:\/\/techcrunch.com",
  "display_url":"techcrunch.com",
  "indices":[0,22]}]},"description":{"urls":[]}},"protected":false,"followers_count":5262846,"friends_count":687,
  "listed_count":97922,"created_at":"Wed Mar 07 01:27:09 +0000 2007",
  "favourites_count":652,"utc_offset":-25200,"time_zone":"Pacific Time (US & Canada)","geo_enabled":true,
  "verified":true,"statuses_count":102104,"lang":"en","contributors_enabled":false,"is_translator":false,
  "is_translation_enabled":true,"profile_background_color":"149500",
  "profile_background_image_url":"http:\/\/pbs.twimg.com\/profile_background_images\/542331481398317056\/81Rbm71g.png",
  "profile_background_image_url_https":"https:\/\/pbs.twimg.com\/profile_background_images\/542331481398317056\/81Rbm71g.png",
  "profile_background_tile":false,
  "profile_image_url":"http:\/\/pbs.twimg.com\/profile_images\/469171480832380928\/rkZR1jIh_normal.png",
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


var getTweetId = function(tweet) {
  return tweet.id;
};

var getTweetString = function(tweet) {
  return tweet.text;
};

var TweetModel = require('../models/Tweet');
var UserKeywordModel = require('../models/UserKeyword');

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
  T.get('statuses/home_timeline', {'count': 20}, function(err, reply) {
    if (err) return next(err);
    allTweets = reply;
    getRelevantTweets(allTweets, req.user, function(relevantTweets) {
      // sorting tweets by ID
      allTweets.sort(function(a, b) {
          return a.id - b.id;
      });
      relevantTweets.sort(function(a, b) {
          return a.id - b.id;
      });
      res.render('api/twitter', {
        title: 'Tweets',
        tweets: allTweets,
        relevantTweets: relevantTweets
      });
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



// Helper functions. To move it to a different place

THRESHOLD_FOR_WORD_RELEVANCE = 0.5 

var getWordRelevance = function(obj) {
  var relevance = (obj.occurence - obj.ignored) / obj.occurence;
  console.log("word rel:", obj, relevance);
  return relevance
  ;
}

var isRelevantKeyword = function(keyword, user, callback) {
  UserKeywordModel.findOne({keyword: keyword, userId: user._id}, function(err, doc) {
    if (err || doc === null) {
      // we have never seen the keyword for this user yet.
      // In this case, we assume that the keyword is relevant.
      callback(true);
      return;
    }
    if (getWordRelevance(doc) > THRESHOLD_FOR_WORD_RELEVANCE) {
      callback(true);
    } else {
      callback(false);
    }
  });
}

THRESHOLD_FOR_TWEET_RELEVANCE = 0.5

var getTweetRelevance = function(no_relevant_keywords, no_keywords) {
  return no_relevant_keywords/no_keywords;
}

var isTweetFromANews = function(tweet) {
  return true;
}

var doesTweetHaveLink = function(tweet) {
  return true;
}

/* 
probably store tweetId and its keywords temporarily to avoid alchemy API calls 
since same tweet could be referenced by multiple users multiple times 
Two days would be a reasonable no. days to store. - Should research on the no. days a tweet is usually refenced.
*/

var getNoRelevantKeywords = function(keywords, user, callback) {
  var timesToRun = keywords.length;
  if (timesToRun == 0) {
    // if no keywords are there.
    callback(0);
    return;
  }
  var timesRun = 0;
  var noRelevantKeywords = 0;
  for (var i = 0; i < timesToRun; i++) {
      var keyword = keywords[i];
      isRelevantKeyword(keyword, user, function(isRelevant) {
        if (isRelevant) {
          noRelevantKeywords++;
        }
        timesRun++;
        if (timesRun >= timesToRun) {
          callback(noRelevantKeywords);
          return;
        }
      });
    }
};

/*
# before using any tweet for any processing, save the tweet data temporarily. 
# this saves all the required information in a temporary database for faster retreival in the future. 
*/
var _saveTweetInfo = function(tweetId, tweetString, keywords, callback) {
  var tweetObj = new TweetModel();
  tweetObj.tweetId = tweetId;
  tweetObj.keywords = keywords;
  tweetObj.tweetString = tweetString;

  tweetObj.save(function(err) {
      if (err)
          callback(true);
      callback(false, tweetObj);
  })
}

var ALCHEMY_API_GET_TEXT_RANKED_KEYKORDS_URL = "http://access.alchemyapi.com/calls/text/TextGetRankedKeywords";

var KEY_TEXT = "text";
var API_KEY = "apikey";
var OUTPUT_MODE = "outputMode";

var ALCHEMY_API_KEY = "53a800df7583acad0f0c37d3e5fad54a91e2b3ae";

var findKeywords = function(tweet, callback) {
  var params = {
    form: {
      apikey: ALCHEMY_API_KEY,
      text: getTweetString(tweet),
      outputMode: 'json'
    }
  };
  request.post(ALCHEMY_API_GET_TEXT_RANKED_KEYKORDS_URL, params, function(err, httpResponse, body) {
    if (err) {
      callback([]);
      return;
    }
    body = JSON.parse(body);
    var keywords = [];
    var keywordResponse = body.keywords;
    for (var i = 0; i < keywordResponse.length; i++) {
        keywords.push(keywordResponse[i].text);
    }
    callback(keywords);
  });
}

var saveTweetInfo = function(tweet, callback) {
  findKeywords(tweet, function(keywords) {
    tweetId = getTweetId(tweet);
    tweetString = getTweetString(tweet);
    _saveTweetInfo(tweetId, tweetString, keywords, callback);
  });
}

/*
# this function gets the keywords of any tweet
# This takes care of saving the tweet information in server temporarily for better handling
*/

var getKeywords = function(tweet, callback) {
  var tweetId = getTweetId(tweet);
  TweetModel.findOne({ tweetId: tweetId }, function (err, doc) {
    if (err || doc === null) {
      // object does not exist
      saveTweetInfo(tweet, function(err, tweetObj) {
        if (err) {
          callback(true);
        } else {
          callback(false, tweetObj.keywords);  
        }
      });
    } else {
      callback(false, doc.keywords);
    }
  }); 
};

var isRelevantTweet = function(tweet, user, callback) {
  // if a tweet is not from a news channel, always mark it relevant
  if (!isTweetFromANews(tweet)) {
    callback(true, tweet);
    return;
  }
  hasLink = doesTweetHaveLink(tweet)
  // if a tweet does not have any link - it is relevant
  if (!hasLink) {
    callback(true, tweet);
    return;
  }
  // if a tweet has a link - assuming it is from news 
  // we look at the keywords and see if the user is interested in those keywords.
  // If we find that the user is indeed interested in those keywords, we mark it relevant
  getKeywords(tweet, function(err, keywords) {
    if (err) {
      callback(false);
      return;
    }
    getNoRelevantKeywords(keywords, user, function(noRelevantKeywords) {
      var tweetRelevance = getTweetRelevance(noRelevantKeywords, keywords.length);
      console.log(getTweetString(tweet), tweetRelevance, noRelevantKeywords, keywords.length);
      if (tweetRelevance >= THRESHOLD_FOR_TWEET_RELEVANCE) {
        callback(true, tweet);
      } else {
        callback(false);
      }
    });  
  });
};

var getRelevantTweets = function(tweets, user, callback) {
  var relevantTweets = [];
  var timesToRun = tweets.length;
  if (timesToRun == 0) {
    callback(relevantTweets);
    return;
  }
  var timesRun = 0;
  for (var i = 0; i < timesToRun; i++) {
    var tweet = tweets[i];
    isRelevantTweet(tweet, user, function(isRelevant, relevantTweet) {
      if (isRelevant) {
        relevantTweets.push(relevantTweet)
      }
      timesRun++;
      if (timesRun >= timesToRun) {
        callback(relevantTweets);
        return;
      }
    });
  }
};
