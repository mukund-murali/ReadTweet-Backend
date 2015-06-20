var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var UserKeywordSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    keyword: String,
    occurence: Number,
    ignored: Number
});

module.exports = mongoose.model('UserKeyword', UserKeywordSchema);
