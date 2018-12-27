function makeHexString() {
    var text = '';
    var possible = 'ABCDEF0123456789';

    for (var i = 0; i < 10; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

exports.makeHexString = makeHexString;