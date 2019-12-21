const express = require('express');
const router = express.Router();
const debug = require('../../helpers/debugger')('users/role');

const validateRequest = require('../../middlewares/validation/validateRequest').JWT;
const checkRoleIsAdmin = require('../../middlewares/validation/validateRequest').checkRoleIsAdmin;

const User = require('../../models/DB/userDB');
const UserRole = require('../../models/enums/userEnum').UserRole;

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
 * @api {put} /role/add/:phone Add a Role to a User's RoleList
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
            if (err) return next(err);
            if (!roleAdded)
                return res.status(403).json({
                    code: "D???",
                    type: "roleMessage",
                    msg: detail
                });

            let legacyRoleTypeToAdd = roleTypeToAdd; // For Legacy Role System
            if (roleTypeToAdd === UserRole.SHOP) legacyRoleTypeToAdd = UserRole.CLERK;
            else if (roleTypeToAdd === UserRole.CLEAN_STATION) legacyRoleTypeToAdd = UserRole.ADMIN;
            if (!theUser.roles[legacyRoleTypeToAdd]) { // For Legacy Role System
                theUser.roles.typeList.push(legacyRoleTypeToAdd);
                const legacyRole = Object.assign({}, roleAdded);
                delete legacyRole.roleID;
                delete legacyRole.roleType;
                theUser.roles[legacyRoleTypeToAdd] = legacyRole;
            }

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

/**
 * @apiName DeleteRoleFromUser
 * @apiGroup Users
 * @apiPermission admin_manager
 * 
 * @api {put} /role/add/:phone Delete a Role from a User's RoleList
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

router.delete('/deleteByCondition/:phone', checkRoleIsAdmin(), validateRequest, function (req, res, next) {
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
        theUser.addRole(roleTypeToDelete, options, (err, roleDelete, detail) => {
            if (err) return next(err);
            if (!roleDelete)
                return res.status(403).json({
                    code: "D???",
                    type: "roleMessage",
                    msg: detail
                });

            let legacyRoleTypeToDelete = roleTypeToDelete; // For Legacy Role System
            if (roleTypeToDelete === UserRole.SHOP) legacyRoleTypeToDelete = UserRole.CLERK;
            else if (roleTypeToDelete === UserRole.CLEAN_STATION) legacyRoleTypeToDelete = UserRole.ADMIN;
            if (!theUser.roles[legacyRoleTypeToDelete]) {
                let indexOfLegacyRoleTypeToDelete = theUser.roles.typeList.indexOf(legacyRoleTypeToDelete)
                if (indexOfLegacyRoleTypeToDelete !== -1)
                    theUser.roles.typeList.splice(indexOfLegacyRoleTypeToDelete, 1);
                theUser.roles[legacyRoleTypeToDelete] = undefined;
            }

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