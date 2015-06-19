// models/bear.js

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var TweetKeywordSchema   = new Schema({
    tweetId: Number,
    keywords: Array,
    tweetString: String
});

module.exports = mongoose.model('Tweet', TweetKeywordSchema);