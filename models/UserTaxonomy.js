var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var UserTaxonomySchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    taxonomy: String,
    occurence: Number,
    ignored: Number,
    skipped: Number,
    interested: Number
});

module.exports = mongoose.model('UserTaxonomy', UserTaxonomySchema);
