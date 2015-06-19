'''
Problem: 

Use case 1:
I follow TechCrunch, Mashable, TheVerge. They carry a lot of news. But I may not be interested in all tech news.
Lets say i dont want to read any news about startups or any news about IBM because i hate IBM.
I waste time reading tweets about IBM. If it is a lot more things i dont like, I actually waste more time than useful time. 

So, basically taking out unwanted stuff from the tweet timeline. 

Use case 2:
Since i follow the three channels, They are more likely to report to same news. which also wastes my time. 
So I should only be shown one best news if multiple channels i follow report the same news. 


Flow:
	1. getNewTweets
		- gets tweets after a particular timestamp from twitter server. categorizes relevant tweets. 
		  send relevant tweets and all tweets as response. 
	2. Result from the above function is shown as two tabs to user. 
	3. Feedback from user - Tweet is either marked as consumed or ignored.
	    - To mark a tweet as ignored - markIgnored
	    	1. User can swipe a tweet to mark it explicitly useless
	    	2. if a user does not click a tweet with a link. (this has to be worked upon properly)
	    - mark a tweet a consumed - markConsumed
	    	Any tweet that does not satisfy ignore condition is marked as consumed

Models:
	1. UserKeywordRelationship - {
		'user': 1,
		'keyword': 'google',
		'occurence': 10,
		'ignored': 5,
	}
	2. Tweet - {
		'tweet_id': 1,
		'keywords': ['google', 'apple']
	}
'''

markIgnored(keyword, user) {
	object = getObject(keyword, user);
	object.occurence += 1;
	object.ignored += 1;
}

markConsumed(keyword, user) {
	object = getObject(keyword, user);
	object.occurence += 1;
}

THRESHOLD_FOR_WORD_RELEVANCE = 0.5 

getWordRelevance(object) {
	return object.ignored / object.occurence;
}

isRelevantKeyword(keyword, user) {
	object = getObject(keyword, user);
	if (getWordRelevance(object) > THRESHOLD_FOR_WORD_RELEVANCE) {
		return True;
	}
	return False; 
}

THRESHOLD_FOR_TWEET_RELEVANCE = 0.5


getTweetRelevance(no_relevant_keywords, no_keywords) {
	return no_relevant_keywords/no_keywords;
}

isTweetFromANews(tweet) {
	return True;
}

doesTweetHaveLink(tweet) {
	return True;
}

isRelevantTweet(tweet, user) {
	''' if a tweet is not from a news channel, always mark it relevant
		if a tweet does not have any link - it is relevant
		if a tweet has a link - assuming it is from news 
		we look at the keywords and see if the user is interested in those keywords.
			If we find that the user is indeed interested in those keywords, we mark it relevant
	'''
	if (!isTweetFromANews(tweet)) {
		return True;
	}
	has_link = doesTweetHaveLink(tweet)
	if (!has_link) {
		return True;
	}
	keywords = getKeywords(tweet);
	no_relevant_keywords = 0;
	for (keyword in keywords) {
		if (isRelevantKeyword(keyword, user)) {
			no_relevant_keywords++;
		}
	}
	tweet_relevance = getTweetRelevance(no_relevant_keywords, len(keywords))
	if (tweet_relevance > THRESHOLD_FOR_TWEET_RELEVANCE) {
		return True;
	}
	return False;
}

markTweetIgnored(tweet, user) {
	keywords = getKeywords(tweet);
	for (keyword in keywords) {
		markIgnored(keyword, user);
	}
}

markTweetConsumed(tweet, user) {
	keywords = getKeywords(tweet);
	for (keyword in keywords) {
		markConsumed(keyword, user);
	}
}

# probably store tweetId and its keywords temporarily to avoid alchemy API calls 
# since same tweet could be referenced by multiple users multiple times 
# Two days would be a reasonable no. days to store. - Should research on the no. days a tweet is usually refenced.

KEY_TWEET_ID = 'tweet_id'
KEY_TWEET_KEYWORDS = 'keywords'

# before using any tweet for any processing, save the tweet data temporarily. 
# this saves all the required information in a temporary database for faster retreival in the future. 
saveTweetInfo(tweet_id, keywords) {
	# tweets is a mongo db collection.
	return tweets.create({
		KEY_TWEET_ID: tweet_id,
		KEY_TWEET_KEYWORDS: keywords
	})
}

saveTweetInfo(tweet) {
	keywords = findKeywords(tweet)
	tweet_id = getTweetId(tweet)
	obj = saveTweetInfo(tweet_id, keywords)
	return obj
}

getTweetId(tweet) {
	return tweet['id']; # change the id to whatever is sent by twitter API response
}

# this function gets the keywords of any tweet
# This takes care of saving the tweet information in server temporarily for better handling
getKeywords(tweet) {
	tweet_id = getTweetId(tweet)
	tweet_obj = tweets.get({KEY_TWEET_ID: tweet_id})
	if (tweet_obj is None) {
		# tweet information not available in the database
		tweet_obj = saveTweetInfo(tweet)
	}
	keywords = tweet_obj[KEY_TWEET_KEYWORDS]
	return keywords;
}

getNewTweets(timestamp) {
	tweets = getTweetsFromTwitter(timestamp);
	all_tweets = tweets
	relevant_tweets = []
	for (tweet in tweets) {
		if (isRelevantTweet(tweet)) {
			relevant_tweets.append(tweet)
		}
	}
	return (all_tweets, relevant_tweets)
}
