const express = require('express');
const router = express.Router();
const debug = require('../../helpers/debugger')('containers/get');

const validateDefault = require('../../middlewares/validation/authorization/validateDefault');

const baseUrl = require('../../config/config.js').serverUrl;

const DataCacheFactory = require("../../models/dataCacheFactory");

const wetag = require('../../helpers/toolkit').wetag;
const intReLength = require('../../helpers/toolkit').intReLength;

/**
 * @apiName Containers get list 
 * @apiGroup Containers
 *
 * @api {get} /containers/get/list Get list 
 * 
 * @apiUse DefaultSecurityMethod
 * @apiHeader If-None-Match : // ‘Etag’ header value from last /stores/list response
 * 
 * @apiSuccessExample {json} Success-Response:
        HTTP/1.1 200 
        {
            "containerType" : [
                {
                    typeCode : Number, // 0
                    name : String, // 12oz 玻璃杯
                    version : Number,
                    icon : {
                        "1x": "https://app.goodtogo.tw/images/icon/00_1x?ver={String}",
                        "2x": "https://app.goodtogo.tw/images/icon/00_2x?ver={String}",
                        "3x": "https://app.goodtogo.tw/images/icon/00_3x?ver={String}"
                    }
                }, ...
            ],
            "containerDict": {
                "1": "12oz 玻璃杯",...
            }
        }
 *
 */
router.get('/list', validateDefault, function (req, res, next) {
    var typeDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_TYPE);
    var containerDict = DataCacheFactory.get(DataCacheFactory.keys.CONTAINER_ONLY_ACTIVE);
    var tmpIcon;
    var tmpArr = [];
    res.set('etag', wetag([containerDict, typeDict]));
    for (var aType in typeDict) {
        tmpIcon = {};
        for (var j = 1; j <= 3; j++) {
            tmpIcon[j + 'x'] = `${baseUrl}/images/icon/${intReLength(typeDict[aType].typeCode, 2)}_${j}x?ver=${typeDict[aType].version}`;
        }
        tmpArr.push({
            typeCode: typeDict[aType].typeCode,
            name: typeDict[aType].name,
            version: typeDict[aType].version,
            icon: tmpIcon
        });
    }
    var resJSON = {
        containerType: tmpArr,
        containerDict: containerDict
    };
    res.json(resJSON);
});

module.exports = router;