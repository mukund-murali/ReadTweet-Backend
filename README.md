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

Android database:

tweet_id(primary_key),
tweet_JSON,
skipped,
ignored,
interested,
tis_synced

once a row is synced, mark is_synced=0 and set all values to 0.
Until then, keep incrementing them locally and send them all in one shot. 

Create an API which accepts
tweet_info = {
	tweet_id: x,
	skipped: y,
	ignroed: z,
	interested: a
}

Also create an api which accepts an array of tweet responses 
tweets_feedback = [tweet_info]

Don't make API calls from android for each and every feedback, send them in a batch every x seconds or when user exists the page or define events for this.

When user exits the app will be a better place since we don't expect immediate feedback anyway. 

One issue if we send every x seconds is, during the time the api call is made, user feedback could give feedback to a tweet. 

Way to handle this:
Save all tweet information that are being sent in API call locally in the service as List.
Based on response, 
if success, new_skipped = db_skipped - api_call_skipped, save new_skipped in db.
if failure, do not change db_skipped. 

If we follow above method, is_synced is not even needed. Think this through during implementation.

To sync, take all tweets with skipped>0 or ignored>0 or interested>0;

Measure size it takes to store locally for one tweet. Have a threshold of number of tweets to store in db.

Maybe 100? 
