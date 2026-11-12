"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteSchema = void 0;
exports.listBookings = listBookings;
exports.getBookingDetail = getBookingDetail;
exports.createManualBooking = createManualBooking;
exports.updateBooking = updateBooking;
exports.confirmBooking = confirmBooking;
exports.cancelBooking = cancelBooking;
exports.checkInBooking = checkInBooking;
exports.checkOutBooking = checkOutBooking;
exports.markNoShow = markNoShow;
exports.extendStay = extendStay;
exports.changeRoom = changeRoom;
exports.staysUntil = staysUntil;
const date_fns_1 = require("date-fns");
const apiResponse_1 = require("../lib/apiResponse");
const audit_1 = require("../lib/audit");
const references_1 = require("../lib/references");
const availabilityService_1 = require("./availabilityService");
const pricingService_1 = require("./pricingService");
Object.defineProperty(exports, "quoteSchema", { enumerable: true, get: function () { return pricingService_1.quoteSchema; } });
const bookingInclude = {
    guest: true,
    package: { include: { unit: true } },
    unit: true,
    payments: { include: { events: true } },
    addOns: { include: { addOn: true } },
    priceLines: true,
};
async function listBookings(prisma, query) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const where = {
        ...(query.status ? { bookingStatus: query.status } : {}),
        ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
        ...(query.from || query.to ? { checkInDate: { ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}), ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {}) } } : {}),
        ...(query.search
            ? {
                OR: [
                    { reference: { contains: query.search } },
                    { guest: { OR: [{ firstName: { contains: query.search } }, { lastName: { contains: query.search } }, { email: { contains: query.search } }, { phone: { contains: query.search } }] } },
                ],
            }
            : {}),
    };
    const [items, total] = await Promise.all([
        prisma.booking.findMany({
            where,
            include: bookingInclude,
            orderBy: { [query.sort === "checkInDate" ? "checkInDate" : "createdAt"]: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.booking.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}
async function getBookingDetail(prisma, id) {
    const booking = await prisma.booking.findUnique({ where: { id }, include: { ...bookingInclude, property: true } });
    if (!booking)
        throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    const audit = await prisma.auditLog.findMany({ where: { entityType: "Booking", entityId: booking.reference }, include: { adminUser: true }, orderBy: { createdAt: "desc" }, take: 50 });
    return { ...booking, auditTrail: audit };
}
async function createManualBooking(prisma, actor, input, meta) {
    const quote = await (0, pricingService_1.calculateQuote)(prisma, input);
    const checkInDate = new Date(`${input.checkInDate}T00:00:00.000Z`);
    const checkOutDate = new Date(`${input.checkOutDate}T00:00:00.000Z`);
    const booking = await prisma.$transaction(async (tx) => {
        await (0, availabilityService_1.assertAvailable)(tx, quote.package.unitId, checkInDate, checkOutDate);
        let guest = await tx.guest.findFirst({ where: { email: input.guest.email.toLowerCase() } });
        if (guest) {
            guest = await tx.guest.update({ where: { id: guest.id }, data: { firstName: input.guest.firstName, lastName: input.guest.lastName, phone: input.guest.phone, country: input.guest.country, address: input.guest.address } });
        }
        else {
            guest = await tx.guest.create({ data: { ...input.guest, email: input.guest.email.toLowerCase() } });
        }
        const created = await tx.booking.create({
            data: {
                reference: (0, references_1.createBookingReference)("RMV", checkInDate),
                propertyId: quote.package.propertyId,
                unitId: quote.package.unitId,
                packageId: quote.package.id,
                guestId: guest.id,
                checkInDate,
                checkOutDate,
                nights: quote.nights,
                adults: input.adults,
                children: input.children,
                infants: input.infants,
                subtotal: quote.subtotal,
                addOnTotal: quote.addOnTotal,
                discountTotal: quote.discountTotal,
                taxTotal: quote.taxTotal,
                serviceChargeTotal: quote.serviceChargeTotal,
                grandTotal: quote.grandTotal,
                depositRequired: quote.depositRequired,
                balanceDue: quote.grandTotal,
                currency: quote.currency,
                bookingStatus: "PENDING_PAYMENT",
                paymentStatus: "UNPAID",
                paymentOption: input.paymentOption,
                source: (input.source ?? "ADMIN"),
                specialRequests: input.specialRequests,
                internalNotes: input.internalNotes,
                confirmedAt: null,
                priceLines: { create: quote.lines.map((line) => ({ type: line.type, description: line.description, serviceDate: line.serviceDate ? new Date(`${line.serviceDate}T00:00:00.000Z`) : undefined, quantity: line.quantity, unitAmount: line.unitAmount, totalAmount: line.totalAmount, metadata: line.metadata })) },
            },
            include: bookingInclude,
        });
        return created;
    }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 10000 });
    await (0, audit_1.writeAudit)(prisma, actor, "BOOKING_CREATED_MANUAL", "Booking", booking.reference, undefined, { reference: booking.reference, guest: input.guest.email, grandTotal: quote.grandTotal }, meta);
    return booking;
}
const editableFields = ["specialRequests", "internalNotes"];
async function updateBooking(prisma, actor, id, patch, meta) {
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing)
        throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    if (["CANCELLED", "EXPIRED", "COMPLETED"].includes(existing.bookingStatus))
        throw new apiResponse_1.ApiError(409, "BOOKING_LOCKED", "This booking cannot be edited in its current state.");
    const data = {};
    for (const key of editableFields)
        if (patch[key] !== undefined)
            data[key] = patch[key];
    const updated = await prisma.booking.update({ where: { id }, data, include: bookingInclude });
    await (0, audit_1.writeAudit)(prisma, actor, "BOOKING_UPDATED", "Booking", updated.reference, { specialRequests: existing.specialRequests, internalNotes: existing.internalNotes }, { specialRequests: updated.specialRequests, internalNotes: updated.internalNotes }, meta);
    return updated;
}
async function confirmBooking(prisma, actor, id, meta) {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking)
        throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    if (["CONFIRMED", "COMPLETED"].includes(booking.bookingStatus))
        throw new apiResponse_1.ApiError(409, "INVALID_TRANSITION", "Booking is already confirmed.");
    if (["CANCELLED", "EXPIRED"].includes(booking.bookingStatus))
        throw new apiResponse_1.ApiError(409, "INVALID_TRANSITION", "Cancelled bookings cannot be confirmed.");
    const updated = await prisma.booking.update({ where: { id }, data: { bookingStatus: "CONFIRMED", confirmedAt: new Date() }, include: bookingInclude });
    await (0, audit_1.writeAudit)(prisma, actor, "BOOKING_CONFIRMED", "Booking", updated.reference, { bookingStatus: booking.bookingStatus }, { bookingStatus: "CONFIRMED" }, meta);
    return updated;
}
async function cancelBooking(prisma, actor, id, reason, meta) {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking)
        throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    if (["CANCELLED", "COMPLETED"].includes(booking.bookingStatus))
        throw new apiResponse_1.ApiError(409, "INVALID_TRANSITION", `Booking is already ${booking.bookingStatus}.`);
    const updated = await prisma.booking.update({ where: { id }, data: { bookingStatus: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason ?? null }, include: bookingInclude });
    await (0, audit_1.writeAudit)(prisma, actor, "BOOKING_CANCELLED", "Booking", updated.reference, { bookingStatus: booking.bookingStatus }, { bookingStatus: "CANCELLED", reason }, meta);
    return updated;
}
async function checkInBooking(prisma, actor, id, meta) {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking)
        throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    if (booking.actualCheckInAt)
        throw new apiResponse_1.ApiError(409, "ALREADY_CHECKED_IN", "Guest is already checked in.");
    if (!["CONFIRMED", "PENDING_PAYMENT", "PAYMENT_PROCESSING"].includes(booking.bookingStatus))
        throw new apiResponse_1.ApiError(409, "INVALID_TRANSITION", `Cannot check in a ${booking.bookingStatus} booking.`);
    const updated = await prisma.booking.update({ where: { id }, data: { actualCheckInAt: new Date(), bookingStatus: "CONFIRMED" }, include: bookingInclude });
    await (0, audit_1.writeAudit)(prisma, actor, "GUEST_CHECKED_IN", "Booking", updated.reference, { actualCheckInAt: booking.actualCheckInAt }, { actualCheckInAt: updated.actualCheckInAt }, meta);
    return updated;
}
async function checkOutBooking(prisma, actor, id, meta) {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking)
        throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    if (booking.actualCheckOutAt)
        throw new apiResponse_1.ApiError(409, "ALREADY_CHECKED_OUT", "Guest is already checked out.");
    if (!booking.actualCheckInAt)
        throw new apiResponse_1.ApiError(409, "NOT_CHECKED_IN", "Guest has not checked in yet.");
    const updated = await prisma.booking.update({ where: { id }, data: { actualCheckOutAt: new Date(), bookingStatus: "COMPLETED" }, include: bookingInclude });
    await (0, audit_1.writeAudit)(prisma, actor, "GUEST_CHECKED_OUT", "Booking", updated.reference, { actualCheckOutAt: booking.actualCheckOutAt }, { actualCheckOutAt: updated.actualCheckOutAt }, meta);
    return updated;
}
async function markNoShow(prisma, actor, id, meta) {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking)
        throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.bookingStatus))
        throw new apiResponse_1.ApiError(409, "INVALID_TRANSITION", `Cannot mark a ${booking.bookingStatus} booking as no-show.`);
    const updated = await prisma.booking.update({ where: { id }, data: { bookingStatus: "NO_SHOW", noShowMarkedAt: new Date() }, include: bookingInclude });
    await (0, audit_1.writeAudit)(prisma, actor, "BOOKING_NO_SHOW", "Booking", updated.reference, { bookingStatus: booking.bookingStatus }, { bookingStatus: "NO_SHOW" }, meta);
    return updated;
}
async function extendStay(prisma, actor, id, newCheckOutDate, meta) {
    const booking = await prisma.booking.findUnique({ where: { id }, include: { package: true } });
    if (!booking)
        throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    if (!booking.actualCheckInAt)
        throw new apiResponse_1.ApiError(409, "NOT_CHECKED_IN", "Guest must be checked in before extending.");
    const newCheckOut = new Date(`${newCheckOutDate}T00:00:00.000Z`);
    if (newCheckOut <= booking.checkOutDate)
        throw new apiResponse_1.ApiError(400, "INVALID_DATES", "New check-out must be after the current check-out.");
    const nights = Math.round((newCheckOut.getTime() - booking.checkOutDate.getTime()) / 86_400_000);
    const extended = await prisma.booking.update({ where: { id }, data: { checkOutDate: newCheckOut, nights: booking.nights + nights }, include: bookingInclude });
    await (0, audit_1.writeAudit)(prisma, actor, "BOOKING_EXTENDED", "Booking", extended.reference, { checkOutDate: booking.checkOutDate, nights: booking.nights }, { checkOutDate: extended.checkOutDate, nights: extended.nights }, meta);
    return extended;
}
async function changeRoom(prisma, actor, id, unitId, meta) {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking)
        throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit || !unit.active)
        throw new apiResponse_1.ApiError(404, "UNIT_NOT_FOUND", "Unit not found.");
    await (0, availabilityService_1.assertAvailable)(prisma, unitId, booking.checkInDate, booking.checkOutDate);
    const updated = await prisma.booking.update({ where: { id }, data: { unitId }, include: bookingInclude });
    await (0, audit_1.writeAudit)(prisma, actor, "BOOKING_ROOM_CHANGED", "Booking", updated.reference, { unitId: booking.unitId }, { unitId }, meta);
    return updated;
}
function staysUntil(checkIn, nights) {
    return (0, date_fns_1.addDays)(checkIn, nights);
}
