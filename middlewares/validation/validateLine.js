const User = require('../../models/DB/userDB'); // load up the user model

module.exports = function (req, res, next) {
    const lineId = req.headers['line-id'];
    if (!lineId)
        return res.status(401).json({
            code: 'B001',
            type: 'validatingUser',
            message: 'lineId undefined'
        });

    User.find({
        "user.lineId": lineId
    }, function (err, dbUser) {
        if (err)
            return next(err);
        if (!dbUser)
            return res.status(401).json({
                code: 'B002',
                type: 'validatingUser',
                message: 'User not Found'
            });
        if (!dbUser.hasVerified || !dbUser.agreeTerms)
            return res.status(401).json({
                code: 'B004',
                type: 'validatingUser',
                message: 'User hasn\'t verify'
            });
        req._user = dbUser;
    });
};