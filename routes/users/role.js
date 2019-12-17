const express = require('express');
const router = express.Router();
const debug = require('../../helpers/debugger')('users/role');

const validateRequest = require('../../middlewares/validation/validateRequest').JWT;
const regAsAdminManager = require('../../middlewares/validation/validateRequest').regAsAdminManager;

const User = require('../../models/DB/userDB');

/**
 * @apiName CheckRoleExistence
 * @apiGroup Users
 * @apiPermission customer
 * 
 * @api {get} /role/checkIsExisted/:roleType Check Is the Role Existed in My RoleList
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Check Successfully
 *     { 
 *          type: 'roleMessage',
 *          roleIsExisted: Boolean 
 *     }
 * @apiUse RoleError
 */

router.get('/checkIsExisted/:roleType', validateRequest, function (req, res, next) {
    const dbUser = req._user;
    const roleTypeToCheck = req.params.roleType;
    const options = req.query;
    dbUser.roleIsExist(roleTypeToCheck, options, (err, validTask, detail) => {
        if (err) return next(err);
        if (!validTask)
            return res.status(403).json({
                code: "D???",
                type: "roleMessage",
                msg: detail
            });
        res.json({
            type: 'roleMessage',
            roleIsExisted: detail
        });
    });
});

/**
 * @apiName CheckRoleExistence
 * @apiGroup Users
 * @apiPermission admin_manager
 * 
 * @api {get} /role/checkIsExisted/:phone/:roleType Check Is the Role Existed in User's RoleList
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Check Successfully
 *     { 
 *          type: 'roleMessage',
 *          roleIsExisted: Boolean 
 *     }
 * @apiUse RoleError
 */

router.get('/checkIsExisted/:phone/:roleType', regAsAdminManager, validateRequest, function (req, res, next) {
    const userPhone = req.params.phone;
    const roleTypeToCheck = req.params.roleType;
    const options = req.query;
    User.findOne({
        "user.phone": userPhone
    }, (err, theUser) => {
        if (err)
            return next(err);
        if (!theUser)
            return res.status(403).json({
                code: "D???",
                type: "roleMessage",
                msg: `Can't Find the User: ${userPhone}`
            });
        theUser.roleIsExist(roleTypeToCheck, options, (err, validTask, detail) => {
            if (err) return next(err);
            if (!validTask)
                return res.status(403).json({
                    code: "D???",
                    type: "roleMessage",
                    msg: detail
                });
            res.json({
                type: 'roleMessage',
                roleIsExisted: detail
            });
        });
    });
});

/**
 * @apiName AddRoleToUser
 * @apiGroup Users
 * @apiPermission admin_manager
 * 
 * @api {post} /role/add/:phone Add a Role in a User's RoleList
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Check Successfully
 *     { 
 *          type: 'roleMessage',
 *          roleIsExisted: Boolean 
 *     }
 * @apiUse RoleError
 */

router.post('/add/:phone', regAsAdminManager, validateRequest, function (req, res, next) {
    const userPhone = req.params.phone;
    const roleTypeToAdd = req.body.roleType;
    const options = req.body.options;
    User.findOne({
        "user.phone": userPhone
    }, (err, theUser) => {
        if (err)
            return next(err);
        if (!theUser)
            return res.status(403).json({
                code: "D???",
                type: "roleMessage",
                msg: `Can't Find the User: ${userPhone}`
            });
        theUser.addRole(roleTypeToAdd, options, (err, validTask, detail) => {
            if (err) return next(err);
            if (!validTask)
                return res.status(403).json({
                    code: "D???",
                    type: "roleMessage",
                    msg: detail
                });
            theUser.save(err => {
                if (err) return next(err);
                res.json({
                    type: 'roleMessage',
                    roleIsExisted: detail
                });
            });
        });
    });
});

module.exports = router;