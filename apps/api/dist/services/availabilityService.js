"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expireHolds = expireHolds;
exports.getReservedCount = getReservedCount;
exports.assertAvailable = assertAvailable;
const apiResponse_1 = require("../lib/apiResponse");
const blockingStatuses = ["HOLD", "PENDING_PAYMENT", "PAYMENT_PROCESSING", "CONFIRMED"];
async function expireHolds(prisma, now = new Date()) {
    return prisma.booking.updateMany({
        where: { bookingStatus: { in: ["HOLD", "PENDING_PAYMENT"] }, expiresAt: { lt: now }, paymentStatus: { in: ["UNPAID", "FAILED"] } },
        data: { bookingStatus: "EXPIRED" },
    });
}
async function getReservedCount(prisma, unitId, checkInDate, checkOutDate) {
    await expireHolds(prisma);
    return prisma.booking.count({
        where: { unitId, bookingStatus: { in: blockingStatuses }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], checkInDate: { lt: checkOutDate }, checkOutDate: { gt: checkInDate } },
    });
}
async function assertAvailable(prisma, unitId, checkInDate, checkOutDate) {
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit || !unit.active)
        throw new apiResponse_1.ApiError(404, "UNIT_NOT_FOUND", "The villa unit is not available.");
    const [reserved, blocks] = await Promise.all([
        getReservedCount(prisma, unitId, checkInDate, checkOutDate),
        prisma.availabilityBlock.count({ where: { unitId, startDate: { lt: checkOutDate }, endDate: { gt: checkInDate } } }),
    ]);
    if (blocks > 0)
        throw new apiResponse_1.ApiError(409, "DATES_UNAVAILABLE", "These dates are blocked for maintenance or an owner hold. Please choose different dates.");
    if (reserved >= unit.inventoryCount)
        throw new apiResponse_1.ApiError(409, "DATES_UNAVAILABLE", "These dates are already booked. Please choose different dates.");
    return { available: true, remaining: unit.inventoryCount - reserved };
}
