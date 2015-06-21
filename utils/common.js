var previous = 0;

exports.uniqueNumber = function() {
    var date = Date.now();
    // If created at same millisecond as previous
    if (date <= previous) {
        date = ++previous;
    } else {
        previous = date;
    }
    return date;
};
