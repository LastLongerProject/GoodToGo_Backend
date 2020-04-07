const uuid = require('uuid/v4');
const RoleType = require("../enums/userEnum").RoleType;
const RoleElement = require("../enums/userEnum").RoleElement;
const DataCacheFactory = require("../dataCacheFactory");

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

class NullButNotNullable extends Error {
    constructor(eleName, eleValue) {
        super(`Element(${eleName}) is EleValue(${eleValue}).`);
        this.name = 'NullButNotNullable';
    }
}

module.exports = {
    Role: function (roleType, options) {
        if (typeof options === "undefined")
            options = {};
        else if (typeof options !== "object")
            throw new Error(`Wrong Data Type of "options" while Creating Role "${roleType}"`);
        let theRole = {
            roleID: options.roleID || uuid(),
            roleType
        };
        if (options.extraArg) Object.assign(theRole, options.extraArg);
        switch (roleType) {
            case RoleType.CLEAN_STATION:
                if (!options.hasOwnProperty(RoleElement.STATION_ID))
                    throw new RoleCreationError(RoleCreationError.missingArg(RoleType.CLEAN_STATION, RoleElement.STATION_ID));
                else if (!options.hasOwnProperty(RoleElement.MANAGER))
                    options.manager = false;
                else if (typeof options.manager !== "boolean") {
                    if (options.manager !== "true" && options.manager !== "false")
                        throw new RoleCreationError(RoleCreationError.argInvalid(RoleType.CLEAN_STATION, RoleElement.MANAGER, options.manager));
                    else
                        options.manager = options.manager === "true";
                }
                var stationID = parseInt(options.stationID);
                if (isNaN(stationID))
                    throw new RoleCreationError(RoleCreationError.argInvalid(RoleType.CLEAN_STATION, RoleElement.STATION_ID, stationID));
                Object.assign(theRole, {
                    stationID,
                    manager: options.manager
                });
                break;
            case RoleType.BOT:
                if (!options.hasOwnProperty(RoleElement.SCOPE_ID))
                    throw new RoleCreationError(RoleCreationError.missingArg(RoleType.BOT, RoleElement.SCOPE_ID));
                var scopeID = parseInt(options.scopeID);
                if (isNaN(scopeID))
                    throw new RoleCreationError(RoleCreationError.argInvalid(RoleType.BOT, RoleElement.SCOPE_ID, scopeID));
                var rentFromStoreID = null;
                if (options.hasOwnProperty(RoleElement.RETURN_TO_STORE_ID) && options.rentFromStoreID !== null) {
                    rentFromStoreID = parseInt(options.rentFromStoreID);
                    if (isNaN(rentFromStoreID))
                        throw new RoleCreationError(RoleCreationError.argInvalid(RoleType.BOT, RoleElement.RENT_FROM_STORE_ID, rentFromStoreID));
                }
                var returnToStoreID = null;
                if (options.hasOwnProperty(RoleElement.RETURN_TO_STORE_ID) && options.returnToStoreID !== null) {
                    returnToStoreID = parseInt(options.returnToStoreID);
                    if (isNaN(returnToStoreID))
                        throw new RoleCreationError(RoleCreationError.argInvalid(RoleType.BOT, RoleElement.RETURN_TO_STORE_ID, returnToStoreID));
                }
                var reloadToStationID = null;
                if (options.hasOwnProperty(RoleElement.RELOAD_TO_STATION_ID) && options.reloadToStationID !== null) {
                    reloadToStationID = parseInt(options.reloadToStationID);
                    if (isNaN(reloadToStationID))
                        throw new RoleCreationError(RoleCreationError.argInvalid(RoleType.BOT, RoleElement.RELOAD_TO_STATION_ID, reloadToStationID));
                }
                Object.assign(theRole, {
                    scopeID,
                    rentFromStoreID,
                    returnToStoreID,
                    reloadToStationID
                });
                break;
            case RoleType.STORE:
                if (!options.hasOwnProperty(RoleElement.STORE_ID))
                    throw new RoleCreationError(RoleCreationError.missingArg(RoleType.STORE, RoleElement.STORE_ID));
                else if (!options.hasOwnProperty(RoleElement.MANAGER))
                    options.manager = false;
                else if (typeof options.manager !== "boolean") {
                    if (options.manager !== "true" && options.manager !== "false")
                        throw new RoleCreationError(RoleCreationError.argInvalid(RoleType.STORE, RoleElement.MANAGER, options.manager));
                    else
                        options.manager = options.manager === "true";
                }
                var storeID = parseInt(options.storeID);
                if (isNaN(storeID))
                    throw new RoleCreationError(RoleCreationError.argInvalid(RoleType.STORE, RoleElement.STORE_ID, storeID));
                Object.assign(theRole, {
                    storeID,
                    manager: options.manager
                });
                break;
            case RoleType.CUSTOMER:
                if (!options.hasOwnProperty(RoleElement.CUSTOMER_GROUP))
                    throw new RoleCreationError(RoleCreationError.missingArg(RoleType.CUSTOMER, RoleElement.CUSTOMER_GROUP));
                var group = options.group;
                if (typeof group !== "string")
                    throw new RoleCreationError(RoleCreationError.argInvalid(RoleType.CUSTOMER, RoleElement.CUSTOMER_GROUP, group));
                Object.assign(theRole, {
                    group
                });
                break;
            case RoleType.ADMIN:
                var asStoreID = null;
                if (options.hasOwnProperty(RoleElement.AS_STORE_ID) && options.asStoreID !== null) {
                    asStoreID = parseInt(options.asStoreID);
                    if (isNaN(asStoreID))
                        throw new RoleCreationError(RoleCreationError.argInvalid(RoleType.ADMIN, RoleElement.AS_STORE_ID, asStoreID));
                }
                var asStationID = null;
                if (options.hasOwnProperty(RoleElement.AS_STATION_ID) && options.asStationID !== null) {
                    asStationID = parseInt(options.asStationID);
                    if (isNaN(asStationID))
                        throw new RoleCreationError(RoleCreationError.argInvalid(RoleType.ADMIN, RoleElement.AS_STATION_ID, asStationID));
                }
                Object.assign(theRole, {
                    asStoreID,
                    asStationID
                });
                break;
            default:
                throw new Error(`Unknown Role Type: ${roleType}`);
        }
        Object.assign(theRole, {
            getElement: (eleName, nullable) => getElement(this, eleName, nullable)
        });
        Object.assign(this, theRole);
        return this;
    },
    RoleCreationError,
    getElement
};

