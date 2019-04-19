module.exports = {
    CouponTypeState: Object.freeze({
        SOLD_OUT: "sold_out",
        PURCHASEABLE: "purchasable",
        CANNOT_AFFORD: "cannot_afford"
    }),
    CouponState: Object.freeze({
        USED: "used",
        AVAILABLE: "available",
        EXPIRED: "expired",
        UNKNOWN: "unknown"
    })
};