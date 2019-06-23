module.exports = {
    UserRole: Object.freeze({
        CLERK: "clerk",
        ADMIN: "admin",
        CUSTOMER: "customer",
        BOT: "bot"
    }),
    UserGroup: Object.freeze({
        GOODTOGO_MEMBER: "GoodToGo_member",
        KUANG_TIEN_STAFF: "Kuang_Tien_staff"
    }),
    RegisterMethod: Object.freeze({
        CUSTOMER_APP: "customer_app",
        CLECK_APP: "cleck_app",
        CLECK_APP_MANAGER: "cleck_app_manager",
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
        PURCHASED: "purchased"
    }),
    RentalQualification: Object.freeze({
        BANNED: "banned",
        OUT_OF_QUOTA: "out_of_quota",
        AVAILABLE: "available"
    }),
    DueDays: Object.freeze({
        free_user: 1,
        purchased_user: 7
    }),
    HoldingQuantityLimitation: Object.freeze({
        FREE_USER: 6,
        PURCHASED_USER: -1
    })
};