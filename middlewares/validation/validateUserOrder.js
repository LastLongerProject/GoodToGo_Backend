const DataCacheFactory = require('../../models/dataCacheFactory');

const storeCodeValidater = /\d{4}/;

function isValidStoreCode(storeCode) {
    const StoreDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
    const storeID = parseInt(storeCode.substring(0, 3));
    return (getCheckCode(storeID) === parseInt(storeCode.substring(3, 4)) &&
        StoreDict[storeID]);
}

function getCheckCode(storeID) {
    return (parseInt(storeID / 100) % 10 * 1 + parseInt(storeID / 10) % 10 * 2 + parseInt(storeID / 1) % 10 * 3) % 10;
}

module.exports = {
    storeCode: (req, res, next) => {
        const storeCode = req.body.storeCode || req.params.storeCode || req.query.storeCode

        if (typeof storeCode !== "string" || !storeCodeValidater.test(storeCode))
            return res.status(403).json({
                code: 'L002',
                type: 'userOrderMessage',
                message: `Content not in Correct Format.\n` +
                    `StoreCode: ${storeCode}, ContainerAmount: ${containerAmount}`,
                txt: "系統維修中>< 請稍後再試！"
            });

        if (!isValidStoreCode(storeCode))
            return res.status(403).json({
                code: 'L003',
                type: 'userOrderMessage',
                message: `StoreCode not Correct`,
                txt: "店舖代碼錯誤，請輸入正確店舖代碼！"
            });

        req._storeID = parseInt(storeCode.substring(0, 3));
        
        next()
    }
}