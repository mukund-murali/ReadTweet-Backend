var twitterUtils = require('../utils/twitterUtils');

exports.getKeywords = function(req, res, next) {
	twitterUtils.getUserKeywords(req.user, function(err, userKeywords) {
    if (err) return next(err);
    res.render('keywords', {
      title: 'All Keywords',
      userKeywords: userKeywords,
    });
  });
};
