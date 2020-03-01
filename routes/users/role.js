const express = require('express');
const router = express.Router();
const debug = require('../../helpers/debugger')('users/role');

const validateRequest = require('../../middlewares/validation/authorization/validateRequest').JWT;
const checkRoleIsAdmin = require('../../middlewares/validation/authorization/validateRequest').checkRoleIsAdmin;

const User = require('../../models/DB/userDB');

/**
 * @apiName CheckRoleExistence
 * @apiGroup Users
 * @apiPermission customer
 * 
 * @api {get} /role/checkIsExisted/:roleType Check Is the Role Existed in My RoleList
 * @apiParam {...} Use para to check if an para is in Role. eg. manager:Boolean
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
        if (err)
            return res.status(403).json({
                code: "D???",
                type: "roleMessage",
                msg: err.message
            });
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
 * @apiParam {...} Use para to check if an para is in Role. eg. manager:Boolean
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

router.get('/checkIsExisted/:phone/:roleType', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
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
            if (err)
                return res.status(403).json({
                    code: "D???",
                    type: "roleMessage",
                    msg: err.message
                });
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
 * @api {put} /role/add/:phone Add a Role to a User's RoleList
 * @apiParam {options} Provide needed para for Role creation as a Object. eg. manager:Boolean
 * @apiParamExample {json} Request-Example:
    {
        options : {
            manager: true
        }
    }
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Check Successfully
 *     { 
 *          type: 'roleMessage',
 *          result: Boolean 
 *     }
 * @apiUse RoleError
 */

router.put('/add/:phone', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
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
        theUser.addRole(roleTypeToAdd, options, (err, roleAdded, detail) => {
            if (err)
                return res.status(403).json({
                    code: "D???",
                    type: "roleMessage",
                    msg: err.message
                });
            if (!roleAdded)
                return res.status(403).json({
                    code: "D???",
                    type: "roleMessage",
                    msg: detail
                });
            theUser.save(err => {
                if (err) return next(err);
                res.json({
                    type: 'roleMessage',
                    result: detail
                });
            });
        });
    });
});

/**
 * @apiName DeleteRoleFromUser
 * @apiGroup Users
 * @apiPermission admin_manager
 * 
 * @api {put} /role/remove/:phone Delete a Role from a User's RoleList
 * @apiParam {options} Provide needed para to find the Role for deletion. eg. manager:Boolean
 * @apiParamExample {json} Request-Example:
    {
        options : {
            manager: true,
            stationID: 0
        }
    }
 * @apiUse JWT
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 Check Successfully
 *     { 
 *          type: 'roleMessage',
 *          result: Boolean 
 *     }
 * @apiUse RoleError
 */

router.delete('/remove/:phone', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
    const userPhone = req.params.phone;
    const roleTypeToDelete = req.body.roleType;
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
        theUser.removeRole(roleTypeToDelete, options, (err, roleDelete, detail) => {
            if (err)
                return res.status(403).json({
                    code: "D???",
                    type: "roleMessage",
                    msg: err.message
                });
            if (!roleDelete)
                return res.status(403).json({
                    code: "D???",
                    type: "roleMessage",
                    msg: detail
                });
            theUser.save(err => {
                if (err) return next(err);
                res.json({
                    type: 'roleMessage',
                    result: detail
                });
            });
        });
    });
});

module.exports = router;