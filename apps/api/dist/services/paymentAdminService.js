"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPayments = listPayments;
exports.getPaymentDetail = getPaymentDetail;
exports.verifyPayment = verifyPayment;
exports.recordManualPayment = recordManualPayment;
exports.refundPayment = refundPayment;
const decimal_js_1 = __importDefault(require("decimal.js"));
const apiResponse_1 = require("../lib/apiResponse");
async function listPayments(prisma, query) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.provider ? { provider: query.provider } : {}),
        ...(query.search ? { booking: { reference: { contains: query.search } } } : {}),
    };
    const [items, total] = await Promise.all([
        prisma.payment.findMany({ where, include: { booking: { include: { guest: true } }, events: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.payment.count({ where }),
    ]);
    return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) };
}
async function getPaymentDetail(prisma, id) {
    const payment = await prisma.payment.findUnique({ where: { id }, include: { booking: { include: { guest: true, package: true } }, events: true } });
    if (!payment)
        throw new apiResponse_1.ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
    return payment;
}
async function verifyPayment(prisma, actor, id, meta) {
    const payment = await prisma.payment.findUnique({ where: { id }, include: { booking: true } });
    if (!payment)
        throw new apiResponse_1.ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
    if (payment.provider !== "BANK_TRANSFER" && payment.provider !== "CASH")
        throw new apiResponse_1.ApiError(409, "PROVIDER_VERIFY_FORBIDDEN", "Only bank-transfer and cash payments can be manually verified.");
    if (payment.verified)
        throw new apiResponse_1.ApiError(409, "ALREADY_VERIFIED", "This payment is already verified.");
    const updated = await prisma.$transaction(async (tx) => {
        const pay = await tx.payment.update({ where: { id }, data: { verified: true, status: "PAID", processedAt: new Date() }, include: { booking: true } });
        const paid = new decimal_js_1.default(pay.booking.amountPaid.toString()).plus(pay.amount.toString());
        const amountPaid = paid.toFixed(2);
        const balanceDue = new decimal_js_1.default(pay.booking.grandTotal.toString()).minus(amountPaid);
        const paymentStatus = balanceDue.lte(0) ? "PAID" : "PARTIALLY_PAID";
        const booking = await tx.booking.update({
            where: { id: pay.bookingId },
            data: { amountPaid, balanceDue: balanceDue.toFixed(2), paymentStatus, bookingStatus: "CONFIRMED", confirmedAt: pay.booking.confirmedAt ?? new Date() },
        });
        await tx.auditLog.create({ data: { adminUserId: actor.id, action: "PAYMENT_VERIFIED", entityType: "Payment", entityId: pay.id, oldValues: { verified: false }, newValues: { verified: true, amount: pay.amount }, ipAddress: meta?.ipAddress, userAgent: meta?.userAgent } });
        return { pay, booking };
    });
    return updated;
}
async function recordManualPayment(prisma, actor, input, meta) {
    const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking)
        throw new apiResponse_1.ApiError(404, "BOOKING_NOT_FOUND", "Booking not found.");
    const amount = new decimal_js_1.default(input.amount.toString());
    if (amount.lte(0))
        throw new apiResponse_1.ApiError(400, "INVALID_AMOUNT", "Amount must be greater than zero.");
    const provider = input.provider ?? "CASH";
    const payment = await prisma.$transaction(async (tx) => {
        const pay = await tx.payment.create({
            data: {
                bookingId: booking.id,
                provider,
                idempotencyKey: `${booking.reference}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                amount: amount.toFixed(2),
                currency: booking.currency,
                status: "PAID",
                paymentMethod: input.paymentMethod ?? (provider === "CASH" ? "Cash" : "Bank transfer"),
                verified: true,
                processedAt: new Date(),
            },
        });
        const paid = new decimal_js_1.default(booking.amountPaid.toString()).plus(amount);
        const amountPaid = paid.toFixed(2);
        const balanceDue = new decimal_js_1.default(booking.grandTotal.toString()).minus(amountPaid);
        const paymentStatus = balanceDue.lte(0) ? "PAID" : "PARTIALLY_PAID";
        const updatedBooking = await tx.booking.update({
            where: { id: booking.id },
            data: { amountPaid, balanceDue: balanceDue.toFixed(2), paymentStatus, bookingStatus: booking.bookingStatus === "HOLD" ? "CONFIRMED" : booking.bookingStatus, confirmedAt: booking.confirmedAt ?? (booking.bookingStatus === "HOLD" ? new Date() : undefined) },
        });
        await tx.auditLog.create({ data: { adminUserId: actor.id, action: "PAYMENT_RECORDED", entityType: "Payment", entityId: pay.id, newValues: { provider, amount: pay.amount, note: input.note ?? null }, ipAddress: meta?.ipAddress, userAgent: meta?.userAgent } });
        return { payment: pay, booking: updatedBooking };
    });
    return payment;
}
async function refundPayment(prisma, actor, id, input, meta) {
    const payment = await prisma.payment.findUnique({ where: { id }, include: { booking: true } });
    if (!payment)
        throw new apiResponse_1.ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
    if (!payment.verified || payment.status === "REFUNDED")
        throw new apiResponse_1.ApiError(409, "NOT_REFUNDABLE", "This payment cannot be refunded.");
    const refundAmount = input.amount ? new decimal_js_1.default(input.amount.toString()) : new decimal_js_1.default(payment.amount.toString());
    if (refundAmount.lte(0) || refundAmount.gt(payment.amount.toString()))
        throw new apiResponse_1.ApiError(400, "INVALID_AMOUNT", "Refund amount exceeds the payment.");
    const updated = await prisma.$transaction(async (tx) => {
        const pay = await tx.payment.update({ where: { id }, data: { status: refundAmount.equals(payment.amount.toString()) ? "REFUNDED" : "PARTIALLY_REFUNDED", failureReason: input.reason ?? null }, include: { booking: true } });
        const paid = new decimal_js_1.default(pay.booking.amountPaid.toString()).minus(refundAmount);
        const amountPaid = paid.lte(0) ? "0" : paid.toFixed(2);
        const balanceDue = new decimal_js_1.default(pay.booking.grandTotal.toString()).minus(amountPaid);
        const booking = await tx.booking.update({ where: { id: pay.bookingId }, data: { amountPaid, balanceDue: balanceDue.toFixed(2), paymentStatus: refundAmount.equals(payment.amount.toString()) ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
        await tx.auditLog.create({ data: { adminUserId: actor.id, action: "PAYMENT_REFUNDED", entityType: "Payment", entityId: pay.id, oldValues: { status: payment.status }, newValues: { status: pay.status, amount: refundAmount.toFixed(2), reason: input.reason ?? null }, ipAddress: meta?.ipAddress, userAgent: meta?.userAgent } });
        return { payment: pay, booking };
    });
    return updated;
}
