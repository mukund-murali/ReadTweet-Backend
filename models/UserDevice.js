var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var UserDeviceSchema   = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    deviceId: Number,
    maxTweetIdSeen: Number
});

module.exports = mongoose.model('UserDevice', UserDeviceSchema);
