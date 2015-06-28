var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var TweetKeywordSchema   = new Schema({
    tweetId: Number,
    keywords: Array,
    tweetString: String,
    taxonomies: Array
});

module.exports = mongoose.model('Tweet', TweetKeywordSchema);
