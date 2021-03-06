module.exports = Object.freeze({
    RoleType: Object.freeze({
        CLERK: "clerk",
        ADMIN: "admin",
        CUSTOMER: "customer",
        BOT: "bot",
        STORE: "store",
        CLEAN_STATION: "station"
    }),
    RoleElement: Object.freeze({
        STORE_CATEGORY: 'category',
        STORE_ID: "storeID",
        STORE_NAME: "storeName",
        STATION_ID: "stationID",
        STATION_NAME: "stationName",
        STATION_BOXABLE: "boxable",
        CUSTOMER_GROUP: "group",
        MANAGER: "manager",
        SCOPE_ID: "scopeID",
        RENT_FROM_STORE_ID: "rentFromStoreID",
        RETURN_TO_STORE_ID: "returnToStoreID",
        RELOAD_TO_STATION_ID: "reloadToStationID",
        AS_STORE_ID: "asStoreID",
        AS_STATION_ID: "asStationID"
    }),
    UserGroup: Object.freeze({
        GOODTOGO_MEMBER: "GoodToGo_member",
        KUANG_TIEN_STAFF: "Kuang_Tien_staff"
    }),
    RegisterMethod: Object.freeze({
        CUSTOMER_APP: "customer_app",
        CLECK_APP: "cleck_app",
        CLECK_APP_MANAGER: "cleck_app_manager",
        STATION_APP_MANAGER: "station_app_manager",
        PURCHASE: "purchase",
        LINE: "line",
        BY_ADMIN: "by_admin"
    }),
    PurchaseStatus: Object.freeze({
        FREE_USER: "free_user",
        PURCHASED_USER: "purchased_user"
    }),
    TradeAction: Object.freeze({
        BANNED: "banned",
        UNBANNED: "unbanned",
        PURCHASED: "purchased",
        FIX_POINT: "fix_point"
    }),
    RentalQualification: Object.freeze({
        BANNED: "banned",
        OUT_OF_QUOTA: "out_of_quota",
        PERMISSION_DENIED: "permission_denied",
        AVAILABLE: "available"
    }),
    DueDays: Object.freeze({ // Remember to add one
        free_user: 4,
        purchased_user: 8
    }),
    LastCallDays: Object.freeze({
        free_user: 2,
        purchased_user: 2
    }),
    DueStatus: Object.freeze({
        NOT_DUE: "not_due",
        ALMOST_OVERDUE: "almost_overdue",
        LAST_CALL: "last_call",
        OVERDUE: "overdue"
    }),
    HoldingQuantityLimitation: Object.freeze({
        FREE_USER: 6,
        PURCHASED_USER: -1
    }),
    AUTO_UNBANNED_TIME: 3
});