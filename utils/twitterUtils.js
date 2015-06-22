var request = require('request');
var secrets = require('../config/secrets');
var Twit = require('twit');

var TweetModel = require('../models/Tweet');
var UserKeywordModel = require('../models/UserKeyword');

var _this = this;
var _ = require('lodash');

THRESHOLD_FOR_WORD_RELEVANCE = 0.5
THRESHOLD_FOR_TWEET_RELEVANCE = 0.5

// Helper functions. To move it to a different place

var getTweetId = function(tweet) {
  return tweet.id;
};

var getTweetString = function(tweet) {
  return tweet.text;
};

var getWordRelevance = function(obj) {
  var interested = obj.interested === undefined ? 0 : obj.interested;
  var skipped = obj.skipped === undefined ? 0 : obj.skipped;
  var relevance = (obj.occurence - obj.ignored) / obj.occurence;
  return relevance;
};

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
};


var getTweetRelevance = function(no_relevant_keywords, no_keywords) {
  return no_relevant_keywords/no_keywords;
};

var isTweetFromANews = function(tweet) {
  return true;
};

var doesTweetHaveLink = function(tweet) {
  return true;
};

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
};

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
    if (keywordResponse === undefined) {
      callback(keywords);
      return;
    }
    for (var i = 0; i < keywordResponse.length; i++) {
        keywords.push(keywordResponse[i].text);
    }
    callback(keywords);
  });
};

var saveTweetInfo = function(tweet, callback) {
  findKeywords(tweet, function(keywords) {
    tweetId = getTweetId(tweet);
    tweetString = getTweetString(tweet);
    _saveTweetInfo(tweetId, tweetString, keywords, callback);
  });
};

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
      callback(false, tweet);
      return;
    }
    // if there are no keywords, assume the tweet to be relevant
    if (keywords.length === 0) {
      callback(true, tweet);
      return;
    }
    getNoRelevantKeywords(keywords, user, function(noRelevantKeywords) {
      var tweetRelevance = getTweetRelevance(noRelevantKeywords, keywords.length);
      if (tweetRelevance >= THRESHOLD_FOR_TWEET_RELEVANCE) {
        callback(true, tweet);
      } else {
        callback(false, tweet);
      }
    });  
  });
};

// Main Calls

// Used to get all relevant from a set of given tweets
exports.getRelevantTweets = function(tweets, user, callback) {
  var relevantTweets = [];
  var timesToRun = tweets.length;
  if (timesToRun == 0) {
    callback(null, relevantTweets, tweets);
    return;
  }
  var timesRun = 0;
  var allTweets = []
  for (var i = 0; i < timesToRun; i++) {
    var tweet = tweets[i];
    isRelevantTweet(tweet, user, function(isRelevant, relevantTweet) {
      relevantTweet.isRelevant = false;
      if (isRelevant) {
        relevantTweet.isRelevant = true;
        relevantTweets.push(relevantTweet);
      }
      allTweets.push(relevantTweet);
      timesRun++;
      if (timesRun >= timesToRun) {
        // sorting tweets by ID
        allTweets.sort(function(a, b) {
            return b.id - a.id;
        });
        relevantTweets.sort(function(a, b) {
            return b.id - a.id;
        });
        user.maxTweetIdSeen = getTweetId(allTweets[0]);
        user.save();
        callback(null, relevantTweets, allTweets);
        return;
      }
    });
  }
};

exports.getRelevantTweetsFromTwitter = function(user, sinceId, callback) {
  var token = _.find(user.tokens, { kind: 'twitter' });
  var T = new Twit({
    consumer_key: secrets.twitter.consumerKey,
    consumer_secret: secrets.twitter.consumerSecret,
    access_token: token.accessToken,
    access_token_secret: token.tokenSecret
  });
  var params = {
    'count': 6,
  };
  if (sinceId) {
    params['since_id'] = sinceId;
  }
  T.get('statuses/home_timeline', params, function(err, reply) {
    if (err) return callback(err);
    allTweets = reply;
    _this.getRelevantTweets(allTweets, user, callback);
  });
};

var getNewUserKeyword = function(keyword, user) {
  var obj = new UserKeywordModel();
  obj.userId = user._id;
  obj.keyword = keyword;
  obj.occurence = 0;
  obj.ignored = 0;
  obj.interested = 0;
  obj.skipped = 0;
  obj.save();
  return obj;
};

exports.markInterested = function(keyword, user) {
  UserKeywordModel.findOne({keyword: keyword, userId: user._id}, function(err, doc) {
    if (err || doc === null) {
      doc = getNewUserKeyword(keyword, user);
    }
    doc.occurence += 1;
    doc.interested += 1;
    doc.save();
  });
};

exports.markConsumed = function(keyword, user) {
  UserKeywordModel.findOne({keyword: keyword, userId: user._id}, function(err, doc) {
    if (err || doc === null) {
      doc = getNewUserKeyword(keyword, user);
    }
    doc.occurence += 1;
    doc.skipped += 1;
    doc.save();
  });
};

exports.markIgnored = function(keyword, user) {
  UserKeywordModel.findOne({keyword: keyword, userId: user._id}, function(err, doc) {
    if (err || doc === null) {
      doc = getNewUserKeyword(keyword, user);
    }
    doc.occurence += 1;
    doc.ignored += 1;  
    doc.save();
  });
};

exports.markTweetIgnored = function(tweetId, user, res) {
  TweetModel.findOne({ tweetId: tweetId }, function (err, doc) {
    if (err || doc === null) {
      return;
    }
    keywords = doc.keywords;  
    for (var i = 0; i < keywords.length; i++) {
      var keyword = keywords[i];
      _this.markIgnored(keyword, user);
    }
    res.json({ keywords: keywords });
  });
};

exports.markTweetConsumed = function(tweetId, user, res) {
  TweetModel.findOne({ tweetId: tweetId }, function (err, doc) {
    if (err || doc === null) {
      return;
    }
    keywords = doc.keywords;  
    for (var i = 0; i < keywords.length; i++) {
      var keyword = keywords[i];
      _this.markConsumed(keyword, user);
    }
    res.json({ keywords: keywords });
  });
};

exports.markTweetInterested = function(tweetId, user, res) {
  TweetModel.findOne({ tweetId: tweetId }, function (err, doc) {
    if (err || doc === null) {
      return;
    }
    keywords = doc.keywords;  
    for (var i = 0; i < keywords.length; i++) {
      var keyword = keywords[i];
      _this.markInterested(keyword, user);
    }
    res.json({ keywords: keywords });
  });
};

exports.getUserKeywords = function(user, callback) {
  UserKeywordModel.find({userId: user._id}, function(err, docs) {
    if (!err && docs != null) {
      for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        doc.relevance = getWordRelevance(doc);
      }
      docs.sort(function(a, b) {
          return b.relevance - a.relevance;
      });
    }
    callback(err, docs);
  });
};
