const UserRole = require("../enums/userEnum").UserRole;

class RoleCreationError extends Error {
    constructor(roleType, argName) {
        super(`Missing Arg(${argName}) while Role(${roleType}) Creation.`);
        this.name = 'RoleCreationError';
    }
}

module.exports = {
    Role: function (roleType, options) {
        if (typeof options === "undefined")
            options = {};
        else if (typeof options !== "object")
            throw new Error(`Wrong Data Type of "options" while Creating Role "${roleType}"`);
        switch (roleType) {
            case UserRole.ADMIN:
                if (!options.hasOwnProperty("stationID"))
                    throw new RoleCreationError(UserRole.ADMIN, "stationID");
                else if (!options.hasOwnProperty("manager"))
                    throw new RoleCreationError(UserRole.ADMIN, "manager");
                return Object.assign({
                    roleType,
                    stationID: options.stationID,
                    manager: options.manager
                });
            case UserRole.BOT:
                if (!options.hasOwnProperty("scopeID"))
                    throw new RoleCreationError(UserRole.BOT, "scopeID");
                return Object.assign({
                    roleType,
                    scopeID: options.scopeID
                });
            case UserRole.CLERK:
                if (!options.hasOwnProperty("storeID"))
                    throw new RoleCreationError(UserRole.CLERK, "storeID");
                else if (!options.hasOwnProperty("manager"))
                    throw new RoleCreationError(UserRole.CLERK, "manager");
                return Object.assign({
                    roleType,
                    storeID: options.storeID,
                    manager: options.manager
                });
            case UserRole.CUSTOMER:
                if (!options.hasOwnProperty("group"))
                    throw new RoleCreationError(UserRole.CUSTOMER, "group");
                return Object.assign({
                    roleType,
                    group: options.group
                });
            default:
                throw new Error(`Unknown Role Type: ${roleType}`);
        }
    },
    RoleCreationError
};