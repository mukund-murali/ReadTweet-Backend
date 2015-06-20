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