function getElement(theRole, eleName, nullable = true) {
    const done = result => {
        if (typeof result === "undefined" || result === null) {
            if (!nullable) throw new NullButNotNullable(eleName, result);
            else return null;
        } else return result;
    };
    switch (eleName) {
        case RoleElement.STORE_ID:
            if (theRole.roleType !== RoleType.STORE) return done(null);
            return done(theRole[RoleElement.STORE_ID]);
        case RoleElement.STATION_ID:
            if (theRole.roleType !== RoleType.CLEAN_STATION) return done(null);
            return done(theRole[RoleElement.STATION_ID]);
        case RoleElement.STORE_NAME:
            if (theRole.roleType !== RoleType.STORE) return done(null);
            var storeDict = DataCacheFactory.get(DataCacheFactory.keys.STORE);
            var theStore = storeDict[theRole[RoleElement.STORE_ID]];
            if (theStore) return done(theStore.name);
            else return done("找不到店家");
        case RoleElement.STATION_NAME:
            if (theRole.roleType !== RoleType.CLEAN_STATION) return done(null);
            var stationDict = DataCacheFactory.get(DataCacheFactory.keys.STATION);
            var theStation = stationDict[theRole[RoleElement.STATION_ID]];
            if (theStation) return done(theStation.name);
            else return done("找不到調度站");
        case RoleElement.STATION_BOXABLE:
            if (theRole.roleType !== RoleType.CLEAN_STATION) return done(null);
            var stationDict = DataCacheFactory.get(DataCacheFactory.keys.STATION);
            var theStation = stationDict[theRole[RoleElement.STATION_ID]];
            if (theStation) return done(theStation.boxable);
            else return done("找不到調度站");
        case RoleElement.MANAGER:
            if (theRole.roleType !== RoleType.CLEAN_STATION && theRole.roleType !== RoleType.STORE) return done(null);
            return done(theRole[RoleElement.MANAGER]);
        case RoleElement.CUSTOMER_GROUP:
            if (theRole.roleType !== RoleType.CUSTOMER) return done(null);
            return done(theRole[RoleElement.CUSTOMER_GROUP]);
        case RoleElement.RETURN_TO_STORE_ID:
            if (theRole.roleType !== RoleType.BOT) return done(null);
            return done(theRole[RoleElement.RETURN_TO_STORE_ID]);
        case RoleElement.RENT_FROM_STORE_ID:
            if (theRole.roleType !== RoleType.BOT) return done(null);
            return done(theRole[RoleElement.RENT_FROM_STORE_ID]);
        default:
            return done(null);
    }
}