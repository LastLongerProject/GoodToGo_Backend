var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
const Role = require("../variables/role").Role;
const RoleCreationError = require("../variables/role").RoleCreationError;
const UserRole = require("../enums/userEnum").UserRole;

// define the schema for our user model
var schema = mongoose.Schema({
    user: {
        phone: String,
        password: {
            type: String,
            default: null
        },
        name: {
            type: String,
            default: null
        },
        lineId: String,
        line_liff_userID: String,
        line_channel_userID: String
    },
    role: {
        typeCode: String,
        storeID: Number,
        stationID: Number,
        scopeID: Number,
        manager: Boolean
    },
    roles: {
        typeList: [],
        customer: Object,
        clerk: Object,
        admin: Object,
        bot: Object
    },
    roleList: [],
    pushNotificationArn: Object,
    registerTime: {
        type: Date,
        default: Date.now
    },
    registerMethod: {
        type: String,
        default: "default"
    },
    active: {
        type: Boolean,
        default: true
    },
    agreeTerms: {
        type: Boolean,
        default: false
    },
    hasVerified: {
        type: Boolean,
        default: false
    },
    hasBanned: {
        type: Boolean,
        default: false
    },
    hasPurchase: {
        type: Boolean,
        default: false
    },
    point: {
        type: Number,
        default: 0
    },
    bannedTimes: {
        type: Number,
        default: 0
    }
}, {
    usePushEach: true
});

schema.index({
    "user.phone": 1
});

schema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

schema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.user.password);
};

const PurchaseStatus = require('../enums/userEnum').PurchaseStatus;

schema.methods.getPurchaseStatus = function () {
    return this.hasPurchase ?
        PurchaseStatus.PURCHASED_USER :
        PurchaseStatus.FREE_USER;
};

schema.methods.getBannedTxt = function (action) {
    return `${this.bannedTimes <= 1?
        `您有容器逾期未歸還，請儘速歸還，不然無法借用容器、領取或使用優惠券喲！` :
        `您已被停權，無法${action}！\n欲解除停權，請私訊好盒器粉專。`}`;
};

schema.methods.checkPermission = function (role_id) {
    for (let index in this.roleList) {
        if (this.roleList[index]._id.equals(role_id)) return true;
    }
    return false;
};

schema.methods.addRole = function (roleType, options, cb) {
    let newRole;
    try {
        newRole = new Role(roleType, options);
    } catch (error) {
        if (error instanceof RoleCreationError) return cb(null, false, error.message);
        else cb(error);
    }
    let roleIsModified = false;
    for (let index in this.roleList) {
        const aOldRole = this.roleList[index];
        if (aOldRole.roleType === newRole.roleType) {
            switch (aOldRole.roleType) {
                case UserRole.ADMIN:
                    if (aOldRole.stationID === newRole.stationID && aOldRole.manager !== newRole.manager) {
                        aOldRole.manager = newRole.manager;
                        this.markModified('roleList');
                        roleIsModified = true;
                    } else return cb(null, false, "The Role Already exist");
                    break;
                case UserRole.CLERK:
                    if (aOldRole.storeID === newRole.storeID && aOldRole.manager !== newRole.manager) {
                        aOldRole.manager = newRole.manager;
                        this.markModified('roleList');
                        roleIsModified = true;
                    } else return cb(null, false, "The Role Already exist");
                    break;
                case UserRole.CUSTOMER:
                    if (aOldRole.group === newRole.group) return cb(null, false, "The Role Already exist");
                    break;
                case UserRole.BOT:
                    if (aOldRole.scopeID === newRole.scopeID) return cb(null, false, "The Role Already exist");
                    break;
            }
        }
    }
    if (!roleIsModified) this.roleList.push(newRole);
    cb(null, true, "Role Added");
};

schema.methods.removeRole = function (roleType, options, cb) {
    let roleToDelete;
    try {
        roleToDelete = new Role(roleType, options);
    } catch (error) {
        if (error instanceof RoleCreationError) return cb(null, false, error.message);
        else cb(error);
    }
    let indexOfRoleToDelete = -1;
    for (let index in this.roleList) {
        const aOldRole = this.roleList[index];
        if (indexOfRoleToDelete !== -1) break;
        if (aOldRole.roleType === roleToDelete.roleType) {
            switch (aOldRole.roleType) {
                case UserRole.ADMIN:
                    if (aOldRole.stationID === roleToDelete.stationID && aOldRole.manager === roleToDelete.manager) indexOfRoleToDelete = index;
                    break;
                case UserRole.CLERK:
                    if (aOldRole.storeID === roleToDelete.storeID && aOldRole.manager === roleToDelete.manager) indexOfRoleToDelete = index;
                    break;
                case UserRole.BOT:
                    if (aOldRole.group === roleToDelete.group) indexOfRoleToDelete = index;
                    break;
                case UserRole.CUSTOMER:
                    if (aOldRole.scopeID === roleToDelete.scopeID) indexOfRoleToDelete = index;
                    break;
            }
        }
    }
    if (indexOfRoleToDelete === -1) return cb(null, false, "Can't Find that Role");
    this.roleList.splice(indexOfRoleToDelete, 1);
    cb(null, true, "Role Deleted");
};

schema.methods.roleIsExist = function (roleType, options, cb) {
    let roleToCheck;
    try {
        roleToCheck = new Role(roleType, options);
    } catch (error) {
        if (error instanceof RoleCreationError) return cb(null, false, error.message);
        else cb(error);
    }
    return cb(null, true, roleIsExist(this.roleList, roleToCheck));
};

function roleIsExist(roleList, roleToCheck) {
    for (let index in roleList) {
        const aOldRole = roleList[index];
        if (aOldRole.roleType === roleToCheck.roleType) {
            switch (aOldRole.roleType) {
                case UserRole.ADMIN:
                    if (aOldRole.stationID === roleToCheck.stationID && aOldRole.manager === roleToCheck.manager) return true;
                    break;
                case UserRole.CLERK:
                    if (aOldRole.storeID === roleToCheck.storeID && aOldRole.manager === roleToCheck.manager) return true;
                    break;
                case UserRole.BOT:
                    if (aOldRole.group === roleToCheck.group) return true;
                    break;
                case UserRole.CUSTOMER:
                    if (aOldRole.scopeID === roleToCheck.scopeID) return true;
                    break;
            }
        }
    }
    return false;
}

// create the model for users and expose it to our app
module.exports = mongoose.model('User', schema);