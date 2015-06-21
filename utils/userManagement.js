var commonUtils = require('./common');

var UserDeviceModel = require('../models/UserDevice');
var User = require('../models/User');

var getNewUserDeviceModel = function(userId) {
  var obj = new UserDeviceModel();
  obj.userId = userId;
  obj.deviceId = commonUtils.uniqueNumber();;
  obj.save();
  return obj;
}

exports.login = function(userId, username, authToken, authTokenSecret, req, res) {
  User.findOne({twitter: userId}, function(err, existingUser) {
    if (existingUser) {
      var userDevice = getNewUserDeviceModel(existingUser._id);
      res.json({'message': 'existingUser', 'deviceId': userDevice.deviceId});
      return;
    }
    var user = new User();
    user.email = username + "@twitter.com";
    user.twitter = userId;
    user.tokens.push({ kind: 'twitter', accessToken: authToken, tokenSecret: authTokenSecret });
    // user.profile.name = "Mukund";
    // user.profile.location = profile._json.location;
    // user.profile.picture = profile._json.profile_image_url_https;
    user.save(function(err) {
      if (err) {
        res.send(err);
        return;
      } else {
        var userDevice = getNewUserDeviceModel(user._id);
        res.json({
          'message': 'success',
          'deviceId': userDevice.deviceId
        });
      }
    });
  });
};