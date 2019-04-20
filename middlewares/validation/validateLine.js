const User = require('../../models/DB/userDB'); // load up the user model

module.exports = {
    forPurchasedUser: function (req, res, next) {
        if (!req._user.hasPurchase)
            return res.status(403).json({
                code: 'L008',
                type: 'couponTradeMessage',
                message: `Please Purchase First`,
                txt: "該功能限鐵粉會員使用"
            });
        next();
    },
    liff: function (req, res, next) {
        const lineId = req.headers['line-id'];
        if (!lineId)
            return res.status(401).json({
                code: 'B001',
                type: 'validatingUser',
                message: 'lineId undefined'
            });

        User.findOne({
            "user.line_liff_userID": lineId
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
            next();
        });
    },
    channel: function (req, res, next) {
        const lineId = req.headers['line-id'];
        if (!lineId)
            return res.status(401).json({
                code: 'B001',
                type: 'validatingUser',
                message: 'lineId undefined'
            });

        User.findOne({
            "user.line_channel_userID": lineId
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
            next();
        });
    }
};