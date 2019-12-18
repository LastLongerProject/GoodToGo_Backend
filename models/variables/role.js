const uuid = require('uuid/v4');
const UserRole = require("../enums/userEnum").UserRole;

class RoleCreationError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'RoleCreationError';
    }
    static missingArg(roleType, argName) {
        return `Missing Arg(${argName}) while Role(${roleType}) Creation.`;
    }
    static argInvalid(roleType, argName, arg) {
        return `Arg(${argName}:${arg}) is Invalid while Role(${roleType}) Creation.`;
    }
}

module.exports = {
    Role: function (roleType, options) {
        if (typeof options === "undefined")
            options = {};
        else if (typeof options !== "object")
            throw new Error(`Wrong Data Type of "options" while Creating Role "${roleType}"`);
        let theRole = {
            roleID: uuid(),
            roleType
        };
        if (options.extraArg) Object.assign(theRole, options.extraArg);
        switch (roleType) {
            case UserRole.ADMIN:
                if (!options.hasOwnProperty("stationID"))
                    throw new RoleCreationError(RoleCreationError.missingArg(UserRole.ADMIN, "stationID"));
                else if (!options.hasOwnProperty("manager"))
                    options.manager = false;
                else if (typeof options.manager !== "boolean") {
                    if (options.manager !== "true" && options.manager !== "false")
                        throw new RoleCreationError(RoleCreationError.argInvalid(UserRole.ADMIN, "manager", options.manager));
                    else
                        options.manager = options.manager === "true";
                }
                var stationID = parseInt(options.stationID);
                if (isNaN(stationID))
                    throw new RoleCreationError(RoleCreationError.argInvalid(UserRole.ADMIN, "stationID", stationID));
                return Object.assign(theRole, {
                    stationID,
                    manager: options.manager
                });
            case UserRole.BOT:
                if (!options.hasOwnProperty("scopeID"))
                    throw new RoleCreationError(RoleCreationError.missingArg(UserRole.BOT, "scopeID"));
                var scopeID = parseInt(options.scopeID);
                if (isNaN(scopeID))
                    throw new RoleCreationError(RoleCreationError.argInvalid(UserRole.BOT, "scopeID", scopeID));
                var returnToStoreID;
                if (options.hasOwnProperty("returnToStoreID")) {
                    returnToStoreID = parseInt(options.returnToStoreID);
                    if (isNaN(returnToStoreID))
                        throw new RoleCreationError(RoleCreationError.argInvalid(UserRole.BOT, "returnToStoreID", returnToStoreID));
                }
                var reloadToStationID;
                if (options.hasOwnProperty("reloadToStationID")) {
                    reloadToStationID = parseInt(options.reloadToStationID);
                    if (isNaN(reloadToStationID))
                        throw new RoleCreationError(RoleCreationError.argInvalid(UserRole.BOT, "reloadToStationID", returnToStoreID));
                }
                return Object.assign(theRole, {
                    scopeID,
                    returnToStoreID,
                    reloadToStationID
                });
            case UserRole.CLERK:
                if (!options.hasOwnProperty("storeID"))
                    throw new RoleCreationError(RoleCreationError.missingArg(UserRole.CLERK, "storeID"));
                else if (!options.hasOwnProperty("manager"))
                    options.manager = false;
                else if (typeof options.manager !== "boolean") {
                    if (options.manager !== "true" && options.manager !== "false")
                        throw new RoleCreationError(RoleCreationError.argInvalid(UserRole.CLERK, "manager", options.manager));
                    else
                        options.manager = options.manager === "true";
                }
                var storeID = parseInt(options.storeID);
                if (isNaN(storeID))
                    throw new RoleCreationError(RoleCreationError.argInvalid(UserRole.CLERK, "storeID", storeID));
                return Object.assign(theRole, {
                    storeID,
                    manager: options.manager
                });
            case UserRole.CUSTOMER:
                if (!options.hasOwnProperty("group"))
                    throw new RoleCreationError(RoleCreationError.missingArg(UserRole.CUSTOMER, "group"));
                var group = options.group;
                if (typeof group !== "string")
                    throw new RoleCreationError(RoleCreationError.argInvalid(UserRole.CUSTOMER, "group", group));
                return Object.assign(theRole, {
                    group
                });
            default:
                throw new Error(`Unknown Role Type: ${roleType}`);
        }
    },
    RoleCreationError
};