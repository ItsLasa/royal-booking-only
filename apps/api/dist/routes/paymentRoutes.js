"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const apiResponse_1 = require("../lib/apiResponse");
const payhere_1 = require("../payment-providers/payhere");
exports.paymentRoutes = (0, express_1.Router)();
const provider = new payhere_1.PayHerePaymentProvider();
exports.paymentRoutes.post("/payments/payhere/create", async (req, res, next) => { try {
    const booking = await prisma_1.prisma.booking.findUniqueOrThrow({ where: { reference: req.body.reference }, include: { guest: true, payments: true } });
    const payment = booking.payments[0];
    const checkout = await provider.createCheckout({ bookingReference: booking.reference, paymentId: payment.id, amount: Number(payment.amount), currency: payment.currency, guest: booking.guest });
    await prisma_1.prisma.payment.update({ where: { id: payment.id }, data: { providerOrderId: booking.reference } });
    res.json((0, apiResponse_1.ok)(checkout));
}
catch (e) {
    next(e);
} });
exports.paymentRoutes.post("/payments/payhere/notify", (0, express_1.urlencoded)({ extended: false }), async (req, res, next) => { try {
    const result = await (0, payhere_1.processPayHereNotification)(prisma_1.prisma, provider, req.body);
    res.json((0, apiResponse_1.ok)({ processed: true, duplicate: result.duplicate }));
}
catch (e) {
    next(e);
} });
exports.paymentRoutes.post("/payments/bank-transfer", async (req, res, next) => { try {
    const booking = await prisma_1.prisma.booking.update({ where: { reference: req.body.reference }, data: { bookingStatus: "PENDING_PAYMENT", paymentStatus: "UNPAID", internalNotes: req.body.bankReference ? `Bank reference submitted: ${req.body.bankReference}` : undefined } });
    await prisma_1.prisma.auditLog.create({ data: { action: "BANK_TRANSFER_REFERENCE_SUBMITTED", entityType: "Booking", entityId: booking.reference, newValues: { bankReference: req.body.bankReference ?? null } } });
    res.json((0, apiResponse_1.ok)({ reference: booking.reference, status: booking.bookingStatus }));
}
catch (e) {
    next(e);
} });
